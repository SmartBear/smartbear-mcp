import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "node:http";

import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";

import { clientRegistry } from "./client-registry.js";
import { SmartBearMcpServer } from "./server.js";
import type { Client } from "./types.js";

/**
 * Run server in HTTP mode with Streamable HTTP transport
 * Supports both SSE (legacy) and StreamableHTTP transports for backwards compatibility
 */
export async function runHttpMode() {
  const PORT = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000;

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
    ...allowedAuthHeaders,
  ].join(", ");

  const httpServer = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      // Enable CORS
      res.setHeader("Access-Control-Allow-Origin", "*");
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

      const url = new URL(req.url || "/", `http://${req.headers.host}`);

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
      `[MCP HTTP Server] Modern endpoint: http://localhost:${PORT}/mcp (Streamable HTTP)`,
    );
    console.log(
      `[MCP HTTP Server] Legacy endpoint: http://localhost:${PORT}/sse (SSE)`,
    );

    const headerHelp = getHttpHeadersHelp();
    if (headerHelp.length > 0) {
      console.log(
        `[MCP HTTP Server] Send configuration headers:${headerHelp.join("")}`,
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
  const server = await newServer(req, res);
  if (!server) {
    return null;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
    onsessioninitialized: (newSessionId) => {
      console.log(`[MCP] New session initialized: ${newSessionId}`);
      transports.set(newSessionId, { server, transport });
    },
  });

  transport.onclose = () => {
    if (transport.sessionId) {
      console.log(`[MCP] Session closed: ${transport.sessionId}`);
      transports.delete(transport.sessionId);
    }
  };

  await server.connect(transport);
  return transport;
}

/**
 * Handle modern Streamable HTTP requests
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

    if (sessionId && transports.has(sessionId)) {
      const existingTransport = getExistingTransport(
        sessionId,
        transports,
        res,
      );
      if (!existingTransport) return;
      transport = existingTransport;
    } else if (
      !sessionId &&
      req.method === "POST" &&
      parsedBody &&
      isInitializeRequest(parsedBody)
    ) {
      const newTransport = await createNewTransport(req, res, transports);
      if (!newTransport) return;
      transport = newTransport;
    } else {
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

    await transport.handleRequest(req, res, parsedBody);
  } catch (error) {
    console.error("Error handling StreamableHTTP request:", error);
    res.writeHead(500, { "Content-Type": "text/plain" });
    res.end("Internal server error");
  }
}

/**
 * Handle legacy SSE connection requests
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
  const transport = new SSEServerTransport("/message", res);

  // Store the session
  transports.set(transport.sessionId, { server, transport });

  // Handle connection close
  res.on("close", () => {
    transports.delete(transport.sessionId);
  });

  // Connect server to transport (this also starts the transport automatically)
  await server.connect(transport);
}

/**
 * Handle legacy POST message requests
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
  // Route message to appropriate session
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Missing sessionId parameter");
    return;
  }

  const session = transports.get(sessionId);
  if (!session) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Session not found");
    return;
  }

  if (!(session.transport instanceof SSEServerTransport)) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Invalid transport for this endpoint");
    return;
  }

  // Parse request body
  let body = "";
  req.on("data", (chunk) => {
    body += chunk.toString();
  });

  req.on("end", async () => {
    try {
      const parsedBody = JSON.parse(body);
      // TypeScript now knows session.transport is SSEServerTransport
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

async function newServer(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<SmartBearMcpServer | null> {
  const server = new SmartBearMcpServer();
  try {
    await clientRegistry.configure(server, (client, key) => {
      const headerName = getHeaderName(client, key);
      const value = req.headers[headerName];
      if (typeof value === "string") {
        return value;
      }
      throw new Error(
        `Missing required config for ${client.name}: ${headerName}`,
      );
    });
  } catch (error: any) {
    const headerHelp = getHttpHeadersHelp();
    const errorMessage =
      headerHelp.length > 0
        ? `Configuration error: ${error instanceof Error ? error.message : String(error)}. Please provide valid headers:\n${headerHelp.join("\n")}`
        : "No clients support HTTP header configuration.";

    res.writeHead(401, { "Content-Type": "text/plain" });
    res.end(errorMessage);
    return null;
  }
  return server;
}

function getHeaderName(client: Client, key: string): string {
  return `${client.name}-${key
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
    for (const [configKey, requirement] of Object.entries(entry.config.shape)) {
      const headerName = getHeaderName(entry, configKey);
      const requiredTag = requirement.isOptional()
        ? " (optional)"
        : " (required)";
      messages.push(
        `    - ${headerName}${requiredTag}: ${requirement.description}`,
      );
    }
  }

  return messages;
}
