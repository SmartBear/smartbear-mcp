/**
 * Client registration module
 *
 * This file registers all available MCP clients with the client registry.
 * To add a new client:
 * 1. Import the client class
 * 2. Call clientRegistry.register() with the client details
 * 3. Specify if the client needs the MCP server instance or async initialization
 */

import { BearQClient } from "../bearq/client.ts";
import { BugsnagClient } from "../bugsnag/client.ts";
import { CollaboratorClient } from "../collaborator/client.ts";
import { PactflowClient } from "../pactflow/client.ts";
import { QmetryClient } from "../qmetry/client.ts";
import { Qtm4jClient } from "../qtm4j/client.ts";
import { ReflectClient } from "../reflect/client.ts";
import { SwaggerClient } from "../swagger/client/index.ts";
import { ZephyrClient } from "../zephyr/client.ts";
import { clientRegistry } from "./client-registry.ts";

// Register BearQ client
clientRegistry.register(new BearQClient());

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

// Register QTM4J client
clientRegistry.register(new Qtm4jClient());

// Register Collaborator client
clientRegistry.register(new CollaboratorClient());
