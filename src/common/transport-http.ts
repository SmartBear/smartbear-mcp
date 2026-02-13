import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "node:http";

import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { clientRegistry } from "./client-registry";
import { SmartBearMcpServer } from "./server";
import type { Client } from "./types";
import { isOptionalType } from "./zod-utils";

/**
 * Helper to construct the base URL from the request, respecting proxy headers.
 * This is critical for cloud deployments where SSL termination happens at the load balancer.
 */
function getBaseUrl(req: IncomingMessage): string {
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
  const baseUrlOverride = process.env.BASE_URL; // Allow explicit override if headers are unreliable

  // Store transports by session ID
  const transports = new Map<
    string,
    {
      server: SmartBearMcpServer;
      transport: StreamableHTTPServerTransport | SSEServerTransport;
    }
  >();

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
      // Use env override if set, otherwise detect from request headers
      const baseUrl = baseUrlOverride || getBaseUrl(req);
      const url = new URL(req.url || "/", baseUrl);

      // HEALTH CHECK ENDPOINT
      if (req.method === "GET" && url.pathname === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
        );
        return;
      }

      // OAUTH DISCOVERY ENDPOINT (RFC 8414)
      if (
        req.method === "GET" &&
        (url.pathname === "/.well-known/oauth-authorization-server" ||
          url.pathname === "/.well-known/oauth-authorization-server/mcp")
      ) {
        const issuer =
          process.env.OAUTH_ISSUER || "https://oauth.smartbear.com";
        const authEndpoint =
          process.env.OAUTH_AUTHORIZATION_ENDPOINT || `${issuer}/authorize`;
        const tokenEndpoint =
          process.env.OAUTH_TOKEN_ENDPOINT || `${issuer}/token`;
        const jwksUri =
          process.env.OAUTH_JWKS_URI || `${issuer}/.well-known/jwks.json`;

        // We provide a local registration endpoint to satisfy MCP Inspector
        // which returns a pre-configured client ID
        const registrationEndpoint = `${baseUrl}/oauth/register`;

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            issuer: issuer,
            authorization_endpoint: authEndpoint,
            token_endpoint: tokenEndpoint,
            jwks_uri: jwksUri,
            registration_endpoint: registrationEndpoint,
            response_types_supported: ["code"],
            grant_types_supported: ["authorization_code", "refresh_token"],
            code_challenge_methods_supported: ["S256"],
            token_endpoint_auth_methods_supported: ["none"],
            scopes_supported: process.env.OAUTH_SCOPES
              ? process.env.OAUTH_SCOPES.split(",")
              : ["api"],
          }),
        );
        return;
      }

      // PROTECTED RESOURCE METADATA ENDPOINT (RFC 9293)
      // This endpoint tells the client where to find the Authorization Server.
      // The Inspector hits this first to find the Auth Server, then hits /.well-known/oauth-authorization-server.
      // We point to ourselves (or the configured issuer) so the client can find the metadata above.
      if (
        req.method === "GET" &&
        (url.pathname === "/.well-known/oauth-protected-resource" ||
          url.pathname === "/.well-known/oauth-protected-resource/mcp")
      ) {
        // In this architecture, the MCP server acts as the discovery gateway for the Auth Server.
        // We point the client to this server's host to fetch the authorization server metadata.
        // Note: The 'issuer' in the metadata above might be different (external), but we want
        // the client to discover the metadata *here* first to get our registration_endpoint.
        // If we pointed directly to an external issuer, we'd lose the ability to inject the
        // mock registration endpoint.
        const authServerUrl = baseUrl;

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            resource: `${baseUrl}/mcp`,
            authorization_servers: [authServerUrl],
          }),
        );
        return;
      }

      // DYNAMIC CLIENT REGISTRATION ENDPOINT
      // This endpoint implements a stateless version of RFC 7591 dynamic client registration.
      // It allows clients (like MCP Inspector) to register themselves to obtain a client_id.
      // Since this server is stateless, we return a deterministic or configured client_id
      // rather than persisting client records in a database.
      // The Inspector calls this to get the client_id before constructing the authorization URL.
      if (req.method === "POST" && url.pathname === "/oauth/register") {
        try {
          // Consume the body
          const body = (await parseRequestBody(req)) as Record<string, unknown>;
          const redirectUris = body?.redirect_uris as string[] | undefined;

          // RFC 7591: redirect_uris is required for web clients
          if (
            !redirectUris ||
            !Array.isArray(redirectUris) ||
            redirectUris.length === 0
          ) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "invalid_redirect_uri",
                error_description: "redirect_uris parameter is required",
              }),
            );
            return;
          }

          // Use configured client ID or default to a static one for stateless operation
          const clientId = process.env.OAUTH_CLIENT_ID || "mcp-client";

          // Determine scopes: Use requested scopes if valid, or default to all supported
          const supportedScopes = process.env.OAUTH_SCOPES
            ? process.env.OAUTH_SCOPES.split(",")
            : ["api", "offline_access"];

          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              client_id: clientId,
              client_name: body.client_name || "MCP Client",
              redirect_uris: redirectUris,
              scope: supportedScopes.join(" "),
              client_secret_expires_at: 0,
              client_id_issued_at: Math.floor(Date.now() / 1000),
              grant_types: ["authorization_code", "refresh_token"],
              response_types: ["code"],
              token_endpoint_auth_method: "none",
              application_type: "web",
            }),
          );
        } catch (error) {
          console.error("Error handling registration request:", error);
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid_request" }));
        }
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
    console.log(
      `[MCP HTTP Server] Health check: http://localhost:${PORT}/health`,
    );
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
 */
