/**
 * Client registration module
 *
 * This file registers all available MCP clients with the client registry.
 * To add a new client:
 * 1. Import the client class
 * 2. Call clientRegistry.register() with the client details
 * 3. Specify if the client needs the MCP server instance or async initialization
 */

import { AlertSiteClient } from "../alertsite/client.js";
import { BugsnagClient } from "../bugsnag/client.js";
import { CollaboratorClient } from "../collaborator/client.js";
import { PactflowClient } from "../pactflow/client.js";
import { QmetryClient } from "../qmetry/client.js";
import { ReflectClient } from "../reflect/client.js";
import { SwaggerClient } from "../swagger/client.js";
import { ZephyrClient } from "../zephyr/client.js";
import { clientRegistry } from "./client-registry.js";

// Register Reflect client
clientRegistry.register(new ReflectClient());

// Register Bugsnag client
clientRegistry.register(new BugsnagClient());

// Register Swagger client
clientRegistry.register(new SwaggerClient());

// Register PactFlow/Pact Broker client
clientRegistry.register(new PactflowClient());

// Register QMetry client
clientRegistry.register(new QmetryClient());

// Register Zephyr client
clientRegistry.register(new ZephyrClient());

// Register Collaborator client
clientRegistry.register(new CollaboratorClient());

// Register AlertSite client
clientRegistry.register(new AlertSiteClient());
