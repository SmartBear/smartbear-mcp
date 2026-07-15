#!/usr/bin/env node
import Bugsnag from "./common/bugsnag.ts";
import "./common/register-clients.ts"; // Register all available clients
import process from "node:process";
import { getEnv } from "./common/env.ts";
import { installSignalHandlers } from "./common/shutdown.ts";
import { runHttpMode } from "./common/transport-http.ts";
import { runStdioMode } from "./common/transport-stdio.ts";

// This is used to report errors in the MCP server itself
// If you want to use your own BugSnag API key, set the MCP_SERVER_BUGSNAG_API_KEY environment variable
const McpServerBugsnagApiKey = getEnv("MCP_SERVER_BUGSNAG_API_KEY");
if (McpServerBugsnagApiKey) {
  Bugsnag.start(McpServerBugsnagApiKey);
}

// Install SIGTERM / SIGINT handlers before any transport starts so that
// signals received during startup are captured and trigger an orderly drain.
installSignalHandlers();

async function main() {
  // Determine transport mode from environment variable
  // MCP_TRANSPORT can be "stdio" (default) or "http"
  const transportMode = getEnv("MCP_TRANSPORT")?.toLowerCase() || "stdio";

  if (transportMode === "http") {
    console.log("[MCP] Starting in HTTP mode...");
    await runHttpMode();
  } else if (transportMode === "stdio") {
    await runStdioMode();
  } else {
    console.error(
      `[MCP] Invalid transport mode: ${transportMode}. Use "stdio" or "http".`,
    );
    process.exit(1);
  }
}

try {
  await main();
} catch (error: unknown) {
  console.error("Fatal error in main():", error);
  process.exit(1);
}
