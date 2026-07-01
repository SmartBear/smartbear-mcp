import type { SmartBearMcpServer } from "./server";
import type { ClientInfo } from "./types";

/**
 * Applies the client info and capability flags carried by an MCP `initialize`
 * request onto the given server instance. No-ops for any other message.
 *
 * clientInfo has been a required field of `initialize` params since the
 * original 2024-11-05 MCP spec version, so it is captured unconditionally.
 * Capability detection (sampling/elicitation) predates that and stays gated
 * behind protocolVersion 2025-11-25 to preserve existing behavior.
 */
export function handleInitializeMessage(
  server: SmartBearMcpServer,
  message: unknown,
): void {
  if (
    typeof message !== "object" ||
    message === null ||
    !("method" in message) ||
    (message as { method: unknown }).method !== "initialize"
  ) {
    return;
  }

  const params = (message as { params?: Record<string, unknown> }).params;
  const clientInfo = params?.clientInfo as ClientInfo | undefined;
  if (clientInfo) {
    server.setClientInfo(clientInfo);
  }

  if (params?.protocolVersion === "2025-11-25") {
    const clientCapabilities = (params.capabilities ?? {}) as Record<
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
