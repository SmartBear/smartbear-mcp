import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { clientRegistry } from "./client-registry.js";
import type { SmartBearMcpServer } from "./server.js";

/**
 * Setup all product clients from environment variables
 * Dynamically initializes clients based on the client registry
 *
 * @param server The MCP server instance to add clients to
 * @param mcpServer The MCP Server instance (needed for some clients like PactFlow)
 * @returns true if at least one client was added, false otherwise
 */
export async function setupClientsFromEnv(
  server: SmartBearMcpServer,
  mcpServer: Server,
): Promise<boolean> {
  let clientDefined = false;

  // Iterate through all registered clients
  for (const entry of clientRegistry.getAll()) {
    try {
      // Create client from environment variables
      const client = entry.needsMcpServer
        ? entry.clientClass.fromEnv(mcpServer)
        : entry.clientClass.fromEnv();

      if (client) {
        // Perform async initialization if needed
        if (
          entry.asyncInit &&
          "initialize" in client &&
          typeof client.initialize === "function"
        ) {
          await (client as any).initialize();
        }

        // Add client to server
        server.addClient(client);
        clientDefined = true;
      }
    } catch (error) {
      console.error(`[MCP] Error initializing ${entry.name} client:`, error);
      // Continue with other clients
    }
  }

  return clientDefined;
}
