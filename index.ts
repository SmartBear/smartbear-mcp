#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import Bugsnag from "./common/bugsnag.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./common/info.js";
import { InsightHubClient } from "./insight-hub/client.js";
import { ReflectClient } from "./reflect/client.js";
import { SwaggerHubClient } from "./swaggerhub-portal/client.js";

// This is used to report errors in the MCP server itself
// If you want to use your own BugSnag API key, set the MCP_SERVER_INSIGHT_HUB_API_KEY environment variable
const McpServerBugsnagAPIKey = process.env.MCP_SERVER_INSIGHT_HUB_API_KEY;
if (McpServerBugsnagAPIKey) {
  Bugsnag.start(McpServerBugsnagAPIKey);
}

async function main() {
  const server = new McpServer(
    {
      name: MCP_SERVER_NAME,
      version: MCP_SERVER_VERSION,
    },
    {
      capabilities: {
        resources: { listChanged: true }, // Server supports dynamic resource lists
        tools: { listChanged: true }, // Server supports dynamic tool lists
      },
    },
  );

  const reflectToken = process.env.REFLECT_API_TOKEN;
  const insightHubToken = process.env.INSIGHT_HUB_AUTH_TOKEN;
  const swaggerHubToken = process.env.SWAGGER_HUB_API_KEY;

  if (!reflectToken && !insightHubToken && !swaggerHubToken) {
    console.error(
      "Please set one of REFLECT_API_TOKEN, INSIGHT_HUB_AUTH_TOKEN or SWAGGER_HUB_API_KEY environment variables",
    );
    process.exit(1);
  }

  if (reflectToken) {
    const reflectClient = new ReflectClient(reflectToken);
    reflectClient.registerTools(server);
    reflectClient.registerResources(server);
  }

  if (insightHubToken) {
    const insightHubClient = new InsightHubClient(insightHubToken);
    insightHubClient.registerTools(server);
    insightHubClient.registerResources(server);
  }

  if (swaggerHubToken) {
    const swaggerHubClient = new SwaggerHubClient(swaggerHubToken);
    swaggerHubClient.registerTools(server);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
