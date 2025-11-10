#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ApiHubClient } from "./api-hub/client.js";
import { BugsnagClient } from "./bugsnag/client.js";
import { CollaboratorClient } from "./collaborator/client.js";
import Bugsnag from "./common/bugsnag.js";
import { SmartBearMcpServer } from "./common/server.js";
import { PactflowClient } from "./pactflow/client.js";
import { QmetryClient } from "./qmetry/client.js";
import { ReflectClient } from "./reflect/client.js";
import { ZephyrClient } from "./zephyr/client.js";

// This is used to report errors in the MCP server itself
// If you want to use your own BugSnag API key, set the MCP_SERVER_BUGSNAG_API_KEY environment variable
const McpServerBugsnagAPIKey = process.env.MCP_SERVER_BUGSNAG_API_KEY;
if (McpServerBugsnagAPIKey) {
  Bugsnag.start(McpServerBugsnagAPIKey);
}

async function main() {
  const server = new SmartBearMcpServer();

  const reflectToken = process.env.REFLECT_API_TOKEN;
  const bugsnagToken = process.env.BUGSNAG_AUTH_TOKEN;
  const apiHubToken = process.env.API_HUB_API_KEY;
  const pactBrokerToken = process.env.PACT_BROKER_TOKEN;
  const pactBrokerUrl = process.env.PACT_BROKER_BASE_URL;
  const pactBrokerUsername = process.env.PACT_BROKER_USERNAME;
  const pactBrokerPassword = process.env.PACT_BROKER_PASSWORD;
  const qmetryToken = process.env.QMETRY_API_KEY;
  const qmetryBaseUrl = process.env.QMETRY_BASE_URL;
  const zephyrToken = process.env.ZEPHYR_API_TOKEN;
  const zephyrBaseUrl = process.env.ZEPHYR_BASE_URL;
  const collaboratorBaseUrl = process.env.COLLAB_BASE_URL;
  const collaboratorUsername = process.env.COLLAB_USERNAME;
  const collaboratorLoginTicket = process.env.COLLAB_LOGIN_TICKET;

  let client_defined = false;

  if (reflectToken) {
    server.addClient(new ReflectClient(reflectToken));
    client_defined = true;
  }

  if (bugsnagToken) {
    const bugsnagClient = new BugsnagClient(
      bugsnagToken,
      process.env.BUGSNAG_PROJECT_API_KEY,
      process.env.BUGSNAG_ENDPOINT,
    );
    await bugsnagClient.initialize();
    server.addClient(bugsnagClient);
    client_defined = true;
  }

  if (apiHubToken) {
    server.addClient(new ApiHubClient(apiHubToken));
    client_defined = true;
  }

  if (pactBrokerUrl) {
    if (pactBrokerToken) {
      server.addClient(
        new PactflowClient(
          pactBrokerToken,
          pactBrokerUrl,
          "pactflow",
          server.server,
        ),
      );
      client_defined = true;
    } else if (pactBrokerUsername && pactBrokerPassword) {
      server.addClient(
        new PactflowClient(
          { username: pactBrokerUsername, password: pactBrokerPassword },
          pactBrokerUrl,
          "pact_broker",
          server.server,
        ),
      );
      client_defined = true;
    } else {
      console.error(
        "If the Pact Broker base URL is specified, you must specify either (a) a PactFlow token, or (b) a Pact Broker username and password pair.",
      );
    }
  }

  if (qmetryToken) {
    server.addClient(new QmetryClient(qmetryToken, qmetryBaseUrl));
    client_defined = true;
  }

  if (zephyrToken) {
    server.addClient(new ZephyrClient(zephyrToken, zephyrBaseUrl));
    client_defined = true;
  }

  if (collaboratorBaseUrl && collaboratorUsername && collaboratorLoginTicket) {
    server.addClient(
      new CollaboratorClient(
        collaboratorBaseUrl,
        collaboratorUsername,
        collaboratorLoginTicket,
      ),
    );
    client_defined = true;
  }

  if (!client_defined) {
    console.error(
      "No SmartBear products were configured. Please provide at least one of the required configuration options.",
    );
    process.exit(1);
  }

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
