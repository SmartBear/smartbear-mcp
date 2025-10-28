import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { clientRegistry } from "./client-registry.js";
import { SmartBearMcpServer } from "./server.js";
import type { Client } from "./types.js";

/**
 * Generate a dynamic error message listing all available clients and their required env vars
 */
function getNoConfigErrorMessage(): string[] {
  const messages: string[] = [];
  for (const entry of clientRegistry.getAll()) {
    for (const [configKey, requirement] of Object.entries(entry.config.shape)) {
      const envVarName = getEnvVarName(entry, configKey);
      const requiredTag = requirement.isOptional()
        ? " (optional)"
        : " (required)";
      messages.push(` - ${entry.name}:`);
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
    const errorMessage = getNoConfigErrorMessage();
    console.error(
      errorMessage.length > 0
        ? `No clients configured. Please provide valid environment variables for at least one client:\n${errorMessage.join("\n")}`
        : "No clients support environment variable configuration.",
    );
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

function getEnvVarName(client: Client, key: string): string {
  return `${client.configPrefix.toUpperCase().replace(/-/g, "_")}_${key.toUpperCase()}`;
}
