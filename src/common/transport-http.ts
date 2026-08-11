import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createServer } from "node:http";
import querystring from "node:querystring";
import {
  NodeStreamableHTTPServerTransport,
  toNodeHandler,
  toWebRequest,
} from "@modelcontextprotocol/node";
import {
  createMcpHandler,
  isInitializeRequest,
  isLegacyRequest,
} from "@modelcontextprotocol/server";
import { SSEServerTransport } from "@modelcontextprotocol/server-legacy/sse";
import { clientRegistry } from "./client-registry";
import { handleInitializeMessage } from "./initialize";
import {
  setRequestMcpClient,
  withRequestContext,
  withRequestHeaders,
} from "./request-context";
import { SmartBearMcpServer } from "./server";
import { isDraining, registerShutdownHandler } from "./shutdown";
import { getEnvVarName } from "./transport-stdio";
import { getTypeDescription, isOptionalType } from "./zod-utils";

type SessionEntry = {
  server: SmartBearMcpServer;
  transport: NodeStreamableHTTPServerTransport | SSEServerTransport;
};

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

  // Modern (2026-07-28) leg. Created once for the process; the per-request
  // server is injected via modernServerStorage. 2025-era traffic never reaches
  // it — see handleMcpEndpoint.
  const modernHandler = createModernHandler();
  const modernNodeHandler = toNodeHandler(modernHandler, {
    onerror: (error) => {
      console.error("[MCP][modern] Node adapter error:", error);
    },
  });

  // Get dynamic list of allowed headers from registered clients
  const allowedAuthHeaders = getHttpHeaders();
  const allowedHeaders = [
    "Content-Type",
    "Authorization",
    "MCP-Session-Id", // Required for StreamableHTTP
    "x-custom-auth-headers", // used by mcp-inspector
    "mcp-protocol-version",
    // Modern (2026-07-28) per-request routing headers. Browser-based modern
    // clients are blocked by CORS preflight without these.
    "mcp-method",
    "mcp-name",
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
        await handleMcpEndpoint(req, res, transports, modernNodeHandler);
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
    // Tear down the modern leg first: it aborts in-flight modern exchanges and
    // closes their per-request instances. The sessionful legacy transports are
    // drained separately below.
    try {
      await modernHandler.close();
    } catch (err) {
      console.error("[MCP][shutdown] Error closing modern handler:", err);
    }
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
      transport: NodeStreamableHTTPServerTransport | SSEServerTransport;
    }
  >,
  res: ServerResponse,
): NodeStreamableHTTPServerTransport | null {
  const existing = transports.get(sessionId);
  if (
    existing &&
    existing.transport instanceof NodeStreamableHTTPServerTransport
  ) {
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
      transport: NodeStreamableHTTPServerTransport | SSEServerTransport;
    }
  >,
): Promise<NodeStreamableHTTPServerTransport | null> {
  // Create and configure server with headers from the request
  const server = await newServer(req, res);
  if (!server) {
    return null;
  }

  // Create transport with session management
  const transport = new NodeStreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (newSessionId) => {
      console.log(`[MCP] New session initialized: ${newSessionId}`);
      // Store session so subsequent requests can find it
      transports.set(newSessionId, { server, transport });
    },
  });
  transport.onmessage = (message) => handleInitializeMessage(server, message);

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
 * Carries the per-request, already-configured server into the
 * {@link createMcpHandler} factory.
 *
 * The factory itself cannot send an HTTP response, but configuration failure
 * must still produce the 401 + `WWW-Authenticate` OAuth-discovery response.
 * So the server is built (and any 401 written) in the route, then handed to
 * the factory through this store rather than being rebuilt inside it.
 */
const modernServerStorage = new AsyncLocalStorage<SmartBearMcpServer>();

