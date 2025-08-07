#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import Bugsnag from "./common/bugsnag.js";
import { InsightHubClient } from "./insight-hub/client.js";
import { ReflectClient } from "./reflect/client.js";
import { ApiHubClient } from "./api-hub/client.js";
import { SmartBearMcpServer } from "./common/server.js";
import { PactflowClient } from "./pactflow/client.js";

// This is used to report errors in the MCP server itself
// If you want to use your own BugSnag API key, set the MCP_SERVER_INSIGHT_HUB_API_KEY environment variable
const McpServerBugsnagAPIKey = process.env.MCP_SERVER_INSIGHT_HUB_API_KEY;
if (McpServerBugsnagAPIKey) {
  Bugsnag.start(McpServerBugsnagAPIKey);
}

async function main() {
  const server = new SmartBearMcpServer();

  const reflectToken = process.env.REFLECT_API_TOKEN;
  const insightHubToken = process.env.INSIGHT_HUB_AUTH_TOKEN;
  const apiHubToken = process.env.API_HUB_API_KEY;
  const pactBrokerToken = process.env.PACT_BROKER_TOKEN;
  const pactBrokerUrl = process.env.PACT_BROKER_BASE_URL;
  // const pactBrokerUsername = process.env.PACT_BROKER_USERNAME;
  // const pactBrokerPassword = process.env.PACT_BROKER_PASSWORD;

  if (reflectToken) {
    server.addClient(new ReflectClient(reflectToken));
  }

  if (insightHubToken) {
    const insightHubClient = new InsightHubClient(
      insightHubToken,
      process.env.INSIGHT_HUB_PROJECT_API_KEY,
      process.env.INSIGHT_HUB_ENDPOINT
    );
    await insightHubClient.initialize();
    server.addClient(insightHubClient);
  }

 if(apiHubToken) {
    server.addClient(new ApiHubClient(apiHubToken));

  }


  if(pactBrokerToken && pactBrokerUrl) {    
    const pactFlowClient = new PactflowClient(pactBrokerToken, pactBrokerUrl, "pactflow");
    pactFlowClient.registerTools(server);
    server.addClient(pactFlowClient);

  }

  // Once PactBroker tools are implemented, we can uncomment this
  // if(pactBrokerUrl && pactBrokerUsername && pactBrokerPassword){
  //   const pactBrokerClient = new PactflowClient({ username: pactBrokerUsername, password: pactBrokerPassword }, pactBrokerUrl, "pactbroker");
  //   pactBrokerClient.registerTools(server);
  // }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
