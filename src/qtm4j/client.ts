import z from "zod";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types";
import { ApiClient } from "./common/api-client";
import {
  API_CONFIG,
  CLIENT_CONFIG,
  CONFIG_KEYS,
  ERROR_MESSAGES,
  SCHEMA_DESCRIPTIONS,
} from "./common/constants";

/**
 * Configuration schema for QTM4J client
 */
const ConfigurationSchema = z.object({
  [CONFIG_KEYS.API_KEY]: z.string().describe(SCHEMA_DESCRIPTIONS.API_KEY),
  [CONFIG_KEYS.BASE_URL]: z
    .string()
    .url()
    .optional()
    .default(API_CONFIG.DEFAULT_BASE_URL)
    .describe(SCHEMA_DESCRIPTIONS.BASE_URL),
});

/**
 * Session context for storing resolved entity mappings
 * Reduces API calls by caching key-to-ID resolutions
 */
export interface SessionContext {
  // Map of entity type to (key -> id) mapping
  // Example: { "project": { "HAR": 10067, "SCRUM": 10000 } }
  entities: Map<string, Map<string, number>>;

  // Current default project ID (optional)
  currentProjectId?: number;
}

/**
 * QTM4J Client
 *
 * Provides integration with QTM4J (QMetry Test Management for Jira) REST API.
 * Handles authentication, tool registration, and API communication.
 *
 * Features:
 * - API Key based authentication
 * - Extensible tool registration system
 * - Support for custom base URLs
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
 */
export class Qtm4jClient implements Client {
  name = CLIENT_CONFIG.NAME;
  toolPrefix = CLIENT_CONFIG.TOOL_PREFIX;
  configPrefix = CLIENT_CONFIG.CONFIG_PREFIX;
  config = ConfigurationSchema;

  private apiKey: string | undefined;
  private baseUrl: string = API_CONFIG.DEFAULT_BASE_URL;
  private apiClient: ApiClient | undefined;

  /**
   * Configure the QTM4J client with API credentials
   * @param _server - MCP Server instance (not used currently)
   * @param config - Configuration object containing API key and optional base URL
   * @param _cache - Cache service instance (not used currently)
   */
  async configure(
    _server: any,
    config: z.infer<typeof ConfigurationSchema>,
    _cache?: any,
  ): Promise<void> {
    this.apiKey = config[CONFIG_KEYS.API_KEY];
    if (config[CONFIG_KEYS.BASE_URL]) {
      this.baseUrl = config[CONFIG_KEYS.BASE_URL];
    }

    // Initialize API client with credentials
    this.apiClient = new ApiClient(this.apiKey, this.baseUrl);
  }

  /**
   * Check if the client is properly configured
   * @returns true if API key is set and client is ready
   */
  isConfigured(): boolean {
    return this.apiKey !== undefined && this.apiClient !== undefined;
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

  /**
   * Register all QTM4J tools with the MCP server
   *
   * This method creates tool instances and registers them with the MCP server.
   * Each tool is prefixed with 'qtm4j_' (e.g., qtm4j_search_test_cases)
   *
   * Tools are wrapped with auto-resolution middleware that automatically converts
   * entity names (like projectKey) to IDs (like projectId) when needed.
   *
   * @param register - Function to register tools with MCP server
   * @param _getInput - Function to get user input (not used currently)
   */
  async registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): Promise<void> {
    // Import tools dynamically
    const { GetProjects } = await import("./tool/project/get-projects");

    // Create tool instances
    const tools = [new GetProjects(this)];

    // Register each tool with the MCP server
    for (const tool of tools) {
      register(tool.specification, tool.handle);
    }
  }
}
