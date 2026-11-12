#!/usr/bin/env node

// Pins the Claude plugin to a published @smartbear/mcp version: the plugin
// version and plugin/package.json with a regenerated plugin/package-lock.json.
//
// The Anthropic plugin directory holds plugins that launch a package with npx,
// so Claude Code installs the server from plugin/package-lock.json into the
// plugin's node_modules, and plugin/.mcp.json runs plugin/server.mjs, which
// imports it. The
// version lives only in package.json and the lockfile. The lockfile
// records the registry tarball's integrity hash, so this can only run once the
// version is on npm: the publish workflow runs it after `npm publish` and opens
// a PR with the result.
//
// Usage:
//   node scripts/update-plugin.js [version]  pin and regenerate (defaults to
//                                            the root package.json version)
//   node scripts/update-plugin.js --check    verify the committed plugin files
//                                            agree with each other (CI, offline)

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const PLUGIN_DIR = path.join(ROOT_DIR, "plugin");
const PLUGIN_PACKAGE_JSON = path.join(PLUGIN_DIR, "package.json");
const PLUGIN_LOCK = path.join(PLUGIN_DIR, "package-lock.json");
const PLUGIN_MANIFEST = path.join(PLUGIN_DIR, ".claude-plugin/plugin.json");
const PLUGIN_MCP_JSON = path.join(PLUGIN_DIR, ".mcp.json");
const PACKAGE = "@smartbear/mcp";
const REGISTRY = "https://registry.npmjs.org/";
// Where .mcp.json starts the server: a launcher in the plugin that imports the
// copy Claude Code installs from the plugin lockfile. The directory holds an
// npx launch and refuses a .mcp.json that points into node_modules.
// biome-ignore lint/suspicious/noTemplateCurlyInString: Claude Code substitutes this placeholder, not JavaScript
const SERVER_ENTRY = "${CLAUDE_PLUGIN_ROOT}/server.mjs";
const PLUGIN_LAUNCHER = path.join(PLUGIN_DIR, "server.mjs");

const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf-8"));
const writeJson = (file, value) =>
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
// Under `npm run`, run npm's own CLI script with node so this also works on
// Windows, where `npm` is a .cmd shim that execFileSync can't start.
const npm = (args) => {
  const execPath = process.env.npm_execpath;
  const [command, commandArgs] = execPath?.endsWith(".js")
    ? [process.execPath, [execPath, ...args]]
    : ["npm", args];
  return execFileSync(command, commandArgs, {
    cwd: PLUGIN_DIR,
    encoding: "utf-8",
  }).trim();
};
const fail = (message) => {
  console.error(`❌ ${message}`);
  process.exit(1);
};

