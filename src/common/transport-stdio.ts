import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { setupClientsFromEnv } from "./client-factory.js";
import { clientRegistry } from "./client-registry.js";
import { SmartBearMcpServer } from "./server.js";

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

  const varList = requiredVars.map((v) => `  - ${v}`).join("\n");
  return `[MCP] No product authentication found. Please set at least one required environment variable:\n${varList}`;
}

/**
 * Run server in STDIO mode (default)
 */
export async function runStdioMode() {
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
