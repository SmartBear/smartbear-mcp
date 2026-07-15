import process from "node:process";
import packageJson from "../../package.json" with { type: "json" };
import {
  getCurrentClientIdentity,
  type McpClientIdentity,
} from "./client-identity.ts";

export const MCP_SERVER_NAME = packageJson.config.mcpServerName;
export const MCP_SERVER_VERSION = packageJson.version;
export const MCP_TRANSPORT =
  process.env.MCP_TRANSPORT?.toLowerCase().trim() || "stdio";
export const USER_AGENT = `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION} ${MCP_TRANSPORT}`;

/**
 * Sanitize a value for safe inclusion in a User-Agent comment segment by
 * stripping characters that would break the `( ... )` syntax or span lines.
 */
function sanitizeUserAgentToken(value: string): string {
  return value.replace(/[()\r\n;]/g, "").trim();
}

/**
 * Build the ` (client: ...; clientVersion: ...)` User-Agent comment segment for
 * a given identity, or an empty string when the client is unidentified.
 */
function clientIdentitySuffix(identity?: McpClientIdentity): string {
  if (!identity?.name) {
    return "";
  }
  const clientName = sanitizeUserAgentToken(identity.name) || "unknown";
  const version = identity.version
    ? sanitizeUserAgentToken(identity.version) || "unknown"
    : "unknown";
  return ` (client: ${clientName}; clientVersion: ${version})`;
}

/**
 * Append the identified MCP client (from the `initialize` handshake) to a base
 * User-Agent as a comment segment, so downstream services can attribute traffic
 * by source — e.g.
 * `Smartbear-MCP/1.2.3 http (client: cursor; clientVersion: 0.40.0)`.
 *
 * Returns `baseUserAgent` unchanged when no client has been identified (e.g.
 * before `initialize`, or an unknown client with no reported name).
 */
export function appendClientIdentity(baseUserAgent: string): string {
  return baseUserAgent + clientIdentitySuffix(getCurrentClientIdentity());
}

/**
 * Build the outbound User-Agent for downstream API calls, including the
 * identified MCP client when known. See {@link appendClientIdentity}.
 */
export function getUserAgent(): string {
  return appendClientIdentity(USER_AGENT);
}
