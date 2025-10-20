import { randomUUID } from "node:crypto";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "node:http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { setupClientsFromHeaders } from "./client-factory.js";
import { clientRegistry } from "./client-registry.js";
import { SmartBearMcpServer } from "./server.js";

/**
 * Run server in HTTP mode with Streamable HTTP transport
 * Supports both SSE (legacy) and StreamableHTTP transports for backwards compatibility
 */
export async function runHttpMode() {
  const PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3000;

  // Store transports by session ID
  const transports = new Map<
    string,
    {
      server: SmartBearMcpServer;
      transport: StreamableHTTPServerTransport | SSEServerTransport;
    }
  >();

  // Get dynamic list of allowed headers from registered clients
  const allowedAuthHeaders = clientRegistry.getHttpAuthHeaders();
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

    const headerHelp = clientRegistry.getHttpAuthHeadersHelp();
    if (headerHelp.length > 0) {
      console.log(
        `[MCP HTTP Server] Send authentication headers:${headerHelp.join("")}`,
      );
    } else {
      console.log(
        `[MCP HTTP Server] No clients support HTTP header authentication`,
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
  const server = new SmartBearMcpServer();

  const clientsSetup = await setupClientsFromHeaders(
    server,
    server.server,
    req.headers,
  );
  if (!clientsSetup) {
    const headerHelp = clientRegistry.getHttpAuthHeadersHelp();
    const errorMessage =
      headerHelp.length > 0
        ? `Authentication failed. Please provide valid authentication headers.${headerHelp.join("\n")}`
        : "Authentication failed. No clients support HTTP header authentication.";

    res.writeHead(401, { "Content-Type": "text/plain" });
    res.end(errorMessage);
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
  const server = new SmartBearMcpServer();
  const transport = new SSEServerTransport("/message", res);

  // Setup clients from HTTP headers
  const clientsSetup = await setupClientsFromHeaders(
    server,
    server.server,
    req.headers,
  );

  if (!clientsSetup) {
    const headerHelp = clientRegistry.getHttpAuthHeadersHelp();
    const errorMessage =
      headerHelp.length > 0
        ? `Authentication failed. Please provide valid authentication headers.${headerHelp.join("\n")}`
        : "Authentication failed. No clients support HTTP header authentication.";

    res.writeHead(401, { "Content-Type": "text/plain" });
    res.end(errorMessage);
    return;
  }

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
 * Handle legacy SSE message POST requests
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
