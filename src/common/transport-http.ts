import { randomUUID } from "node:crypto";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createServer } from "node:http";
import querystring from "node:querystring";

import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { clientRegistry } from "./client-registry";
import { SmartBearMcpServer } from "./server";
import { isDraining, registerShutdownHandler } from "./shutdown";
import { getEnvVarName } from "./transport-stdio";
import type { GetEnvFn } from "./types";
import { getTypeDescription, isOptionalType } from "./zod-utils";

type SessionEntry = {
  server: SmartBearMcpServer;
  transport: StreamableHTTPServerTransport | SSEServerTransport;
};

export class AuthorizationError extends Error {}

/**
 * Common cache-control headers for probe endpoints.
 */
const PROBE_HEADERS = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
} as const;

/**
 * Liveness probe handler. Returns 200 unconditionally as long as the HTTP
 * server is responsive.
 */
export function handleHealthRequest(res: ServerResponse): void {
  res.writeHead(200, PROBE_HEADERS);
  res.end(
    JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
  );
}

/**
 * Readiness probe handler. Returns 200 normally, 503 once the process has
 * received SIGTERM and started draining.
 */
export function handleReadyRequest(
  res: ServerResponse,
  draining: () => boolean = isDraining,
): void {
  if (draining()) {
    res.writeHead(503, PROBE_HEADERS);
    res.end(
      JSON.stringify({
        status: "draining",
        timestamp: new Date().toISOString(),
      }),
    );
    return;
  }
  res.writeHead(200, PROBE_HEADERS);
  res.end(
    JSON.stringify({ status: "ready", timestamp: new Date().toISOString() }),
  );
}

/**
 * Helper to construct the base URL from the request, respecting proxy headers.
 * This is critical for cloud deployments where SSL termination happens at the load balancer.
 * If BASE_URL env var is set, it takes precedence over request headers.
 */
export function getBaseUrl(req: IncomingMessage): string {
  const baseUrlOverride = process.env.BASE_URL;
  if (baseUrlOverride) {
    return baseUrlOverride;
  }
  const protocol = (req.headers["x-forwarded-proto"] as string) || "http";
  const host = (req.headers["x-forwarded-host"] as string) || req.headers.host;
  return `${protocol}://${host}`;
}

/**
 * Run server in HTTP mode with Streamable HTTP transport
 * Supports both SSE (legacy) and StreamableHTTP transports for backwards compatibility
 */
export async function runHttpMode() {
  const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;
  const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || [
    "http://localhost:3000",
  ];

  // Store transports by session ID
  const transports = new Map<string, SessionEntry>();

  // Get dynamic list of allowed headers from registered clients
  const allowedAuthHeaders = getHttpHeaders();
  const allowedHeaders = [
    "Content-Type",
    "Authorization",
    "MCP-Session-Id", // Required for StreamableHTTP
    "x-custom-auth-headers", // used by mcp-inspector
    "mcp-protocol-version",
    ...allowedAuthHeaders,
  ].join(", ");

  const httpServer = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      // Enable CORS
      const origin = req.headers.origin || "";
      if (allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
      res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, DELETE, OPTIONS",
      );
      res.setHeader("Access-Control-Allow-Headers", allowedHeaders);
      res.setHeader("Access-Control-Expose-Headers", "MCP-Session-Id");

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      // Determine the public URL of this server
      const baseUrl = getBaseUrl(req);
      const url = new URL(req.url || "/", baseUrl);

      // LIVENESS PROBE — always 200 if the process is responsive.
      if (req.method === "GET" && url.pathname === "/health") {
        handleHealthRequest(res);
        return;
      }

      // READINESS PROBE — 200 normally, 503 once draining has started.
      if (req.method === "GET" && url.pathname === "/ready") {
        handleReadyRequest(res);
        return;
      }

      // PROTECTED RESOURCE METADATA ENDPOINT (RFC 9293)
      // This endpoint tells the client where to find the Authorization Server.
      if (
        req.method === "GET" &&
        (url.pathname === "/.well-known/oauth-protected-resource" ||
          url.pathname === "/.well-known/oauth-protected-resource/mcp")
      ) {
        // Point the client to the Authorization Server so it can fetch the metadata document
        const authServerUrl =
          process.env.OAUTH_AUTHORIZATION_SERVER_URL || "http://localhost:7070";

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            resource: `${baseUrl}/mcp`,
            authorization_servers: [authServerUrl],
          }),
        );
        return;
      }

      // STREAMABLE HTTP ENDPOINT (modern, preferred)
      if (url.pathname === "/mcp") {
        await handleStreamableHttpRequest(req, res, transports);
        return;
      }

      // LEGACY SSE ENDPOINT (for backwards compatibility)
      if (req.method === "GET" && url.pathname === "/sse") {
        await handleLegacySseRequest(req, res, transports);
        return;
      }

      if (req.method === "POST" && url.pathname === "/message") {
        await handleLegacyMessageRequest(req, res, url, transports);
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    },
  );

  httpServer.listen(PORT, () => {
    console.log(`[MCP HTTP Server] Listening on http://localhost:${PORT}`);
    console.log(`[MCP HTTP Server] Liveness:  http://localhost:${PORT}/health`);
    console.log(`[MCP HTTP Server] Readiness: http://localhost:${PORT}/ready`);
    console.log(
      `[MCP HTTP Server] Modern endpoint: http://localhost:${PORT}/mcp (Streamable HTTP)`,
    );
    console.log(
      `[MCP HTTP Server] Legacy endpoint: http://localhost:${PORT}/sse (SSE)`,
    );

    const headerHelp = getHttpHeadersHelp();
    if (headerHelp.length > 0) {
      console.log(
        `[MCP HTTP Server] Send configuration headers:\n${headerHelp.join("\n")}`,
      );
    } else {
      console.warn(
        `[MCP HTTP Server] No clients support HTTP header configuration`,
      );
    }
  });

  // Register graceful shutdown. Tears down active
  // transports before any subsystem registered earlier (e.g. logging).
  registerShutdownHandler("http-transport", async () => {
    await drainHttpTransport(httpServer, transports);
  });
}