/**
 * The modern (2026-07-28) request handler.
 *
 * `legacy: "reject"` is deliberate: 2025-era traffic is *not* served here. It
 * keeps going to the existing sessionful Streamable HTTP / SSE wiring below,
 * which supports session ids, resumable GET streams and DELETE teardown that
 * the SDK's stateless legacy fallback answers with `405`. The era router
 * ({@link handleMcpEndpoint}) decides which leg serves each request, using the
 * SDK's own classifier so the two can never disagree.
 */
function createModernHandler() {
  return createMcpHandler(
    () => {
      const server = modernServerStorage.getStore();
      if (!server) {
        // Unreachable via handleMcpEndpoint, which always runs the handler
        // inside modernServerStorage.run().
        throw new Error(
          "No configured server available for the modern MCP request",
        );
      }
      return server;
    },
    {
      legacy: "reject",
      onerror: (error) => {
        console.error("[MCP][modern] Handler error:", error);
      },
    },
  );
}

/**
 * Route one `/mcp` request to the era that should serve it.
 *
 * - Requests carrying `mcp-session-id` are 2025-era session operations by
 *   construction (the modern era is per-request and sessionless), so they go
 *   straight to the legacy handler. Routing on the header alone preserves that
 *   handler's unknown-session 404, which deliberately fires *before* the body
 *   is buffered so a junk session id cannot force JSON parsing of an arbitrary
 *   payload.
 * - Everything else is classified by the SDK's own {@link isLegacyRequest}
 *   predicate — the same code `createMcpHandler` runs internally — so a
 *   claim-less `initialize` still opens a legacy session, while envelope-
 *   carrying requests are served by the modern handler.
 */
async function handleMcpEndpoint(
  req: IncomingMessage,
  res: ServerResponse,
  transports: Map<string, SessionEntry>,
  modern: ReturnType<typeof toNodeHandler>,
) {
  if (req.headers["mcp-session-id"]) {
    await handleStreamableHttpRequest(req, res, transports);
    return;
  }

  const parsedBody = await parseRequestBody(req);
  // Passing the parsed body means the predicate classifies from the value
  // directly, cloning nothing — required here because the Node stream has
  // already been drained.
  const probe = await toWebRequest(req, parsedBody);

  if (await isLegacyRequest(probe, parsedBody)) {
    await handleStreamableHttpRequest(req, res, transports, {
      body: parsedBody,
    });
    return;
  }

  // Modern leg: configure the server up front so a config failure still
  // produces the shared 401/OAuth-discovery response.
  const server = await newServerFromWebRequest(probe, res);
  if (!server) {
    return;
  }

  const headers = webHeadersToRecord(probe.headers);
  await modernServerStorage.run(server, () =>
    withRequestHeaders(headers, () => modern(req, res, parsedBody)),
  );
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
      transport: NodeStreamableHTTPServerTransport | SSEServerTransport;
    }
  >,
  // Boxed so an explicitly-`undefined` parsed body (e.g. a GET) is still
  // recognised as "already read" — the era router drains the stream to
  // classify, so re-parsing here would yield nothing.
  preParsed?: { body: unknown },
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

    const parsedBody = preParsed ? preParsed.body : await parseRequestBody(req);

    let transport: NodeStreamableHTTPServerTransport;

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

    // Delegate to transport to handle the MCP protocol message. For requests on
    // an established session, surface the client identity captured at
    // `initialize` so downstream API calls (User-Agent) can forward it. New
    // (initialize) requests have no identity yet and make no downstream calls.
    const sessionServer = sessionId
      ? transports.get(sessionId)?.server
      : undefined;
    await withRequestContext(req, async () => {
      if (sessionServer) {
        setRequestMcpClient(sessionServer.getMcpClientIdentity());
      }
      return await transport.handleRequest(req, res, parsedBody);
    });
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
      transport: NodeStreamableHTTPServerTransport | SSEServerTransport;
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

  // Capture the client identity from the initialize handshake (see the
  // streamable HTTP transport for rationale). Set before connect() so the SDK
  // chains this handler ahead of its own message processing.
  transport.onmessage = (message) => handleInitializeMessage(server, message);

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
      transport: NodeStreamableHTTPServerTransport | SSEServerTransport;
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
      // Route message to the SSE transport for processing, surfacing the client
      // identity captured at `initialize` for downstream forwarding.
      await withRequestContext(req, async () => {
        setRequestMcpClient(session.server.getMcpClientIdentity());
        return await (
          session.transport as SSEServerTransport
        ).handlePostMessage(req, res, parsedBody);
      });
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
  const queryStringName = getQueryStringName(clientPrefix, key);
  const queryParams = querystring.parse(req.url?.split("?")[1] || "");
  let value =
    queryParams[queryStringName] || queryParams[queryStringName.toLowerCase()];
  if (typeof value === "string") {
    return value;
  }

  // 2. Try headers
  const headerName = getHeaderName(clientPrefix, key);
  // Check both original case and lower-case headers for compatibility
  // (HTTP headers are case-insensitive, but Node.js lowercases them)
  value = req.headers[headerName] || req.headers[headerName.toLowerCase()];
  if (typeof value === "string") {
    return value;
  }

  // 3. Fall back to environment variable
  const envVarName = getEnvVarName(clientPrefix, key);
  return process.env[envVarName] || null;
}

