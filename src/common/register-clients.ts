/**
 * Client registration module
 *
 * This file registers all available MCP clients with the client registry.
 * To add a new client:
 * 1. Import the client class
 * 2. Call clientRegistry.register() with the client details
 * 3. Specify if the client needs the MCP server instance or async initialization
 */

import { ApiHubClient } from "../api-hub/client.js";
import { BugsnagClient } from "../bugsnag/client.js";
import { PactflowClient } from "../pactflow/client.js";
import { QmetryClient } from "../qmetry/client.js";
import { ReflectClient } from "../reflect/client.js";
import { ZephyrClient } from "../zephyr/client.js";
import { clientRegistry } from "./client-registry.js";

// Register Reflect client
clientRegistry.register("Reflect", ReflectClient);

// Register Bugsnag client (needs async initialization)
clientRegistry.register("BugSnag", BugsnagClient, { asyncInit: true });

// Register API Hub client
clientRegistry.register("API Hub", ApiHubClient);

// Register PactFlow/Pact Broker client (needs MCP server instance)
clientRegistry.register("PactFlow/Pact Broker", PactflowClient, {
  needsMcpServer: true,
});

// Register QMetry client
clientRegistry.register("QMetry", QmetryClient);

// Register Zephyr client
clientRegistry.register("Zephyr", ZephyrClient);
