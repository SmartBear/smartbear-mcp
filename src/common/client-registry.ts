import { type ZodType, ZodURL } from "zod";
import { getEnv } from "./env.ts";
import type { SmartBearMcpServer } from "./server.ts";
import type { Client } from "./types.ts";
import { fullyUnwrapZodType, isOptionalType } from "./zod-utils.ts";

/**
 * Central registry for all MCP clients
 * Add new clients here to make them automatically available
 */
class ClientRegistry {
  private entries: Client[] = [];
  private readonly enabledClients: Set<string>;

  /**
   * Configure which clients should be enabled based on MCP_CLIENTS env var and MCP_TOOLSETS (to enable any referenced clients)
   * If not set or empty, all clients are enabled
   * If set, should be comma-separated list of client names (case-insensitive)
   */
  constructor() {
    let enabledClientsStr = "";
    const mcpClients = getEnv("MCP_CLIENTS");
    if (mcpClients) {
      enabledClientsStr = mcpClients.trim();
    }
    enabledClientsStr += ",";
    const mcpToolsets = getEnv("MCP_TOOLSETS");
    if (mcpToolsets) {
      enabledClientsStr += mcpToolsets.trim();
    }

    // Parse comma-separated list and normalize to lowercase for comparison
    this.enabledClients = new Set(
      enabledClientsStr
        .trim()
        .split(",")
        .map((name) => {
          if (name.includes(":")) {
            return name.split(":")[0].trim().toLowerCase();
          }
          return name.trim().toLowerCase();
        })
        .filter((name) => name.length > 0),
    );
  }

  /**
   * Check if a client is enabled based on client filtering configuration
   */
  private isClientEnabled(name: string): boolean {
    if (this.enabledClients.size === 0) {
      return true; // All clients enabled
    }
    return this.enabledClients.has(name.toLowerCase());
  }

  /**
   * Check a single allowed-endpoint entry (exact string or `/regex/` pattern)
   * against a config value.
   */
  private matchesAllowedEndpoint(
    trimmedEndpoint: string,
    value: string,
  ): boolean {
    const isRegexPattern =
      trimmedEndpoint.startsWith("/") && trimmedEndpoint.endsWith("/");
    if (!isRegexPattern) {
      return value === trimmedEndpoint;
    }
    try {
      const pattern = trimmedEndpoint.slice(1, -1); // Remove leading/trailing /
      return new RegExp(pattern).test(value);
    } catch (error) {
      // No injectable logger on this class; this is an operator-facing
      // misconfiguration warning (invalid regex in an env var), not debug output.
      // biome-ignore lint/suspicious/noConsole: see above
      console.warn(
        `Invalid regex pattern in MCP_ALLOWED_ENDPOINTS: ${trimmedEndpoint}, error: ${error}`,
      );
      return false;
    }
  }

  /**
   * Validate if a config option is an Allowed Endpoint URL
   * Supports both exact matches and regex patterns
   * Patterns starting with / and ending with / are treated as regex
   * @param zodType The Zod type definition for the config option
   * @param value The actual config value to validate
   */
  private validateAllowedEndpoint(zodType: ZodType, value: string): void {
    if (!(fullyUnwrapZodType(zodType) instanceof ZodURL)) {
      return;
    }
    const allowedEndpoints = getEnv("MCP_ALLOWED_ENDPOINTS")?.split(",");
    if (!allowedEndpoints) {
      return;
    }
    const isAllowed = allowedEndpoints.some((endpoint) =>
      this.matchesAllowedEndpoint(endpoint.trim(), value),
    );
    if (!isAllowed) {
      throw new Error(`URL ${value} is not allowed`);
    }
  }

  /**
   * Register a client class
   * @param name Display name for the client (for logging)
   */
  register(client: Client): void {
    this.entries.push(client);
  }

  /**
   * Get all registered clients (filtered by MCP_CLIENTS if configured)
   */
  getAll(): Client[] {
    return this.entries.filter((entry) => this.isClientEnabled(entry.name));
  }

  /**
   * Build the config object for a single client entry.
   * @returns The config, or `null` if a required config value is missing (the
   * client should be skipped).
   */
  private buildClientConfig(
    entry: Client,
    getConfigValue: (client: Client, key: string) => string | null,
    ignoreMissingRequiredConfigs: boolean,
  ): Record<string, string> | null {
    const config: Record<string, string> = {};
    for (const configKey of Object.keys(entry.config.shape)) {
      const value = getConfigValue(entry, configKey);
      if (value !== null) {
        // validate if a config option is an Allowed Endpoint URL
        this.validateAllowedEndpoint(entry.config.shape[configKey], value);
        config[configKey] = value;
      } else if (
        !(
          ignoreMissingRequiredConfigs ||
          isOptionalType(entry.config.shape[configKey])
        )
      ) {
        // Missing required config - skip configuring this client.
        return null;
      }
    }
    return config;
  }

  /**
   * Configures all enabled clients on the given MCP server
   * @param server The MCP server on which the client is registered
   * @param getConfigValue A function that obtains a configuration value for the given client and requirement name
   * @returns The number of clients successfully configured
   */
  async configure(
    server: SmartBearMcpServer,
    getConfigValue: (client: Client, key: string) => string | null,
    ignoreMissingRequiredConfigs = false,
  ): Promise<number> {
    let configuredCount = 0;
    // Clients are configured sequentially (not Promise.all) so that
    // `server.addClient` registration order — and therefore tool/prompt/resource
    // registration order — stays deterministic and matches the client registry order.
    for (const entry of this.getAll()) {
      const config = this.buildClientConfig(
        entry,
        getConfigValue,
        ignoreMissingRequiredConfigs,
      );
      if (config !== null) {
        // biome-ignore lint/performance/noAwaitInLoops: sequential registration order required
        await entry.configure(server, config);
        if (entry.isConfigured()) {
          await server.addClient(entry);
          configuredCount += 1;
        }
      }
    }
    return configuredCount;
  }

  /**
   * Clear all registrations (useful for testing)
   */
  clear(): void {
    this.entries = [];
  }
}

// Create and export the singleton registry
export const clientRegistry = new ClientRegistry();
