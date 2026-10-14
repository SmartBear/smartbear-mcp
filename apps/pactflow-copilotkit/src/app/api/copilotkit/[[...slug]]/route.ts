import { MCPAppsMiddleware } from "@ag-ui/mcp-apps-middleware";
import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
  InMemoryAgentRunner,
} from "@copilotkit/runtime/v2";
import { IntegrationExplorerAgent } from "@/lib/integration-explorer-agent";

const pactFlowHeaders = Object.fromEntries(
  [
    ["Pact-Broker-Base-Url", process.env.PACT_BROKER_BASE_URL],
    ["Pact-Broker-Token", process.env.PACT_BROKER_TOKEN],
    ["Pact-Broker-Username", process.env.PACT_BROKER_USERNAME],
    ["Pact-Broker-Password", process.env.PACT_BROKER_PASSWORD],
  ].filter(([, value]) => Boolean(value)),
);

const agent = new IntegrationExplorerAgent().use(
  new MCPAppsMiddleware({
    mcpServers: [
      {
        type: "http",
        url: process.env.SMARTBEAR_MCP_URL ?? "http://localhost:3000/mcp",
        serverId: "smartbear-mcp",
        headers: pactFlowHeaders,
      },
    ],
  }),
);

const runtime = new CopilotRuntime({
  agents: { default: agent },
  runner: new InMemoryAgentRunner(),
});

const handler = createCopilotRuntimeHandler({
  runtime,
  basePath: "/api/copilotkit",
});

export const GET = handler;
export const POST = handler;
export const PATCH = handler;
export const DELETE = handler;
