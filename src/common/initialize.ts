import {
  CLIENT_CAPABILITIES_META_KEY,
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { setProcessClientIdentity, toClientIdentity } from "./client-identity";
import type { ModernClientMeta } from "./request-context";
import type { SmartBearMcpServer } from "./server";
import type { ClientInfo } from "./types";

/**
 * Lift the modern-era (2026-07-28) client metadata out of a request's `_meta`
 * envelope.
 *
 * The modern era has no `initialize` handshake and no session, so a client
 * restates who it is and what it supports on every request (SEP-2575). This is
 * the modern counterpart of {@link handleInitializeMessage}: same information,
 * scoped to one request instead of one connection.
 *
 * Returns `undefined` for anything without a modern protocol claim — which is
 * how legacy messages are told apart from modern ones.
 */
export function extractModernClientMeta(
  message: unknown,
): ModernClientMeta | undefined {
  if (typeof message !== "object" || message === null) {
    return undefined;
  }

  const params = (message as { params?: Record<string, unknown> }).params;
  const meta = params?._meta as Record<string, unknown> | undefined;

  const protocolVersion = meta?.[PROTOCOL_VERSION_META_KEY];
  if (typeof protocolVersion !== "string") {
    // No protocol claim: legacy traffic, or a message the modern era rejects
    // in its own validation. Either way there is nothing to lift here.
    return undefined;
  }

  return {
    protocolVersion,
    clientInfo: meta?.[CLIENT_INFO_META_KEY] as ClientInfo | undefined,
    clientCapabilities: meta?.[CLIENT_CAPABILITIES_META_KEY] as
      | Record<string, unknown>
      | undefined,
  };
}

/**
 * Applies the client info and capability flags carried by an MCP `initialize`
 * request onto the given server instance. No-ops for any other message.
 *
 * Legacy (2025-era) path only: `initialize` exists solely in that era, and the
 * per-connection state it captures is meaningful only there. Modern requests
 * carry the same information per request instead — see
 * {@link extractModernClientMeta}.
 *
 * clientInfo has been a required field of `initialize` params since the
 * original 2024-11-05 MCP spec version, so it is captured unconditionally.
 * Capability detection (elicitation) predates that and stays gated
 * behind protocolVersion 2025-11-25 to preserve existing behavior.
 *
 * Sampling capability detection was removed after the MCP spec deprecated
 * the Sampling feature (2026-07-28, SEP-2577).
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

  // Belt-and-braces era gate: a message carrying a modern protocol claim is
  // never legacy, even if it somehow also names `initialize`.
  if (extractModernClientMeta(message)) {
    return;
  }

  const params = (message as { params?: Record<string, unknown> }).params;

  const identity = toClientIdentity(
    params?.clientInfo as { name?: string; version?: string } | undefined,
    params?.protocolVersion as string | undefined,
  );

  server.setMcpClientIdentity(identity);
  setProcessClientIdentity(identity);

  const clientInfo = params?.clientInfo as ClientInfo | undefined;
  if (clientInfo) {
    server.setClientInfo(clientInfo);
  }

  if (params?.protocolVersion === "2025-11-25") {
    const clientCapabilities = (params.capabilities ?? {}) as Record<
      string,
      unknown
    >;

    if (Object.hasOwn(clientCapabilities, "elicitation")) {
      server.setElicitationSupported(true);
    }
  }

  // Other protocolVersion handling can be added below
  // to maintain backwards compatibility.
}
