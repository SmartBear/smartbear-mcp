import { clientRegistry } from "./client-registry";
import { getEnvVarName, getHeaderName } from "./config-names";
import type { SmartBearMcpServer } from "./server";
import { getTypeDescription, isOptionalType } from "./zod-utils";

export const LIST_INTEGRATIONS_TOOL_NAME = "smartbear_list_integrations";

/**
 * One-line description per product, keyed by `Client.name`.
 * Update this map whenever a new product client is added; a missing entry
 * falls back to a generic line and is caught by list-integrations.test.ts.
 */
export const INTEGRATION_DESCRIPTIONS: Record<string, string> = {
  BugSnag: "Error monitoring and stability data for your applications.",
  Swagger: "API design, hosting and governance with SwaggerHub.",
  "Contract Testing":
    "Consumer-driven contract testing and can-i-deploy checks with PactFlow.",
  QMetry: "Test case management and execution with QMetry.",
  QTM4J: "Test case management and execution in Jira with QMetry QTM4J.",
  Zephyr: "Test case management and execution tracking.",
  Reflect: "No-code web test automation and test runs.",
  BearQ: "AI-driven test creation and execution.",
  Collaborator: "Peer code and document review.",
};

export interface IntegrationToolset {
  name: string;
  toolCount: number;
  enabled: boolean;
}

export interface IntegrationSetupField {
  envVar: string;
  header: string;
  required: boolean;
  description: string;
}

export type IntegrationEntry =
  | {
      product: string;
      description: string;
      configured: true;
      toolCount: number;
      toolsets: IntegrationToolset[];
    }
  | {
      product: string;
      description: string;
      configured: false;
      setup: IntegrationSetupField[];
    };

/**
 * Build the integrations report from already-loaded metadata only: the full
 * catalog from the registry, and the clients actually added to this server.
 * Makes no network calls and never depends on any product being configured.
 */
export function buildIntegrationsReport(server: SmartBearMcpServer): {
  integrations: IntegrationEntry[];
} {
  const added = server.getClients();
  const integrations = clientRegistry.getAll().map((catalogClient) => {
    const product = catalogClient.name;
    const description =
      INTEGRATION_DESCRIPTIONS[product] ?? "No description available.";
    // Catalog entries are templates (each session configures a clone), so
    // configuration state comes from the client this server actually holds.
    const active = added.find((c) => c.name === product);

    if (active?.isConfigured()) {
      const toolsets = server.getToolsetStats(product);
      return {
        product,
        description,
        configured: true as const,
        toolCount: toolsets.reduce(
          (sum, ts) => sum + (ts.enabled ? ts.toolCount : 0),
          0,
        ),
        toolsets,
      };
    }

    return {
      product,
      description,
      configured: false as const,
      setup: Object.entries(catalogClient.config.shape).map(([key, type]) => ({
        envVar: getEnvVarName(catalogClient.configPrefix, key),
        header: getHeaderName(catalogClient.configPrefix, key),
        required: !isOptionalType(type),
        description: getTypeDescription(type) ?? "",
      })),
    };
  });
  return { integrations };
}
