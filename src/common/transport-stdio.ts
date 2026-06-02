import { enableCompileCache } from "node:module";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { clientRegistry } from "./client-registry";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./info";
import { SmartBearMcpServer } from "./server";
import { registerShutdownHandler } from "./shutdown";
import type { GetEnvFn } from "./types";
import { getTypeDescription } from "./zod-utils";

/**
 * Generate a dynamic listing all available clients and the available environment variables
 */
function getConfigMessage(): string[] {
  const messages: string[] = [];
  for (const client of clientRegistry.getAll()) {
    messages.push(` - ${client.name}:`);
    for (const [configKey, requirement] of [
      ...Object.entries(client.authenticationFields.shape),
      ...Object.entries(client.config.shape),
    ]) {
      messages.push(
        `    - ${getEnvVarName(configKey, client.configPrefix)}: ${getTypeDescription(requirement)}`,
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
  } else if (process.argv.includes("--help")) {
    console.log(
      "The following environment variables can be set to configure each of the SmartBear clients:",
    );
    console.log(getConfigMessage().join("\n"));
    process.exit(0);
  }

  enableCompileCache();
  const configFn: GetEnvFn = (key, client) => {
    const envVarName = getEnvVarName(key, client?.configPrefix);
    return process.env[envVarName];
  };

  const server = new SmartBearMcpServer(configFn, process.env.MCP_TOOLSETS);

  // Setup clients from environment variables
  const addedCount = await clientRegistry.registerAll(
    server,
    configFn,
    true,
    true,
  );
  if (addedCount === 0) {
    const message = getConfigMessage();
    console.warn(
      `No clients configured. Please provide valid environment variables for at least one client:\n${message.join("\n")}`,
    );
    // Add clients without configuration/authorization to allow listing available tools
    await clientRegistry.registerAll(server, configFn, false, false);
  }

  const transport = new StdioServerTransport();

  // Graceful shutdown: close the transport on SIGTERM/SIGINT.
  //
  // Stdio normally exits cleanly when the parent closes stdin. This handler
  // is only meaningful when the process receives a signal directly (e.g.
  // the parent kills us hard). It calls transport.close() so the SDK stops
  // reading stdin promptly.
  //
  // Note: there is no per-session `cleanupSession` call here because the
  // stdio transport has no sessionId — there is exactly one connection per
  // process lifetime — and tools running over stdio never receive an
  // mcpSessionId in their `extra` argument, so per-client session maps are
  // never populated under stdio. Resources held by clients (e.g. Reflect
  // WebSockets) are released when the process exits. Adding a process-wide
  // teardown hook for stdio would require extending the Client interface
  // with a `cleanupAll()`; tracked as a separate enhancement.
  registerShutdownHandler("stdio-transport", async () => {
    try {
      await transport.close();
    } catch (err) {
      console.error("[MCP][shutdown] Error closing stdio transport:", err);
    }
  });

  transport.onmessage = (message) => {
    if ("method" in message && message.method === "initialize") {
      if (message.params?.protocolVersion === "2025-11-25") {
        const clientCapabilities = message.params?.capabilities as Record<
          string,
          unknown
        >;

        if (Object.hasOwn(clientCapabilities, "sampling")) {
          server.setSamplingSupported(true);
        }

        if (Object.hasOwn(clientCapabilities, "elicitation")) {
          server.setElicitationSupported(true);
        }
      }

      // Other protocolVersion handling can be added below
      // to maintain backwards compatibility.
    }
  };
  await server.connect(transport);
}

export function getEnvVarName(key: string, clientPrefix?: string): string {
  const prefix =
    `${clientPrefix ? `${clientPrefix}-${key}` : key}`.toUpperCase();
  return prefix.replace(/[\s\-_]/g, "_");
}
