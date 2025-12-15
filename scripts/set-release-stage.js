#!/usr/bin/env node

/**
 * Sets the release stage in the built config.js to "production". This should be triggered
 * by the prepack script so that it's only set for published builds. It is used within
 * BugSnag initialization to enable it for production (i.e. published builds) only.
 */

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const configPath = join(__dirname, "..", "dist", "common", "config.js");

async function main() {
  const content = await readFile(configPath, "utf-8");
  const updatedContent = content.replace(
    'MCP_SERVER_RELEASE_STAGE = "development"',
    'MCP_SERVER_RELEASE_STAGE = "production"',
  );

  if (content !== updatedContent) {
    await writeFile(configPath, updatedContent, "utf-8");
    console.log("Release stage set to production");
  } else {
    console.error(
      "Unexpected config.js content - release stage not updated as expected",
    );
    process.exit(1);
  }
}

main();