/**
 * Drain the HTTP transport. Called by the shutdown manager on SIGTERM.
 *
 * Sequence:
 *   1. Stop accepting new TCP connections (httpServer.close).
 *      This does NOT close existing keep-alive / SSE connections.
 *   2. Close idle keep-alive connections immediately.
 *   3. Close every active transport, which fires transport.onclose →
 *      cleanupSession(sessionId) → per-client cleanupSession (e.g. Reflect
 *      WebSockets).
 *   4. Wait for httpServer.close() to fully resolve, then force-close any
 *      remaining keep-alive connections as a backstop.
 */
export async function drainHttpTransport(
  httpServer: Server,
  transports: Map<string, SessionEntry>,
): Promise<void> {
  console.log(
    `[MCP][shutdown] Draining HTTP transport (${transports.size} active session(s))`,
  );

  // Stop accepting new connections.
  const serverClosed = new Promise<void>((resolve) => {
    httpServer.close(() => resolve());
  });

  // Close idle keep-alive sockets right away — no in-flight work to lose.
  httpServer.closeIdleConnections?.();

  // Close every active transport. transport.close() ends SSE streams and
  // triggers the existing onclose -> cleanupSession chain.
  const transportCloses = [...transports.values()].map(async (entry) => {
    try {
      await entry.transport.close();
    } catch (err) {
      console.error("[MCP][shutdown] Error closing transport:", err);
    }
  });

  await Promise.all(transportCloses);

  // Backstop: force-close any TCP connections still hanging around so
  // httpServer.close() can resolve. Safe to call after transport.close()
  // because all session-aware teardown has already run.
  httpServer.closeAllConnections?.();

  await serverClosed;
  console.log("[MCP][shutdown] HTTP transport drained");
}

/**
 * Parse request body for POST requests
 * Reads the request stream and parses it as JSON
 * @returns Parsed JSON object or undefined if not a POST request or parsing fails
 */
async function parseRequestBody(req: IncomingMessage): Promise<unknown> {
  if (req.method !== "POST") {
    return undefined;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  return new Promise<unknown>((resolve) => {
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        console.error("Error parsing request body:", error);
        resolve(undefined);
      }
    });
  });
}

/**
 * Get existing transport for session or return error response
 * Validates that the session exists and uses StreamableHTTP transport
 * @returns StreamableHTTPServerTransport if valid, null otherwise (with error response sent)
 */
function getExistingTransport(
  sessionId: string,
  transports: Map<
    string,
    {
      server: SmartBearMcpServer;
      transport: StreamableHTTPServerTransport | SSEServerTransport;
    }
  >,
  res: ServerResponse,
): StreamableHTTPServerTransport | null {
  const existing = transports.get(sessionId);
  if (existing && existing.transport instanceof StreamableHTTPServerTransport) {
    return existing.transport;
  }

  // Session doesn't exist or is using a different transport (e.g., SSE)
  res.writeHead(400, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message:
          "Bad Request: Session exists but uses a different transport protocol",
      },
      id: null,
    }),
  );
  return null;
}

