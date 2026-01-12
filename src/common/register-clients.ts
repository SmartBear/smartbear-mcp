/**
 * Client registration module
 *
 * This file registers all available MCP clients with the client registry.
 * To add a new client:
 * 1. Import the client class
 * 2. Call clientRegistry.register() with the client details
 * 3. Specify if the client needs the MCP server instance or async initialization
 */

import { BugsnagClient } from "../bugsnag/client";
import { CollaboratorClient } from "../collaborator/client";
import { PactflowClient } from "../pactflow/client";
import { QmetryClient } from "../qmetry/client";
import { ReflectClient } from "../reflect/client";
import { SwaggerClient } from "../swagger/client";
import { ZephyrClient } from "../zephyr/client";
import { clientRegistry } from "./client-registry";

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
