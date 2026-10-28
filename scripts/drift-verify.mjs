#!/usr/bin/env node
/**
 * Runs the Drift MCP plugin tests in drift/ against the built server.
 *
 * Starts the mock PactFlow API, launches `node dist/index.js` over stdio
 * pointed at it, and runs `drift verify`. Extra arguments (for example
 * --output-dir or --generate-result) are passed through to drift.
 *
 * Requires `npm run build` and the Drift CLI with the MCP plugin:
 *   npm install -g @pactflow/drift && drift component install mcp
 */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { startMock } from "../drift/mock-pactflow.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const { server, port } = await startMock();

// The server's settings point at the mock and are set for its process only
// (via `env`). Drift itself authenticates with PactFlow on every run, using
// the caller's PACT_BROKER_* (or a cached `drift auth login`), so those must
// not be overridden for the Drift process.
const serverUrl = `stdio:///env?${[
  `PACT_BROKER_BASE_URL=http://127.0.0.1:${port}`,
  "PACT_BROKER_TOKEN=drift",
  "node",
  `${root}dist/index.js`,
]
  .map((arg) => `arg=${encodeURIComponent(arg)}`)
  .join("&")}`;

// Strict plugin settings: fail (not warn) when the server's tools or
// descriptions no longer match the definition; regenerate it with
// `npm run drift:generate`. The MCP plugin reads these from the config file in
// the Drift home directory (--plugin-value never reaches the plugin: PACT-7530), so use a temporary home
// that points back at the installed plugins.
const pluginDir =
  process.env.DRIFT_PLUGIN_DIR ??
  path.join(
    process.env.DRIFT_HOME_DIR ?? path.join(homedir(), ".drift"),
    "plugins",
  );
const homeDir = mkdtempSync(path.join(tmpdir(), "drift-home-"));
writeFileSync(
  path.join(homeDir, "drift.config.toml"),
  `plugin_dir = ${JSON.stringify(pluginDir)}

[plugin_config.mcp]
fail-on-undeclared = true
fail-on-description-change = true
fail-on-undocumented-input = true
`,
);

const cleanup = () => {
  server.close();
  rmSync(homeDir, { recursive: true, force: true });
};

const drift = spawn(
  "drift",
  [
    "verify",
    "--server-url",
    serverUrl,
    "--test-files",
    "drift/pactflow.testcases.yaml",
    "--test-files",
    "drift/pactflow.tools.testcases.yaml",
    "--drift-home-dir",
    homeDir,
    ...process.argv.slice(2),
  ],
  { cwd: root, stdio: "inherit" },
);

drift.on("error", (error) => {
  console.error(
    error.code === "ENOENT"
      ? "The drift CLI was not found. Install it with: npm install -g @pactflow/drift && drift component install mcp"
      : error.message,
  );
  cleanup();
  process.exit(1);
});
drift.on("exit", (code) => {
  cleanup();
  process.exit(code ?? 1);
});
