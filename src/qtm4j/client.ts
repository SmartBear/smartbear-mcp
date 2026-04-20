import z from "zod";
import { getRequestHeader } from "../common/request-context";
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
  toolPrefix = CLIENT_CONFIG.TOOL_PREFIX;
  configPrefix = CLIENT_CONFIG.CONFIG_PREFIX;
  config = ConfigurationSchema;

  private _apiKey: string | undefined;
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
    this._apiKey = config[CONFIG_KEYS.API_KEY];
    if (config[CONFIG_KEYS.BASE_URL]) {
      this.baseUrl = config[CONFIG_KEYS.BASE_URL];
    }

    // Initialize API client with token provider for request-scoped credentials
    this.apiClient = new ApiClient(() => this.getAuthToken(), this.baseUrl);
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
