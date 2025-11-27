#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT_DIR = path.resolve(__dirname, "..");
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, "package.json");
const CHANGELOG_PATH = path.join(ROOT_DIR, "CHANGELOG.md");
const DEPLOYMENT_PATH = path.join(ROOT_DIR, "deploy", "deployment.yaml");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const askQuestion = (query) => {
  return new Promise((resolve) => rl.question(query, resolve));
};

const runCommand = (command) => {
  try {
    execSync(command, { stdio: "inherit", cwd: ROOT_DIR });
  } catch (error) {
    console.error(`Error running command: ${command}, error: ${error}`);
    process.exit(1);
  }
};

const getCurrentVersion = () => {
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf-8"));
  return packageJson.version;
};

const getNextVersionSuggestion = (currentVersion, changelogContent) => {
  const unreleasedSection = changelogContent
    .split("## Unreleased")[1]
    .split("## [")[0];

  let type = "patch";
  if (
    unreleasedSection.includes("### Added") ||
    unreleasedSection.includes("### Changed")
  ) {
    type = "minor";
  }
  // Major version changes are usually manual decisions, defaulting to minor/patch logic here.

  const [major, minor, patch] = currentVersion.split(".").map(Number);

  if (type === "minor") {
    return `${major}.${minor + 1}.0`;
  }
  return `${major}.${minor}.${patch + 1}`;
};

const updateChangelog = (newVersion) => {
  let content = fs.readFileSync(CHANGELOG_PATH, "utf-8");
  const date = new Date().toISOString().split("T")[0];

  // Replace "## Unreleased" with "## Unreleased\n\n## [Version] - Date"
  // But we need to be careful not to duplicate the Unreleased header if we just prepend.
  // The goal is to keep the *content* of Unreleased under the new version.

  const header = `## Unreleased\n\n## [${newVersion}] - ${date}`;
  content = content.replace("## Unreleased", header);

  fs.writeFileSync(CHANGELOG_PATH, content);
  console.log(`Updated CHANGELOG.md`);
};

const updateDeployment = (newVersion) => {
  let content = fs.readFileSync(DEPLOYMENT_PATH, "utf-8");
  // Regex to match image: ghcr.io/smartbear/smartbear-mcp:vX.Y.Z
  const regex = /(image: ghcr\.io\/smartbear\/smartbear-mcp:v)(\d+\.\d+\.\d+)/;

  if (regex.test(content)) {
    content = content.replace(regex, `$1${newVersion}`);
    fs.writeFileSync(DEPLOYMENT_PATH, content);
    console.log(`Updated deploy/deployment.yaml`);
  } else {
    console.warn(
      "Warning: Could not find image tag in deployment.yaml to update.",
    );
  }
};

const main = async () => {
  console.log("🚀 Starting Release Process...");

  // 1. Check for clean git status
  try {
    const status = execSync("git status --porcelain", {
      cwd: ROOT_DIR,
    }).toString();
    if (status.trim() !== "") {
      console.error(
        "❌ Git working directory is not clean. Please commit or stash changes first.",
      );
      process.exit(1);
    }
  } catch (e) {
    console.error("❌ Failed to check git status.", e);
  }

  const currentVersion = getCurrentVersion();
  const changelogContent = fs.readFileSync(CHANGELOG_PATH, "utf-8");
  const suggestedVersion = getNextVersionSuggestion(
    currentVersion,
    changelogContent,
  );

  console.log(`Current Version: ${currentVersion}`);
  const inputVersion = await askQuestion(
    `Enter new version (default: ${suggestedVersion}): `,
  );
  const newVersion = inputVersion.trim() || suggestedVersion;

  if (!/^\d+\.\d+\.\d+$/.test(newVersion)) {
    console.error("❌ Invalid version format. Must be X.Y.Z");
    process.exit(1);
  }

  console.log(`\nPreparing release for v${newVersion}...`);

  // 2. Create Release Branch
  const branchName = `release/v${newVersion}`;
  console.log(`Creating branch ${branchName}...`);
  runCommand(`git checkout -b ${branchName}`);

  // 3. Update NPM Version (updates package.json and package-lock.json)
  console.log("Updating package version...");
  runCommand(`npm version ${newVersion} --no-git-tag-version`);

  // 4. Update Changelog
  updateChangelog(newVersion);

  // 5. Update Deployment Manifest
  updateDeployment(newVersion);

  // 6. Commit Changes
  console.log("Committing changes...");
  runCommand(
    "git add package.json package-lock.json CHANGELOG.md deploy/deployment.yaml",
  );
  runCommand(`git commit -m "release: v${newVersion}"`);

  console.log("\n✅ Release preparation complete!");
  console.log(`\nNext steps:`);
  console.log(`1. Review the changes: git show HEAD`);
  console.log(`2. Push the branch:    git push origin ${branchName}`);
  console.log(`3. Create a PR to main.`);

  rl.close();
};

main();
