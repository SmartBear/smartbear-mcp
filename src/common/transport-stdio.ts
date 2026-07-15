// node:module / node:process are required for the compile cache and CLI
// argv access this stdio entrypoint depends on.
import { enableCompileCache } from "node:module";
import process from "node:process";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { clientRegistry } from "./client-registry.ts";
import { getEnv } from "./env.ts";
import { USER_AGENT } from "./info.ts";
import { handleInitializeMessage } from "./initialize.ts";
import { SmartBearMcpServer } from "./server.ts";
import { registerShutdownHandler } from "./shutdown.ts";
import { getTypeDescription, isOptionalType } from "./zod-utils.ts";

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
 * Handle `--version` / `--help` CLI flags, printing to stdout and exiting the
 * process when one is present. No-op otherwise.
 */
function handleCliFlags(): void {
  if (process.argv.includes("--version")) {
    // biome-ignore lint/suspicious/noConsole: CLI output, not debug logging
    console.log(`User-Agent: ${USER_AGENT}`);
    process.exit(0);
  } else if (process.argv.includes("--help")) {
    // biome-ignore lint/suspicious/noConsole: CLI output, not debug logging
    console.log(
      "The following environment variables can be set to configure each of the SmartBear clients:",
    );
    // biome-ignore lint/suspicious/noConsole: CLI output, not debug logging
    console.log(getNoConfigMessage().join("\n"));
    process.exit(0);
  }
}

/**
 * Configure all enabled clients from environment variables. If none end up
 * configured, warns with setup instructions and falls back to registering
 * every enabled (but unconfigured) client so its tools are still listable.
 */
async function configureClientsFromEnv(
  server: SmartBearMcpServer,
): Promise<void> {
  const configuredCount = await clientRegistry.configure(
    server,
    (client, key) => {
      const envVarName = getEnvVarName(client.configPrefix, key);
      return getEnv(envVarName) || null;
    },
  );
  if (configuredCount === 0) {
    const message = getNoConfigMessage();
    // biome-ignore lint/suspicious/noConsole: operator-facing configuration warning
    console.warn(
      message.length > 0
        ? `No clients configured. Please provide valid environment variables for at least one client:\n${message.join("\n")}`
        : "No clients support environment variable configuration.",
    );
    // Add non-configured clients to server to allow listing available tools.
    // Sequential (not Promise.all) so registration order stays deterministic.
    for (const entry of clientRegistry.getAll()) {
      // biome-ignore lint/performance/noAwaitInLoops: sequential registration order required
      await server.addClient(entry);
    }
  }
}

/**
 * Run server in STDIO mode (default)
 */
export async function runStdioMode() {
  handleCliFlags();

  enableCompileCache();

  const server = new SmartBearMcpServer(getEnv("MCP_TOOLSETS"));

  // Setup clients from environment variables
  await configureClientsFromEnv(server);

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
      // biome-ignore lint/security/noSecrets: log message text, not a secret
      // biome-ignore lint/suspicious/noConsole: operator-facing shutdown diagnostic
      console.error("[MCP][shutdown] Error closing stdio transport:", err);
    }
  });

  transport.onmessage = (message) => handleInitializeMessage(server, message);
  await server.connect(transport);
}

export function getEnvVarName(clientPrefix: string, key: string): string {
  return `${clientPrefix.toUpperCase().replace(/-/g, "_")}_${key.toUpperCase()}`;
}
