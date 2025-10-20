#!/usr/bin/env node
import type { IncomingMessage, ServerResponse } from "node:http";
import { createServer } from "node:http";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import Bugsnag from "./common/bugsnag.js";
import {
  setupClientsFromEnv,
  setupClientsFromHeaders,
} from "./common/client-factory.js";
import { clientRegistry } from "./common/client-registry.js";
import "./common/register-clients.js"; // Register all available clients
import { SmartBearMcpServer } from "./common/server.js";

/**
 * Generate a dynamic error message listing all available clients and their required env vars
 */
function getNoAuthErrorMessage(): string {
  const entries = clientRegistry.getAll();
  const requiredVars: string[] = [];

  for (const entry of entries) {
    if ("getAuthConfig" in entry.clientClass) {
      const config = (entry.clientClass as any).getAuthConfig();
      const required = config.requirements.filter((r: any) => r.required);
      requiredVars.push(...required.map((r: any) => r.key));
    }
  }

  if (requiredVars.length === 0) {
    return "[MCP] No product authentication found. Please configure at least one product client.";
  }

  const varList = requiredVars.map((v) => `  - ${v}`).join("\n");
  return `[MCP] No product authentication found. Please set at least one required environment variable:\n${varList}`;
}

// This is used to report errors in the MCP server itself
// If you want to use your own BugSnag API key, set the MCP_SERVER_BUGSNAG_API_KEY environment variable
const McpServerBugsnagAPIKey = process.env.MCP_SERVER_BUGSNAG_API_KEY;
if (McpServerBugsnagAPIKey) {
  Bugsnag.start(McpServerBugsnagAPIKey);
}

/**
 * Run server in STDIO mode (default)
 */
async function runStdioMode() {
  const server = new SmartBearMcpServer();

  // Setup clients from environment variables
  const clientsSetup = await setupClientsFromEnv(server, server.server);

  if (!clientsSetup) {
    console.error(getNoAuthErrorMessage());
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

/**
 * Run server in HTTP mode with SSE transport
 */
async function runHttpMode() {
  const PORT = process.env.PORT ? Number.parseInt(process.env.PORT) : 3000;
  const sessions = new Map<
    string,
    { server: SmartBearMcpServer; transport: SSEServerTransport }
  >();

  // Get dynamic list of allowed headers from registered clients
  const allowedAuthHeaders = clientRegistry.getHttpAuthHeaders();
  const allowedHeaders = [
    "Content-Type",
    "Authorization",
    ...allowedAuthHeaders,
  ].join(", ");

  const httpServer = createServer(
    async (req: IncomingMessage, res: ServerResponse) => {
      // Enable CORS
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", allowedHeaders);

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      const url = new URL(req.url || "/", `http://${req.headers.host}`);

      if (req.method === "GET" && url.pathname === "/sse") {
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
        sessions.set(transport.sessionId, { server, transport });

        // Handle connection close
        res.on("close", () => {
          sessions.delete(transport.sessionId);
        });

        // Connect server to transport (this also starts the transport automatically)
        await server.connect(transport);
      } else if (req.method === "POST" && url.pathname === "/message") {
        // Route message to appropriate session
        const sessionId = url.searchParams.get("sessionId");

        if (!sessionId) {
          res.writeHead(400, { "Content-Type": "text/plain" });
          res.end("Missing sessionId parameter");
          return;
        }

        const session = sessions.get(sessionId);
        if (!session) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Session not found");
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
            await session.transport.handlePostMessage(req, res, parsedBody);
          } catch (error) {
            console.error("Error handling POST message:", error);
            res.writeHead(500, { "Content-Type": "text/plain" });
            res.end("Internal server error");
          }
        });
      } else {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Not found");
      }
    },
  );

  httpServer.listen(PORT, () => {
    console.log(`[MCP HTTP Server] Listening on http://localhost:${PORT}`);
    console.log(
      `[MCP HTTP Server] Connect to SSE endpoint at http://localhost:${PORT}/sse`,
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

async function main() {
  // Configure which clients are enabled based on MCP_ENABLED_CLIENTS env var
  // If not set or empty, all clients are enabled
  // If set, should be comma-separated list of client names
  clientRegistry.configureEnabledClients();

  // Determine transport mode from environment variable
  // MCP_TRANSPORT can be "stdio" (default) or "http"
  const transportMode = process.env.MCP_TRANSPORT?.toLowerCase() || "stdio";

  if (transportMode === "http") {
    console.log("[MCP] Starting in HTTP mode...");
    await runHttpMode();
  } else if (transportMode === "stdio") {
    await runStdioMode();
  } else {
    console.error(
      `[MCP] Invalid transport mode: ${transportMode}. Use "stdio" or "http".`,
    );
    process.exit(1);
  }
}

try {
  await main();
} catch (error: unknown) {
  console.error("Fatal error in main():", error);
  process.exit(1);
}
