import z from "zod";
import type { SmartBearMcpServer } from "../common/server";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types";
import {
  API_CONFIG,
  CLIENT_CONFIG,
  CONFIG_KEYS,
  ERROR_MESSAGES,
  SCHEMA_DESCRIPTIONS,
} from "./config/constants";
import { ApiClient } from "./http/api-client";
import { ResolverRegistry } from "./resolver/resolver-registry";

/**
 * Configuration schema for QTM4J client
 */
const ConfigurationSchema = z.object({
  [CONFIG_KEYS.BASE_URL]: z
    .string()
    .url()
    .optional()
    .default(API_CONFIG.DEFAULT_BASE_URL)
    .describe(SCHEMA_DESCRIPTIONS.BASE_URL),
});

const AuthenticationSchema = z.object({
  api_key: z.string().describe(SCHEMA_DESCRIPTIONS.API_KEY).optional(),
  automation_api_key: z
    .string()
    .describe(SCHEMA_DESCRIPTIONS.AUTOMATION_API_KEY)
    .optional(),
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
  authenticationFields = AuthenticationSchema;

  private server?: SmartBearMcpServer;
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
    this.server = server;
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
   * Check if the client is properly configured
   * @returns true if API key is set and client is ready
   */
  isConfigured(): boolean {
    return !!this.apiClient;
  }

  hasAuth(): boolean {
    return this.isConfigured() && !!this.getAuthToken();
  }

  getAuthToken(): string | null {
    return (
      this.server?.getEnv(CONFIG_KEYS.API_KEY, this) ||
      this.server?.getEnv("Authorization") ||
      null
    );
  }

  getAutomationApiKey(): string | null {
    return this.server?.getEnv(CONFIG_KEYS.AUTOMATION_API_KEY, this) || null;
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
    const { GetProjects } = await import("./tool/project/get-projects");
    const { SetProjectContext } = await import(
      "./tool/project/set-project-context"
    );
    const { CreateTestCase } = await import(
      "./tool/test-case/create-test-case"
    );
    const { GetTestCases } = await import("./tool/test-case/get-test-cases");
    const { GetTestSteps } = await import("./tool/test-case/get-test-steps");
    const { UpdateTestCase } = await import(
      "./tool/test-case/update-test-case"
    );
    const { UploadAutomationResult } = await import(
      "./tool/test-automation/upload-automation-result"
    );
    const { GetAutomationHistory } = await import(
      "./tool/test-automation/get-automation-history"
    );

    const { CreateTestCycle } = await import(
      "./tool/test-cycle/create-test-cycle"
    );
    const { SearchTestCycles } = await import(
      "./tool/test-cycle/search-test-cycle"
    );
    const { UpdateTestCycle } = await import(
      "./tool/test-cycle/update-test-cycle"
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
    ];

    // Register each tool with the MCP server
    for (const tool of tools) {
      register(tool.specification, tool.handle);
    }
  }
}