/**
 * Create new transport for initialize request
 * Sets up a new MCP server instance with configuration from HTTP headers,
 * creates a StreamableHTTP transport, and registers session lifecycle handlers
 * @returns StreamableHTTPServerTransport if successful, null if server initialization fails
 */
async function createNewTransport(
  req: IncomingMessage,
  res: ServerResponse,
  transports: Map<
    string,
    {
      server: SmartBearMcpServer;
      transport: StreamableHTTPServerTransport | SSEServerTransport;
    }
  >,
): Promise<StreamableHTTPServerTransport | null> {
  // Create and configure server with headers from the request
  const server = await newServer(req, res);
  if (!server) {
    return null;
  }

  // Create transport with session management
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (newSessionId) => {
      console.log(`[MCP] New session initialized: ${newSessionId}`);
      // Store session so subsequent requests can find it
      transports.set(newSessionId, { server, transport });
    },
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

  // Clean up session on close
  transport.onclose = () => {
    if (transport.sessionId) {
      console.log(`[MCP] Session closed: ${transport.sessionId}`);
      transports.delete(transport.sessionId);
      server.cleanupSession(transport.sessionId);
    }
  };

  // Connect server to transport to start handling messages
  await server.connect(transport);
  return transport;
}

/**
 * Handle modern Streamable HTTP requests
 * This is the main endpoint (/mcp) for the modern MCP StreamableHTTP transport.
 *
 * Request flow:
 * 1. First request (initialize): No session ID, body contains initialize request
 *    - Creates new server + transport, generates session ID
 * 2. Subsequent requests: Include MCP-Session-Id header
 *    - Routes to existing transport for the session
 *    - Unknown session IDs return 404 per spec, prompting the client to
 *      re-initialize (important for multi-pod deployments where a session
 *      may not be known to every pod).
 */
export async function handleStreamableHttpRequest(
  req: IncomingMessage,
  res: ServerResponse,
  transports: Map<
    string,
    {
      server: SmartBearMcpServer;
      transport: StreamableHTTPServerTransport | SSEServerTransport;
    }
  >,
) {
  try {
    const sessionId = req.headers["mcp-session-id"] as string | undefined;

    // Case 1: Unknown session - per MCP Streamable HTTP spec, return 404 so
    // clients know to re-run `initialize` (e.g. after a pod restart drops the
    // in-memory session map) rather than treating this as a permanent error.
    // Reject before buffering the body so a junk session id can't force JSON
    // parsing of an arbitrary payload; drain the stream so keep-alive sockets
    // aren't left half-read.
    if (sessionId && !transports.has(sessionId)) {
      req.resume();
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32001,
            message: "Session not found",
          },
          id: null,
        }),
      );
      return;
    }

    const parsedBody = await parseRequestBody(req);

    let transport: StreamableHTTPServerTransport;

    // Case 2: Existing session - route to existing transport
    if (sessionId) {
      const existingTransport = getExistingTransport(
        sessionId,
        transports,
        res,
      );
      if (!existingTransport) return;
      transport = existingTransport;
    }
    // Case 3: New session - must be an initialize request
    else if (
      req.method === "POST" &&
      parsedBody &&
      isInitializeRequest(parsedBody)
    ) {
      const newTransport = await createNewTransport(req, res, transports);
      if (!newTransport) return;
      transport = newTransport;
    }
    // Case 4: Invalid request
    else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: Invalid request",
          },
          id: null,
        }),
      );
      return;
    }

    // Delegate to transport to handle the MCP protocol message
    await transport.handleRequest(req, res, parsedBody);
  } catch (error) {
    console.error("Error handling StreamableHTTP request:", error);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal server error");
  }
}

/**
 * Handle legacy SSE connection requests (GET /sse)
 *
 * SSE (Server-Sent Events) transport maintains a long-lived connection
 * for server-to-client messages, with a separate POST endpoint for client-to-server.
 *
 * This is kept for backwards compatibility with older MCP clients.
 * New integrations should use the modern StreamableHTTP transport (/mcp).
 */
