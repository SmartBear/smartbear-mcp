#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";

const buildDir = "build/mcpb";

// Setup build directory
if (fs.existsSync(buildDir)) {
  fs.rmSync(buildDir, { recursive: true, force: true });
}
fs.mkdirSync(buildDir, { recursive: true });

// Copy files for bundling
fs.copyFileSync("assets/icon.png", `${buildDir}/icon.png`);
fs.copyFileSync("package.json", `${buildDir}/package.json`);
fs.copyFileSync("README.md", `${buildDir}/README.md`);
fs.copyFileSync("LICENSE.txt", `${buildDir}/LICENSE.txt`);

// Copy manifest file with updated version from package.json
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const manifest = JSON.parse(fs.readFileSync("packaging/manifest.json", "utf8"));
manifest.version = packageJson.version;
fs.writeFileSync(
  `${buildDir}/manifest.json`,
  JSON.stringify(manifest, null, 2),
);

const outputFile = `smartbear-mcp-${packageJson.version}.mcpb`;

// Copy the build output
fs.cpSync("dist", `${buildDir}/server`, { recursive: true });
fs.cpSync("node_modules", `${buildDir}/node_modules`, { recursive: true });

// Pack and strip the MCPB
execSync(`npx -y @anthropic-ai/mcpb pack ${buildDir} ${outputFile}`, {
  stdio: "inherit",
});
execSync(`npx -y @anthropic-ai/mcpb clean ${outputFile}`, {
  stdio: "inherit",
});
