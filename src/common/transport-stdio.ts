import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { clientRegistry } from "./client-registry.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./info.js";
import { SmartBearMcpServer } from "./server.js";
import type { Client } from "./types.js";

/**
 * Generate a dynamic error message listing all available clients and their required env vars
 */
function getNoConfigMessage(): string[] {
  const messages: string[] = [];
  for (const entry of clientRegistry.getAll()) {
    messages.push(` - ${entry.name}:`);
    for (const [configKey, requirement] of Object.entries(entry.config.shape)) {
      const envVarName = getEnvVarName(entry, configKey);
      const requiredTag = requirement.isOptional()
        ? " (optional)"
        : " (required)";
      messages.push(
        `    - ${envVarName}${requiredTag}: ${requirement.description}`,
      );
    }
  }
  return messages;
}

/**
 * Run server in STDIO mode (default)
 */
export async function runStdioMode() {
  if (process.argv.includes("--version")) {
    console.log(`${MCP_SERVER_NAME}: v${MCP_SERVER_VERSION}`);
    process.exit(0);
  }

  const server = new SmartBearMcpServer();

  // Setup clients from environment variables
  const configuredCount = await clientRegistry.configure(
    server,
    (client, key) => {
      const envVarName = getEnvVarName(client, key);
      return process.env[envVarName] || null;
    },
  );
  if (configuredCount === 0) {
    const message = getNoConfigMessage();
    console.warn(
      message.length > 0
        ? `No clients configured. Please provide valid environment variables for at least one client:\n${message.join("\n")}`
        : "No clients support environment variable configuration.",
    );
    // Add non-configured clients to server to allow listing available tools
    for (const entry of clientRegistry.getAll()) {
      await server.addClient(entry);
    }
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function getEnvVarName(client: Client, key: string): string {
  return `${client.configPrefix.toUpperCase().replace(/-/g, "_")}_${key.toUpperCase()}`;
}