/**
 * Read a configuration value from a web-standard `Request`.
 *
 * The modern (2026-07-28) path is served from a web `Request` rather than a
 * Node `IncomingMessage`, so header access goes through `Headers.get()` —
 * which is case-insensitive per spec, removing the need for the dual-case
 * lookup the Node variant performs.
 *
 * Resolution order matches {@link getConfigValue}: query string, then header,
 * then environment variable.
 */
function getConfigValueFromWebRequest(
  clientPrefix: string,
  key: string,
  request: Request,
): string | null {
  // 1. Try query string
  const queryStringName = getQueryStringName(clientPrefix, key);
  const searchParams = new URL(request.url).searchParams;
  const queryValue =
    searchParams.get(queryStringName) ??
    searchParams.get(queryStringName.toLowerCase());
  if (queryValue) {
    return queryValue;
  }

  // 2. Try headers
  const headerValue = request.headers.get(getHeaderName(clientPrefix, key));
  if (headerValue) {
    return headerValue;
  }

  // 3. Fall back to environment variable
  const envVarName = getEnvVarName(clientPrefix, key);
  return process.env[envVarName] || null;
}

/** Flatten web `Headers` into the record shape the request context stores. */
function webHeadersToRecord(
  headers: Headers,
): Record<string, string | string[] | undefined> {
  return Object.fromEntries(headers.entries());
}

/**
 * Build and configure a server instance from a transport-neutral config
 * reader, writing the shared 401/OAuth-discovery response when configuration
 * fails.
 *
 * Both HTTP eras funnel through here — the legacy path supplies a Node
 * `IncomingMessage` reader, the modern path a web `Request` reader — so
 * configuration, auth checking and the error response can never drift between
 * them.
 *
 * @returns SmartBearMcpServer instance if successful, null if configuration fails
 */
