#!/usr/bin/env node
import Bugsnag from "./common/bugsnag.js";
import { clientRegistry } from "./common/client-registry.js";
import "./common/register-clients.js"; // Register all available clients
import { runHttpMode } from "./common/transport-http.js";
import { runStdioMode } from "./common/transport-stdio.js";

// This is used to report errors in the MCP server itself
// If you want to use your own BugSnag API key, set the MCP_SERVER_BUGSNAG_API_KEY environment variable
const McpServerBugsnagAPIKey = process.env.MCP_SERVER_BUGSNAG_API_KEY;
if (McpServerBugsnagAPIKey) {
  Bugsnag.start(McpServerBugsnagAPIKey);
}

async function main() {
  // Configure which clients are enabled based on MCP_ENABLED_CLIENTS env var
  // If not set or empty, all clients are enabled
  // If set, should be comma-separated list of client names
  clientRegistry.configureEnabledClients();

  // Determine transport mode from environment variable
  // MCP_TRANSPORT can be "stdio" (default) or "http"
  const transportMode = process.env.MCP_TRANSPORT?.toLowerCase() || "stdio";

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