async function handleStreamableHttpRequest(
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
    const parsedBody = await parseRequestBody(req);

    let transport: StreamableHTTPServerTransport;

    // Case 1: Existing session - route to existing transport
    if (sessionId && transports.has(sessionId)) {
      const existingTransport = getExistingTransport(
        sessionId,
        transports,
        res,
      );
      if (!existingTransport) return;
      transport = existingTransport;
    }
    // Case 2: New session - must be an initialize request
    else if (
      !sessionId &&
      req.method === "POST" &&
      parsedBody &&
      isInitializeRequest(parsedBody)
    ) {
      const newTransport = await createNewTransport(req, res, transports);
      if (!newTransport) return;
      transport = newTransport;
    }
    // Case 3: Invalid request
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
async function newServer(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<SmartBearMcpServer | null> {
  const server = new SmartBearMcpServer();
  try {
    // Configure server with values from HTTP headers
    const configuredCount = await clientRegistry.configure(
      server,
      (client, key) => {
        const headerName = getHeaderName(client, key);
        // Check both original case and lower-case headers for compatibility
        // (HTTP headers are case-insensitive, but Node.js lowercases them)
        const value =
          req.headers[headerName] || req.headers[headerName.toLowerCase()];
        if (typeof value === "string") {
          return value;
        }

        // Check standard Authorization header as fallback
        // This supports the MCP Inspector which sends the obtained OAuth token in the Authorization header
        // We map this token to the primary authentication config key of the client
        const isAuthKey = [
          "auth_token",
          "api_token",
          "api_key",
          "token",
          "login_ticket",
        ].includes(key);

        if (isAuthKey && req.headers.authorization) {
          const authHeader = req.headers.authorization;
          if (authHeader.startsWith("Bearer ")) {
            return authHeader.substring(7);
          }
          return authHeader;
        }

        return null;
      },
    );

    console.log(
      `Configured ${configuredCount} clients for new server instance`,
    );

    if (configuredCount === 0) {
      throw new Error(
        "No clients successfully configured. Missing authentication headers.",
      );
    }
  } catch (error: any) {
    // Configuration failed - provide helpful error message
    const headerHelp = getHttpHeadersHelp();
    const errorMessage =
      headerHelp.length > 0
        ? `Configuration error: ${error instanceof Error ? error.message : String(error)}. Please provide valid headers:\n${headerHelp.join("\n")}`
        : "No clients support HTTP header configuration.";

    const headers: Record<string, string> = {
      "Content-Type": "text/plain",
    };

    // Add WWW-Authenticate header to support OAuth discovery flow
    // This points the client to the Protected Resource Metadata endpoint
    if (req.headers.host) {
      headers["WWW-Authenticate"] =
        `OAuth resource_metadata="http://${req.headers.host}/.well-known/oauth-protected-resource"`;
    }

    res.writeHead(401, headers);
    res.end(errorMessage);
    return null;
  }
  return server;
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
function getHeaderName(client: Client, key: string): string {
  return `${client.configPrefix}-${key
    .split("_")
    .map(
      (part: string) =>
        part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
    )
    .join("-")}`;
}

/**
 * Get all HTTP headers that clients support for authentication
 * Returns a list of header names (in kebab-case) that should be allowed
 */
function getHttpHeaders(): string[] {
  const headers = new Set<string>();

  // Use getAll() to respect MCP_ENABLED_CLIENTS filtering
  for (const entry of clientRegistry.getAll()) {
    for (const configKey of Object.keys(entry.config.shape)) {
      headers.add(getHeaderName(entry, configKey));
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
      const headerName = getHeaderName(entry, configKey);
      const requiredTag = isOptionalType(requirement)
        ? " (optional)"
        : " (required)";
      messages.push(
        `    - ${headerName}${requiredTag}: ${requirement.description}`,
      );
    }
  }

  return messages;
}