async function buildConfiguredServer(
  getConfig: (clientPrefix: string, key: string) => string | null,
  headers: Record<string, string | string[] | undefined>,
  host: string | undefined,
  res: ServerResponse,
): Promise<SmartBearMcpServer | null> {
  const enabledToolsets = getConfig("smartbear", "toolsets") || undefined;
  const server = new SmartBearMcpServer(enabledToolsets);
  try {
    // Run configuration within request context so that client getAuthToken()
    // methods can access request headers via AsyncLocalStorage
    const configuredCount = await withRequestHeaders(headers, () =>
      clientRegistry.configure(
        server,
        (client, key) => {
          return getConfig(client.configPrefix, key);
        },
        true, // ignoreMissingRequiredConfigs
      ),
    );

    console.log(
      `Configured ${configuredCount} clients for new server instance`,
    );

    if (configuredCount === 0) {
      throw new Error(
        "No clients successfully configured. Missing authentication headers.",
      );
    }

    // Check if any configured client actually has auth credentials for this request.
    // Some clients (e.g., Bugsnag, Reflect) configure successfully with optional auth
    // and resolve tokens per-request. If none of them have auth, trigger OAuth flow.
    const hasAuth = withRequestHeaders(headers, () =>
      server.getClients().some((client) => {
        // Client doesn't support dynamic auth — auth was provided at config time
        if (!client.getAuthToken) return true;
        // Client supports dynamic auth — check if a token is available
        return client.getAuthToken() !== null;
      }),
    );

    if (!hasAuth) {
      throw new Error(
        "No clients have valid authentication credentials. Please authenticate via OAuth or provide alternative auth headers (e.g. API key or personal auth token).",
      );
    }
  } catch (error: any) {
    // Configuration failed - provide helpful error message
    const headerHelp = getHttpHeadersHelp();
    const errorMessage =
      headerHelp.length > 0
        ? `Configuration error: ${error instanceof Error ? error.message : String(error)}. Please provide valid headers:\n${headerHelp.join("\n")}`
        : "No clients support HTTP header configuration.";

    const responseHeaders: Record<string, string> = {
      "Content-Type": "text/plain",
    };

    // Add WWW-Authenticate header to support OAuth discovery flow
    // This points the client to the Protected Resource Metadata endpoint
    if (host) {
      responseHeaders["WWW-Authenticate"] =
        `OAuth resource_metadata="http://${host}/.well-known/oauth-protected-resource"`;
    }

    res.writeHead(401, responseHeaders);
    res.end(errorMessage);
    return null;
  }
  return server;
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
  return buildConfiguredServer(
    (clientPrefix, key) => getConfigValue(clientPrefix, key, req),
    req.headers,
    req.headers.host,
    res,
  );
}

/**
 * Create a new MCP server instance configured from a web-standard `Request`.
 *
 * The modern (2026-07-28) counterpart of {@link newServer}: same configuration
 * and auth semantics, sourced from `Request.headers` / the request URL.
 */
export async function newServerFromWebRequest(
  request: Request,
  res: ServerResponse,
): Promise<SmartBearMcpServer | null> {
  return buildConfiguredServer(
    (clientPrefix, key) =>
      getConfigValueFromWebRequest(clientPrefix, key, request),
    webHeadersToRecord(request.headers),
    request.headers.get("host") ?? undefined,
    res,
  );
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
 * @param client The client instance (provides configPrefix)
 * @param key The config key in snake_case
 * @returns Header name in format: {ConfigPrefix}-{Pascal-Kebab-Case}
 */
export function getHeaderName(clientPrefix: string, key: string): string {
  return `${clientPrefix}-${key
    .split("_")
    .map(
      (part: string) =>
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join("-")}`;
}

export function getQueryStringName(clientPrefix: string, key: string): string {
  return `${clientPrefix.toLowerCase()}${key
    .split("_")
    .map(
      (part: string) =>
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join("")}`;
}

/**
 * Get all HTTP headers that clients support for authentication
 * Returns a list of header names (in kebab-case) that should be allowed
 */
function getHttpHeaders(): string[] {
  const headers = new Set<string>();

  // Use getAll() to respect client filtering
  for (const entry of clientRegistry.getAll()) {
    for (const configKey of Object.keys(entry.config.shape)) {
      headers.add(getHeaderName(entry.configPrefix, configKey));
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
  for (const entry of clientRegistry.getAll()) {
    messages.push(` - ${entry.name}:`);
    for (const [configKey, requirement] of Object.entries(entry.config.shape)) {
      const headerName = getHeaderName(entry.configPrefix, configKey);
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
