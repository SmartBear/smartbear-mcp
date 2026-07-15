import z from "zod";
import { getRequestHeader } from "../common/request-context.ts";
import type { SmartBearMcpServer } from "../common/server.ts";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.ts";
import {
  API_CONFIG,
  CLIENT_CONFIG,
  CONFIG_KEYS,
  ERROR_MESSAGES,
  SCHEMA_DESCRIPTIONS,
} from "./config/constants.ts";
import { ApiClient } from "./http/api-client.ts";
import { ResolverRegistry } from "./resolver/resolver-registry.ts";

/**
 * Configuration schema for QTM4J client
 */
const ConfigurationSchema = z.object({
  [CONFIG_KEYS.API_KEY]: z.string().describe(SCHEMA_DESCRIPTIONS.API_KEY),
  [CONFIG_KEYS.AUTOMATION_API_KEY]: z
    .string()
    .optional()
    .describe(SCHEMA_DESCRIPTIONS.AUTOMATION_API_KEY),
  [CONFIG_KEYS.BASE_URL]: z
    .string()
    .url()
    .optional()
    .default(API_CONFIG.DEFAULT_BASE_URL)
    .describe(SCHEMA_DESCRIPTIONS.BASE_URL),
});

/**
 * QTM4J Client
 *
 * Provides integration with QTM4J (QMetry Test Management for Jira) REST API.
 * Handles authentication, tool registration, and API communication.
 *
 * Features:
 * - API Key based authentication
 * - Request-scoped credentials support (via headers: Qtm4j-Api-Key, apiKey, Authorization)
 * - Extensible tool registration system
 * - Support for custom base URLs
 * - Multi-tenant support with per-request API keys
 *
 * Example Configuration:
 * ```json
 * {
 *   "qtm4j": {
 *     "api_key": "your-api-key-here",
 *     "base_url": "https://qtmcloud.qmetry.com"
 *   }
 * }
 * ```
 *
 * Request-Scoped Credentials:
 * You can override the configured API key on a per-request basis by providing
 * one of these headers: Qtm4j-Api-Key, apiKey, or Authorization (Bearer token)
 */
export class Qtm4jClient implements Client {
  name = CLIENT_CONFIG.NAME;
  capabilityPrefix = CLIENT_CONFIG.TOOL_PREFIX;
  configPrefix = CLIENT_CONFIG.CONFIG_PREFIX;
  config = ConfigurationSchema;

  private _apiKey: string | undefined;
  private _automationApiKey: string | undefined;
  private baseUrl: string = API_CONFIG.DEFAULT_BASE_URL;
  private apiClient: ApiClient | undefined;
  private resolverRegistry: ResolverRegistry | undefined;

  /**
   * Configure the QTM4J client with API credentials
   * @param server - MCP Server instance
   * @param config - Configuration object containing API key and optional base URL
   */
  async configure(
    server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
  ): Promise<void> {
    this._apiKey = config[CONFIG_KEYS.API_KEY];
    this._automationApiKey = config[CONFIG_KEYS.AUTOMATION_API_KEY];
    if (config[CONFIG_KEYS.BASE_URL]) {
      this.baseUrl = config[CONFIG_KEYS.BASE_URL];
    }

    // Initialize API client with regular and automation token providers
    this.apiClient = new ApiClient(
      () => this.getAuthToken(),
      this.baseUrl,
      () => this.getAutomationApiKey(),
    );

    // Initialize resolver registry with the API client and shared cache
    this.resolverRegistry = new ResolverRegistry(
      this.apiClient,
      server.getCache(),
    );
  }

  /**
   * Get authentication token with request-scoped override support
   * Checks request headers first, then falls back to configured API key
   * @returns API key or null if not found
   */
  getAuthToken(): string | null {
    // 1. Try request context headers
    const contextHeader =
      getRequestHeader("Qtm4j-Api-Key") ||
      getRequestHeader("apiKey") ||
      getRequestHeader("Authorization");

    if (contextHeader) {
      let token = Array.isArray(contextHeader)
        ? contextHeader[0]
        : contextHeader;

      // Handle Bearer prefix if present
      if (token.startsWith("Bearer ")) {
        token = token.substring(7);
      }
      return token;
    }

    // 2. Fallback to configured API key
    return this._apiKey || null;
  }

  getAutomationApiKey(): string | null {
    const headerKey = getRequestHeader("Qtm4j-Automation-Api-Key");
    if (headerKey) {
      return Array.isArray(headerKey) ? headerKey[0] : headerKey;
    }
    return this._automationApiKey || null;
  }

  /**
   * Check if the client is properly configured
   * @returns true if API key is set and client is ready
   */
  isConfigured(): boolean {
    return this.apiClient !== undefined;
  }

