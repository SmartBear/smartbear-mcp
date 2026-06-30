import { enableCompileCache } from "node:module";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { setProcessClientIdentity, toClientIdentity } from "./client-identity";
import { clientRegistry } from "./client-registry";
import { USER_AGENT } from "./info";
import { SmartBearMcpServer } from "./server";
import { registerShutdownHandler } from "./shutdown";
import { getTypeDescription, isOptionalType } from "./zod-utils";

/**
 * Generate a dynamic error message listing all available clients and their required env vars
 */
function getNoConfigMessage(): string[] {
  const messages: string[] = [];
  for (const entry of clientRegistry.getAll()) {
    messages.push(` - ${entry.name}:`);
    for (const [configKey, requirement] of Object.entries(entry.config.shape)) {
      const envVarName = getEnvVarName(entry.configPrefix, configKey);
      const requiredTag = isOptionalType(requirement)
        ? " (optional)"
        : " (required)";
      messages.push(
        `    - ${envVarName}${requiredTag}: ${getTypeDescription(requirement)}`,
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
    console.log(`User-Agent: ${USER_AGENT}`);
    process.exit(0);
  } else if (process.argv.includes("--help")) {
    console.log(
      "The following environment variables can be set to configure each of the SmartBear clients:",
    );
    console.log(getNoConfigMessage().join("\n"));
    process.exit(0);
  }

  enableCompileCache();

  const server = new SmartBearMcpServer(process.env.MCP_TOOLSETS);

  // Setup clients from environment variables
  const configuredCount = await clientRegistry.configure(
    server,
    (client, key) => {
      const envVarName = getEnvVarName(client.configPrefix, key);
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
      // Capture the client identity for telemetry and downstream forwarding.
      // stdio has a single connection per process, so the identity is also
      // stored process-wide (no per-request AsyncLocalStorage context here).
      const identity = toClientIdentity(
        message.params?.clientInfo as
          | { name?: string; version?: string }
          | undefined,
        message.params?.protocolVersion as string | undefined,
      );
      server.setMcpClientIdentity(identity);
      setProcessClientIdentity(identity);

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

export function getEnvVarName(clientPrefix: string, key: string): string {
  return `${clientPrefix.toUpperCase().replace(/-/g, "_")}_${key.toUpperCase()}`;
}