async function handleLegacySseRequest(
  req: IncomingMessage,
  res: ServerResponse,
  transports: Map<
    string,
    {
      server: SmartBearMcpServer;
      transport: StreamableHTTPServerTransport | SSEServerTransport;
    }
  >,
) {
  // Create a new server instance for this connection
  const server = await newServer(req, res);
  if (!server) {
    return;
  }

  // SSE transport keeps the connection open and sends events to the client
  const transport = new SSEServerTransport("/message", res);

  // Store the session so POST /message requests can find it
  transports.set(transport.sessionId, { server, transport });

  // Clean up session when connection closes
  res.on("close", () => {
    transports.delete(transport.sessionId);
    server.cleanupSession(transport.sessionId);
  });

  // Connect server to transport (this also starts the transport automatically)
  await server.connect(transport);
}

/**
 * Handle legacy POST message requests (POST /message?sessionId=xxx)
 *
 * This endpoint is part of the legacy SSE transport, handling client-to-server messages.
 * The SSE transport uses:
 * - GET /sse: Server-to-client events (long-lived connection)
 * - POST /message: Client-to-server messages (individual requests)
 *
 * New integrations should use the modern StreamableHTTP transport (/mcp).
 */
async function handleLegacyMessageRequest(
  req: IncomingMessage,
  res: ServerResponse,
  url: URL,
  transports: Map<
    string,
    {
      server: SmartBearMcpServer;
      transport: StreamableHTTPServerTransport | SSEServerTransport;
    }
  >,
) {
  // Extract session ID from query parameter
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Missing sessionId parameter");
    return;
  }

  // Find the session created by the SSE connection
  const session = transports.get(sessionId);
  if (!session) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Session not found");
    return;
  }

  // Validate this session is using SSE transport
  if (!(session.transport instanceof SSEServerTransport)) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Invalid transport for this endpoint");
    return;
  }

  // Read and parse the request body
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const parsedBody = JSON.parse(body);
      // Route message to the SSE transport for processing
      await (session.transport as SSEServerTransport).handlePostMessage(
        req,
        res,
        parsedBody,
      );
    } catch (error) {
      console.error("Error handling POST message:", error);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal server error");
    }
  });
}

function getConfigValue(
  clientPrefix: string,
  key: string,
  req: IncomingMessage,
): string | null {
  // 1. Try query string
  const queryStringName = getQueryStringName(key, clientPrefix);
  const queryParams = querystring.parse(req.url?.split("?")[1] || "");
  let value =
    queryParams[queryStringName] || queryParams[queryStringName.toLowerCase()];
  if (typeof value === "string") {
    return value;
  }

  // 2. Try headers
  const headerName = getHeaderName(key, clientPrefix);
  // Check both original case and lower-case headers for compatibility
  // (HTTP headers are case-insensitive, but Node.js lowercases them)
  value = req.headers[headerName] || req.headers[headerName.toLowerCase()];
  if (typeof value === "string") {
    return value;
  }

  // 3. Fall back to environment variable
  const envVarName = getEnvVarName(key, clientPrefix);
  return process.env[envVarName] || null;
}

/**
 * Create a new MCP server instance with configuration from HTTP headers
 *
 * Configuration is read from HTTP headers in the format:
 * {ClientPrefix}-{Field-Name} (e.g., Bugsnag-Auth-Token, Reflect-Api-Token)
 *
 * The ClientRegistry validates the configuration and initializes enabled clients.
 * If configuration fails, an error response is sent and null is returned.
 *
 * @returns SmartBearMcpServer instance if successful, null if configuration fails
 */