  /**
   * Get the configured API client instance
   * @returns ApiClient instance
   * @throws Error if client is not configured
   */
  getApiClient(): ApiClient {
    if (!this.apiClient) {
      throw new Error(ERROR_MESSAGES.CLIENT_NOT_CONFIGURED);
    }
    return this.apiClient;
  }

  getResolverRegistry(): ResolverRegistry {
    if (!this.resolverRegistry) {
      throw new Error(ERROR_MESSAGES.CLIENT_NOT_CONFIGURED);
    }
    return this.resolverRegistry;
  }

  requireProjectContext() {
    return this.getResolverRegistry().requireProjectContext();
  }

  /**
   * Register all QTM4J tools with the MCP server
   *
   * This method creates tool instances and registers them with the MCP server.
   * Each tool is prefixed with 'qtm4j_' (e.g., qtm4j_get_projects)
   *
   * @param register - Function to register tools with MCP server
   * @param _getInput - Function to get user input (not used currently)
   */
  async registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): Promise<void> {
    const { GetProjects } = await import("./tool/project/get-projects.ts");
    const { SetProjectContext } = await import(
      "./tool/project/set-project-context.ts"
    );
    const { CreateTestCase } = await import(
      "./tool/test-case/create-test-case.ts"
    );
    const { GetTestCases } = await import("./tool/test-case/get-test-cases.ts");
    const { GetTestSteps } = await import("./tool/test-case/get-test-steps.ts");
    const { UpdateTestCase } = await import(
      "./tool/test-case/update-test-case.ts"
    );
    const { UploadAutomationResult } = await import(
      "./tool/test-automation/upload-automation-result.ts"
    );
    const { GetAutomationHistory } = await import(
      "./tool/test-automation/get-automation-history.ts"
    );

    const { CreateTestCycle } = await import(
      "./tool/test-cycle/create-test-cycle.ts"
    );
    const { SearchTestCycles } = await import(
      "./tool/test-cycle/search-test-cycle.ts"
    );
    const { UpdateTestCycle } = await import(
      "./tool/test-cycle/update-test-cycle.ts"
    );

    const { LinkRequirements } = await import(
      "./tool/test-case/link-requirements.ts"
    );
    const { UnlinkRequirements } = await import(
      "./tool/test-case/unlink-requirements.ts"
    );
    const { LinkTestCasesToRequirement } = await import(
      "./tool/requirement/link-testcases.ts"
    );
    const { UnlinkTestCasesFromRequirement } = await import(
      "./tool/requirement/unlink-testcases.ts"
    );
    const { GetLinkedRequirements } = await import(
      "./tool/test-case/get-linked-requirements.ts"
    );
    const { GetLinkedTestCasesForRequirement } = await import(
      "./tool/requirement/get-linked-testcases.ts"
    );
    const { LinkTestCasesToCycle } = await import(
      "./tool/test-cycle/link-testcases.ts"
    );
    const { UnlinkTestCasesFromCycle } = await import(
      "./tool/test-cycle/unlink-testcases.ts"
    );
    const { SearchLinkedTestCasesInCycle } = await import(
      "./tool/test-cycle/search-linked-testcases.ts"
    );
    const { LinkRequirementsToCycle } = await import(
      "./tool/test-cycle/link-requirements.ts"
    );
    const { UnlinkRequirementsFromCycle } = await import(
      "./tool/test-cycle/unlink-requirements.ts"
    );
    const { GetLinkedRequirementsForCycle } = await import(
      "./tool/test-cycle/get-linked-requirements.ts"
    );

    const tools = [
      new GetProjects(this),
      new SetProjectContext(this),
      new CreateTestCase(this),
      new GetTestCases(this),
      new GetTestSteps(this),
      new UpdateTestCase(this),
      new CreateTestCycle(this),
      new SearchTestCycles(this),
      new UpdateTestCycle(this),
      new UploadAutomationResult(this),
      new GetAutomationHistory(this),
      new LinkRequirements(this),
      new UnlinkRequirements(this),
      new LinkTestCasesToRequirement(this),
      new UnlinkTestCasesFromRequirement(this),
      new GetLinkedRequirements(this),
      new GetLinkedTestCasesForRequirement(this),
      new LinkTestCasesToCycle(this),
      new UnlinkTestCasesFromCycle(this),
      new SearchLinkedTestCasesInCycle(this),
      new LinkRequirementsToCycle(this),
      new UnlinkRequirementsFromCycle(this),
      new GetLinkedRequirementsForCycle(this),
    ];

    // Register each tool with the MCP server
    for (const tool of tools) {
      register(tool.specification, tool.handle);
    }
  }
}
