#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Bugsnag from "./common/bugsnag.js";
import { setupClientsFromEnv } from "./common/client-factory.js";
import { clientRegistry } from "./common/client-registry.js";
import "./common/register-clients.js"; // Register all available clients
import { SmartBearMcpServer } from "./common/server.js";

/**
 * Generate a dynamic error message listing all available clients and their required env vars
 */
function getNoAuthErrorMessage(): string {
  const entries = clientRegistry.getAll();
  const requiredVars: string[] = [];

  for (const entry of entries) {
    if ("getAuthConfig" in entry.clientClass) {
      const config = (entry.clientClass as any).getAuthConfig();
      const required = config.requirements.filter((r: any) => r.required);
      requiredVars.push(...required.map((r: any) => r.key));
    }
  }

  if (requiredVars.length === 0) {
    return "[MCP] No product authentication found. Please configure at least one product client.";
  }

  return `[MCP] No product authentication found. Please set at least one required environment variable:\n${requiredVars.map((v) => `  - ${v}`).join("\n")}`;
}

// This is used to report errors in the MCP server itself
// If you want to use your own BugSnag API key, set the MCP_SERVER_BUGSNAG_API_KEY environment variable
const McpServerBugsnagAPIKey = process.env.MCP_SERVER_BUGSNAG_API_KEY;
if (McpServerBugsnagAPIKey) {
  Bugsnag.start(McpServerBugsnagAPIKey);
}

async function main() {
  const server = new SmartBearMcpServer();

  // Setup clients from environment variables
  const clientsSetup = await setupClientsFromEnv(server, server.server);

  if (!clientsSetup) {
    console.error(getNoAuthErrorMessage());
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error: unknown) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
