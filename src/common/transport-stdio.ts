import { enableCompileCache } from "node:module";
import type { JSONRPCMessage } from "@modelcontextprotocol/server";
import {
  StdioServerTransport,
  serveStdio,
} from "@modelcontextprotocol/server/stdio";
import { setProcessClientIdentity, toClientIdentity } from "./client-identity";
import { clientRegistry } from "./client-registry";
import { USER_AGENT } from "./info";
import { extractModernClientMeta, handleInitializeMessage } from "./initialize";
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
 * Build a server instance configured from environment variables.
 *
 * Used as the `serveStdio` factory: it is invoked once the opening exchange
 * has selected the protocol era, and the returned instance is pinned for the
 * lifetime of the connection.
 */
export async function buildStdioServer(): Promise<SmartBearMcpServer> {
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

  return server;
}

/**
 * Applies the `initialize` capture to the instance `serveStdio` builds, holding
 * messages that arrive before it exists.
 *
 * The opening `initialize` is what *triggers* the factory, and the factory is
 * async (it configures every product client), so the tap fires before there is
 * an instance to apply the capture to. Every message seen in that window is
 * buffered and replayed once the instance is ready — keeping only the most
 * recent would lose the `initialize` whenever a client pipelines it with a
 * follow-up message, silently dropping client attribution. The window closes as
 * soon as the factory resolves, so the buffer holds only the opening exchange.
 */
export function createInitializeCaptureTap(): {
  /** Feed one inbound message to the capture. */
  observe: (message: JSONRPCMessage) => void;
  /** Bind the built instance and replay anything buffered so far. */
  attachServer: (server: SmartBearMcpServer) => void;
} {
  let activeServer: SmartBearMcpServer | undefined;
  const pending: JSONRPCMessage[] = [];

  return {
    observe(message: JSONRPCMessage): void {
      // Modern era: no handshake, so identity arrives on every request in
      // `_meta` and needs no server instance to record. Stdio serves exactly
      // one client per process, so the process-wide slot — the same one the
      // legacy capture writes — is the right home for it, and nothing needs
      // buffering.
      const modernMeta = extractModernClientMeta(message);
      if (modernMeta) {
        setProcessClientIdentity(
          toClientIdentity(modernMeta.clientInfo, modernMeta.protocolVersion),
        );
        return;
      }
      if (activeServer) {
        handleInitializeMessage(activeServer, message);
        return;
      }
      pending.push(message);
    },
    attachServer(server: SmartBearMcpServer): void {
      activeServer = server;
      for (const message of pending) {
        handleInitializeMessage(server, message);
      }
      pending.length = 0;
    },
  };
}

/**
 * Run server in STDIO mode (default)
 *
 * Serving goes through `serveStdio`, which owns the era decision for the
 * connection: the opening exchange selects 2025-era or 2026-07-28 serving and
 * pins one instance from the factory for the connection's lifetime. `legacy:
 * "serve"` (the default, set explicitly here for intent) keeps 2025-era
 * clients working exactly as before, so old and new clients are both served
 * from the same tool/resource/prompt definitions.
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

  const transport = new StdioServerTransport();

  // `serveStdio` owns the transport and installs its own `onmessage`, so the
  // `initialize` capture (client identity, elicitation support) is preserved by
  // intercepting that assignment and tapping messages first.
  const capture = createInitializeCaptureTap();
  let onmessage: ((message: JSONRPCMessage) => void) | undefined;

  Object.defineProperty(transport, "onmessage", {
    configurable: true,
    get: () => onmessage,
    set: (handler: ((message: JSONRPCMessage) => void) | undefined) => {
      onmessage = (message: JSONRPCMessage) => {
        capture.observe(message);
        handler?.(message);
      };
    },
  });

  const handle = serveStdio(
    async () => {
      const server = await buildStdioServer();
      capture.attachServer(server);
      return server;
    },
    {
      // Serve 2025-era openings alongside modern ones (this is also the
      // default; stated explicitly so the backwards-compatibility guarantee
      // is visible at the call site).
      legacy: "serve",
      transport,
      onerror: (error) => {
        console.error("[MCP][stdio] Transport error:", error);
      },
    },
  );

  // Graceful shutdown: close the connection on SIGTERM/SIGINT.
  //
  // Stdio normally exits cleanly when the parent closes stdin. This handler
  // is only meaningful when the process receives a signal directly (e.g.
  // the parent kills us hard). It closes the pinned instance and the
  // underlying transport so the SDK stops reading stdin promptly.
  //
  // Note: there is no per-session `cleanupSession` call here because the
  // stdio transport has no sessionId — there is exactly one connection per
  // process lifetime — and tools running over stdio never receive an
  // mcpSessionId in their `ctx` argument, so per-client session maps are
  // never populated under stdio. Resources held by clients (e.g. Reflect
  // WebSockets) are released when the process exits. Adding a process-wide
  // teardown hook for stdio would require extending the Client interface
  // with a `cleanupAll()`; tracked as a separate enhancement.
  registerShutdownHandler("stdio-transport", async () => {
    try {
      await handle.close();
    } catch (err) {
      console.error("[MCP][shutdown] Error closing stdio transport:", err);
    }
  });
}

export function getEnvVarName(clientPrefix: string, key: string): string {
  return `${clientPrefix.toUpperCase().replace(/-/g, "_")}_${key.toUpperCase()}`;
}
