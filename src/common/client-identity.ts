import { getRequestContext } from "./request-context.ts";

/**
 * Process-wide fallback identity, used by stdio transport where there is a
 * single connection for the process lifetime and no per-request AsyncLocalStorage
 * context. Safe because stdio handles exactly one client.
 */
let processClientIdentity: McpClientIdentity | undefined;

/**
 * Client identity captured from the MCP `initialize` handshake.
 *
 * `clientInfo` is protocol-guaranteed for conforming clients but self-reported:
 * a client may omit it or report an arbitrary value.
 */
export interface McpClientIdentity {
  /** Raw `clientInfo.name` as reported by the client (may be absent). */
  name?: string;
  /** Raw `clientInfo.version` as reported by the client (may be absent). */
  version?: string;
  /** Negotiated protocol version from the initialize request, when known. */
  protocolVersion?: string;
}

/**
 * Build an {@link McpClientIdentity} from a raw `clientInfo` object (as found
 * on the MCP `initialize` request, or returned by `Server.getClientVersion()`).
 */
export function toClientIdentity(
  info?: { name?: string; version?: string },
  protocolVersion?: string,
): McpClientIdentity {
  return {
    name: info?.name,
    version: info?.version,
    protocolVersion,
  };
}

/** Set (or clear) the process-wide client identity (stdio transport). */
export function setProcessClientIdentity(
  identity: McpClientIdentity | undefined,
): void {
  processClientIdentity = identity;
}

/**
 * Resolve the client identity for the current outbound request, preferring the
 * per-request context (HTTP, supports concurrent sessions) and falling back to
 * the process-wide identity (stdio). Returns `undefined` when nothing has been
 * captured yet (e.g. before `initialize`).
 */
export function getCurrentClientIdentity(): McpClientIdentity | undefined {
  return getRequestContext()?.mcpClient ?? processClientIdentity;
}
