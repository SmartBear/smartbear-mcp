import { AsyncLocalStorage } from "node:async_hooks";
import type { IncomingMessage } from "node:http";
import type { McpClientIdentity } from "./client-identity";
import type { ClientInfo } from "./types";

/**
 * The protocol era serving the current request.
 *
 * - `legacy` — 2025-era: the client introduced itself once via `initialize`
 *   and per-connection state lives on the server instance.
 * - `modern` — 2026-07-28: no handshake and no session; the client restates
 *   its identity and capabilities in the `_meta` envelope of every request,
 *   so that state lives here, for the duration of one request only.
 */
export type ProtocolEra = "legacy" | "modern";

/**
 * Client metadata carried by the `_meta` envelope of a single modern-era
 * request (SEP-2575). The legacy equivalents are captured once per connection
 * from `initialize` and held on the server instance instead.
 */
export interface ModernClientMeta {
  /** Protocol revision claimed by this request, e.g. `2026-07-28`. */
  protocolVersion?: string;
  /** Self-reported client name/version, as `initialize` used to carry. */
  clientInfo?: ClientInfo;
  /** Capabilities this client declares for this request. */
  clientCapabilities?: Record<string, unknown>;
}

// Storage for pre-request data that can be retrieved from a tool to prevent caching as part of the server instance in a session.
// For example, the auth token.
export interface RequestContext {
  headers: Record<string, string | string[] | undefined>;
  // Identity of the MCP client for this session, captured at `initialize`.
  // Used to forward client attribution to downstream APIs (User-Agent).
  mcpClient?: McpClientIdentity;
  // Which protocol era is serving this request. Unset on paths that predate
  // era routing (and for legacy traffic, which is the safe default).
  era?: ProtocolEra;
  // Modern-era only: per-request client metadata lifted from `_meta`.
  clientMeta?: ModernClientMeta;
}

// Create the storage instance
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Run a callback within the request context, extracting headers from the request.
 * This ensures request headers are available via AsyncLocalStorage to downstream code.
 */
export function withRequestContext<T>(req: IncomingMessage, fn: () => T): T {
  return withRequestHeaders(req.headers, fn);
}

/**
 * Run a callback within the request context for an already-extracted header
 * map. Used by the modern (2026-07-28) HTTP path, which works with a
 * web-standard `Request` rather than a Node `IncomingMessage`, so that
 * `getRequestHeader()` behaves identically on both transports.
 *
 * Web `Headers` keys are lower-cased by the platform, matching Node's
 * `IncomingMessage.headers`, so downstream lookups resolve the same way.
 */
export function withRequestHeaders<T>(
  headers: Record<string, string | string[] | undefined>,
  fn: () => T,
): T {
  return requestContextStorage.run({ headers }, fn);
}

// Helper to get the current context
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Attach the captured MCP client identity to the current request context so
 * downstream code (e.g. User-Agent construction) can forward it. No-op when
 * called outside a request context.
 */
export function setRequestMcpClient(identity: McpClientIdentity): void {
  const context = getRequestContext();
  if (context) {
    context.mcpClient = identity;
  }
}

/**
 * Mark the current request as served by the modern (2026-07-28) era and record
 * the client metadata lifted from its `_meta` envelope. The derived
 * {@link McpClientIdentity} is set too, so existing attribution consumers
 * (Bugsnag metadata, downstream User-Agent) work for modern clients without
 * knowing where the identity came from. No-op outside a request context.
 */
export function setModernRequestClient(meta: ModernClientMeta): void {
  const context = getRequestContext();
  if (!context) {
    return;
  }
  context.era = "modern";
  context.clientMeta = meta;
  context.mcpClient = {
    name: meta.clientInfo?.name,
    version: meta.clientInfo?.version,
    protocolVersion: meta.protocolVersion,
  };
}

/** The protocol era serving the current request; `legacy` when unset. */
export function getRequestEra(): ProtocolEra {
  return getRequestContext()?.era ?? "legacy";
}

/**
 * Modern-era client metadata for the current request, or `undefined` on the
 * legacy path (where the equivalents live on the server instance).
 */
export function getRequestClientMeta(): ModernClientMeta | undefined {
  return getRequestContext()?.clientMeta;
}

/**
 * Helper to get a specific header from the current request
 * @param name Header name (case-insensitive)
 * @returns Header value or undefined if not found
 */
export function getRequestHeader(name: string): string | string[] | undefined {
  const context = getRequestContext();
  if (!context?.headers) return undefined;

  // Headers are typically case-insensitive, but node http headers are lowercased
  // We'll try exact match first, then lowercase match
  const headerValue =
    context.headers[name] || context.headers[name.toLowerCase()];
  return headerValue;
}