// Returns the problems that would make the directory scanner treat the server
// as unlocked, or make the lockfile describe a different server than .mcp.json
// runs. An empty list means the plugin files are consistent for `version`.
const findProblems = (version) => {
  const problems = [];
  const manifest = readJson(PLUGIN_MANIFEST);
  const pluginPackage = readJson(PLUGIN_PACKAGE_JSON);
  const lock = readJson(PLUGIN_LOCK);
  const mcpServers = readJson(PLUGIN_MCP_JSON).mcpServers ?? {};

  if (manifest.version !== version) {
    problems.push(`plugin.json version is ${manifest.version}`);
  }
  if (pluginPackage.version !== version) {
    problems.push(`plugin/package.json version is ${pluginPackage.version}`);
  }
  if (
    JSON.stringify(pluginPackage.dependencies) !==
    JSON.stringify({ [PACKAGE]: version })
  ) {
    problems.push(
      `plugin/package.json dependencies must be exactly {"${PACKAGE}": "${version}"}`,
    );
  }
  for (const [name, server] of Object.entries(mcpServers)) {
    if (
      server.command !== "node" ||
      JSON.stringify(server.args) !== JSON.stringify([SERVER_ENTRY])
    ) {
      problems.push(
        `.mcp.json server "${name}" must run "node" with args ["${SERVER_ENTRY}"]`,
      );
    }
  }
  const launcher = fs.existsSync(PLUGIN_LAUNCHER)
    ? fs.readFileSync(PLUGIN_LAUNCHER, "utf-8")
    : "";
  if (!launcher.includes(`import "${PACKAGE}/dist/index.js";`)) {
    problems.push(`plugin/server.mjs must import "${PACKAGE}/dist/index.js"`);
  }

  if (![2, 3].includes(lock.lockfileVersion)) {
    problems.push(
      `lockfileVersion is ${lock.lockfileVersion}, expected 2 or 3`,
    );
  }
  const root = lock.packages?.[""] ?? {};
  if (
    lock.name !== pluginPackage.name ||
    root.version !== pluginPackage.version ||
    JSON.stringify(root.dependencies) !==
      JSON.stringify(pluginPackage.dependencies)
  ) {
    problems.push(
      "package-lock.json is out of sync with plugin/package.json; run `npm run plugin:update`",
    );
  }
  const locked = lock.packages?.[`node_modules/${PACKAGE}`]?.version;
  if (locked !== version) {
    problems.push(`package-lock.json pins ${PACKAGE}@${locked}`);
  }
  // Every package must carry an exact version, a public registry URL and an
  // integrity hash.
  for (const [key, pkg] of Object.entries(lock.packages ?? {})) {
    if (
      key !== "" &&
      (!pkg.version || !pkg.integrity || !pkg.resolved?.startsWith(REGISTRY))
    ) {
      problems.push(`${key} lacks an exact version, ${REGISTRY} URL or hash`);
    }
  }

  // A package-manager config that sets a registry is a directory finding.
  for (const file of [".npmrc", "bunfig.toml"]) {
    if (fs.existsSync(path.join(PLUGIN_DIR, file))) {
      problems.push(`plugin/${file} must not be shipped`);
    }
  }
  return problems;
};

const report = (version, problems) => {
  if (problems.length > 0) {
    fail(`Plugin files are inconsistent:\n  ${problems.join("\n  ")}`);
  }
  const count = Object.keys(readJson(PLUGIN_LOCK).packages).length - 1;
  console.log(
    `✅ Plugin pinned to ${PACKAGE}@${version} (${count} locked packages)`,
  );
};

if (process.argv[2] === "--check") {
  const version = readJson(PLUGIN_MANIFEST).version;
  report(version, findProblems(version));
  process.exit(0);
}

const version =
  process.argv[2] || readJson(path.join(ROOT_DIR, "package.json")).version;
if (!/^\d+\.\d+\.\d+$/.test(version)) {
  fail(`Invalid version "${version}". Must be X.Y.Z`);
}

// The lockfile needs the published tarball's integrity hash.
let published = "";
try {
  published = npm([
    "view",
    `${PACKAGE}@${version}`,
    "version",
    `--registry=${REGISTRY}`,
  ]);
} catch {
  // handled below
}
if (published !== version) {
  fail(`${PACKAGE}@${version} is not on npm yet; publish it first.`);
}

const pluginPackage = readJson(PLUGIN_PACKAGE_JSON);
pluginPackage.version = version;
pluginPackage.dependencies = { [PACKAGE]: version };
writeJson(PLUGIN_PACKAGE_JSON, pluginPackage);

const manifest = readJson(PLUGIN_MANIFEST);
manifest.version = version;
writeJson(PLUGIN_MANIFEST, manifest);

// Regenerate from scratch so the whole tree resolves against the public
// registry, whatever registry the local npm config points at.
fs.rmSync(PLUGIN_LOCK, { force: true });
npm([
  "install",
  "--package-lock-only",
  "--ignore-scripts",
  "--no-audit",
  "--no-fund",
  `--registry=${REGISTRY}`,
]);

report(version, findProblems(version));
