/**
 * Client registration module
 *
 * This file registers all available MCP clients with the client registry.
 * To add a new client:
 * Add a loader keyed by the client's name so disabled products are not imported.
 */

import { clientRegistry } from "./client-registry";
import type { Client } from "./types";

const clientLoaders: Record<string, () => Promise<Client>> = {
  BearQ: async () => new (await import("../bearq/client")).BearQClient(),
  Reflect: async () => new (await import("../reflect/client")).ReflectClient(),
  BugSnag: async () => new (await import("../bugsnag/client")).BugsnagClient(),
  Swagger: async () => new (await import("../swagger/client")).SwaggerClient(),
  "Contract Testing": async () =>
    new (await import("../pactflow/client")).PactflowClient(),
  QMetry: async () => new (await import("../qmetry/client")).QmetryClient(),
  Zephyr: async () => new (await import("../zephyr/client")).ZephyrClient(),
  QTM4J: async () => new (await import("../qtm4j/client")).Qtm4jClient(),
  Collaborator: async () =>
    new (await import("../collaborator/client")).CollaboratorClient(),
};

for (const [name, loadClient] of Object.entries(clientLoaders)) {
  if (clientRegistry.isClientEnabled(name)) {
    clientRegistry.register(await loadClient());
  }
}