export async function newServer(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<SmartBearMcpServer | null> {
  const configFn: GetEnvFn = (key, client) => {
    // 1. Try query string
    const queryStringName = getQueryStringName(key, client?.configPrefix);
    const queryParams = querystring.parse(req.url?.split("?")[1] || "");
    let value =
      queryParams[queryStringName] ||
      queryParams[queryStringName.toLowerCase()];
    if (typeof value === "string") {
      return value;
    }

    // 2. Try headers
    const headerName = getHeaderName(key, client?.configPrefix);
    // Check both original case and lower-case headers for compatibility
    // (HTTP headers are case-insensitive, but Node.js lowercases them)
    value = req.headers[headerName] || req.headers[headerName.toLowerCase()];
    if (typeof value === "string") {
      if (value.toLowerCase().startsWith("bearer ")) {
        value = value.slice("bearer ".length);
      } else if (value.toLowerCase().startsWith("token ")) {
        value = value.slice("token ".length);
      } else if (value.toLowerCase().startsWith("basic ")) {
        value = value.slice("basic ".length);
      }
      return value;
    }

    // 3. Fall back to environment variable
    const envVarName = getEnvVarName(key, client?.configPrefix);
    return process.env[envVarName];
  };

  const enabledToolsets =
    getConfigValue("smartbear", "toolsets", req) || undefined;

  const server = new SmartBearMcpServer(configFn, enabledToolsets);
  try {
    const configuredCount = await clientRegistry.registerAll(
      server,
      configFn,
      true,
      false,
    );

    if (configuredCount === 0) {
      throw new Error(
        "No clients successfully configured. The request headers are missing the required configuration.",
      );
    }

    console.log(
      `Configured ${configuredCount} clients for new server instance`,
    );

    // Check if any configured client actually has auth credentials for this request.
    // Some clients (e.g., Bugsnag, Reflect) configure successfully with optional auth
    // and resolve tokens per-request. If none of them have auth, trigger OAuth flow.
    const hasNoAuth = !server.getClients().some((client) => client.hasAuth());
    if (hasNoAuth) {
      throw new AuthorizationError(
        "No clients have valid authentication credentials. Please authenticate via OAuth or provide alternative auth headers (e.g. API key or personal auth token).",
      );
    }

    return server;
  } catch (error: any) {
    const headers: Record<string, string> = {
      "Content-Type": "text/plain",
    };
    if (error instanceof AuthorizationError) {
      // Add WWW-Authenticate header to support OAuth discovery flow
      // This points the client to the Protected Resource Metadata endpoint
      if (req.headers.host) {
        headers["WWW-Authenticate"] =
          `OAuth resource_metadata="http://${req.headers.host}/.well-known/oauth-protected-resource"`;
      }
      res.writeHead(401, headers);
      res.end(error.message);
    } else {
      // Configuration failed - provide helpful error message
      const headerHelp = getHttpHeadersHelp();
      let errorMessage = `Configuration error: ${error instanceof Error ? error.message : String(error)}.`;
      if (headerHelp.length > 0) {
        errorMessage += ` Please provide valid headers:\n${headerHelp.join("\n")}`;
      }
      res.writeHead(500, headers);
      res.end(errorMessage);
    }

    return null;
  }
}

/**
 * Convert a config key to HTTP header name format
 *
 * Examples:
 * - auth_token -> Auth-Token
 * - project_api_key -> Project-Api-Key
 * - base_url -> Base-Url
 *
 * Combined with configPrefix: Bugsnag-Auth-Token, Reflect-Api-Token, etc.
 *
 * @param key The config key in snake_case
 * @param client The client config prefix
 * @returns Header name in format: {ConfigPrefix}-{Pascal-Kebab-Case}
 */
export function getHeaderName(key: string, clientPrefix?: string): string {
  const prefix = `${clientPrefix ? `${clientPrefix}-${key}` : key}`;
  return prefix
    .split(/[\s\-_]/)
    .map(
      (part: string) =>
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join("-");
}

export function getQueryStringName(key: string, clientPrefix?: string): string {
  const prefix = `${clientPrefix ? `${clientPrefix}-${key}` : key}`;
  return prefix
    .split(/[\s\-_]/)
    .map((part, i) =>
      i === 0
        ? part.toLowerCase()
        : part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join("");
}

/**
 * Get all HTTP headers that clients support for authentication
 * Returns a list of header names (in kebab-case) that should be allowed
 */
function getHttpHeaders(): string[] {
  const headers = new Set<string>();

  // Use getAll() to respect MCP_ENABLED_CLIENTS filtering
  for (const client of clientRegistry.getAll()) {
    for (const key of [
      ...Object.keys(client.config.shape),
      ...Object.keys(client.authenticationFields.shape),
    ]) {
      headers.add(getHeaderName(key, client.configPrefix));
    }
  }

  return Array.from(headers).sort((a, b) => a.localeCompare(b));
}

/**
 * Get human-readable list of HTTP headers for logging/error messages
 * Organized by client
 */
function getHttpHeadersHelp(): string[] {
  const messages: string[] = [];
  for (const client of clientRegistry.getAll()) {
    messages.push(` - ${client.name}:`);
    for (const [authKey, requirement] of Object.entries(
      client.authenticationFields.shape,
    )) {
      const headerName = getHeaderName(authKey, client.configPrefix);
      messages.push(`    - ${headerName}: ${getTypeDescription(requirement)}`);
    }
    for (const [configKey, requirement] of Object.entries(
      client.config.shape,
    )) {
      const headerName = getHeaderName(configKey, client.configPrefix);
      const requiredTag = isOptionalType(requirement)
        ? " (optional)"
        : " (required)";
      messages.push(
        `    - ${headerName}${requiredTag}: ${getTypeDescription(requirement)}`,
      );
    }
  }

  return messages;
}
