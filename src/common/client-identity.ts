import { getRequestContext } from "./request-context";

/**
 * Canonical, low-cardinality MCP client identifiers.
 *
 * `clientInfo.name` is self-reported free text with no registry, so it is
 * normalized to one of these values before being used for grouping/attribution
 * (e.g. Bugsnag metadata, downstream User-Agent forwarding). The raw,
 * un-normalized name is preserved separately on {@link McpClientIdentity} for
 * discoverability of new/unknown clients.
 */
export const MCP_CLIENT_NAMES = {
  CLAUDE: "claude",
  CURSOR: "cursor",
  COPILOT_STUDIO: "copilot-studio",
  VSCODE: "vscode",
  CONTINUE: "continue",
  CLINE: "cline",
  WINDSURF: "windsurf",
  ZED: "zed",
  GOOSE: "goose",
  MCP_INSPECTOR: "mcp-inspector",
  UNKNOWN: "unknown",
} as const;

export type McpClientName =
  (typeof MCP_CLIENT_NAMES)[keyof typeof MCP_CLIENT_NAMES];

/**
 * Client identity captured from the MCP `initialize` handshake.
 *
 * `clientInfo` is protocol-guaranteed for conforming clients but self-reported:
 * a client may omit it or report an arbitrary value. Callers should treat
 * {@link McpClientIdentity.normalizedName} as best-effort.
 */
export interface McpClientIdentity {
  /** Raw `clientInfo.name` as reported by the client (may be absent). */
  name?: string;
  /** Raw `clientInfo.version` as reported by the client (may be absent). */
  version?: string;
  /** Negotiated protocol version from the initialize request, when known. */
  protocolVersion?: string;
  /** Canonical, low-cardinality identifier derived from {@link name}. */
  normalizedName: McpClientName;
}

/**
 * Ordered substring/pattern rules mapping raw client names to canonical ones.
 * First match wins, so more specific patterns must come before broader ones.
 */
const NORMALIZATION_RULES: ReadonlyArray<readonly [RegExp, McpClientName]> = [
  [/copilot[-_ ]?studio/i, MCP_CLIENT_NAMES.COPILOT_STUDIO],
  [/claude/i, MCP_CLIENT_NAMES.CLAUDE],
  [/cursor/i, MCP_CLIENT_NAMES.CURSOR],
  [/(vs[-_ ]?code|visual[-_ ]?studio[-_ ]?code)/i, MCP_CLIENT_NAMES.VSCODE],
  [/continue/i, MCP_CLIENT_NAMES.CONTINUE],
  [/cline/i, MCP_CLIENT_NAMES.CLINE],
  [/windsurf/i, MCP_CLIENT_NAMES.WINDSURF],
  [/\bzed\b/i, MCP_CLIENT_NAMES.ZED],
  [/goose/i, MCP_CLIENT_NAMES.GOOSE],
  [
    /(mcp[-_ ]?inspector|modelcontextprotocol\/inspector)/i,
    MCP_CLIENT_NAMES.MCP_INSPECTOR,
  ],
];

/**
 * Normalize a self-reported `clientInfo.name` to a canonical identifier.
 * Returns `"unknown"` for empty/unrecognized values to keep cardinality low.
 */
export function normalizeClientName(raw?: string): McpClientName {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return MCP_CLIENT_NAMES.UNKNOWN;
  }
  for (const [pattern, canonical] of NORMALIZATION_RULES) {
    if (pattern.test(trimmed)) {
      return canonical;
    }
  }
  return MCP_CLIENT_NAMES.UNKNOWN;
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
    normalizedName: normalizeClientName(info?.name),
  };
}

/**
 * Process-wide fallback identity, used by stdio transport where there is a
 * single connection for the process lifetime and no per-request AsyncLocalStorage
 * context. Safe because stdio handles exactly one client.
 */
let processClientIdentity: McpClientIdentity | undefined;

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
