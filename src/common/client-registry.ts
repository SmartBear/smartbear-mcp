import process from "node:process";
import { type ZodType, ZodURL } from "zod";
import type { SmartBearMcpServer } from "./server.ts";
import type { Client } from "./types.ts";
import { fullyUnwrapZodType, isOptionalType } from "./zod-utils.ts";

/**
 * Central registry for all MCP clients
 * Add new clients here to make them automatically available
 */
class ClientRegistry {
  private entries: Client[] = [];
  private enabledClients: Set<string>;

  /**
   * Configure which clients should be enabled based on MCP_CLIENTS env var and MCP_TOOLSETS (to enable any referenced clients)
   * If not set or empty, all clients are enabled
   * If set, should be comma-separated list of client names (case-insensitive)
   */
  constructor() {
    let enabledClientsStr = "";
    if (process.env.MCP_CLIENTS) {
      enabledClientsStr = process.env.MCP_CLIENTS.trim();
    }
    enabledClientsStr += ",";
    if (process.env.MCP_TOOLSETS) {
      enabledClientsStr += process.env.MCP_TOOLSETS.trim();
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
   * Validate if a config option is an Allowed Endpoint URL
   * Supports both exact matches and regex patterns
   * Patterns starting with / and ending with / are treated as regex
   * @param zodType The Zod type definition for the config option
   * @param value The actual config value to validate
   */
  private validateAllowedEndpoint(zodType: ZodType, value: string): void {
    if (fullyUnwrapZodType(zodType) instanceof ZodURL) {
      const allowedEndpoints = process.env.MCP_ALLOWED_ENDPOINTS?.split(",");
      if (allowedEndpoints) {
        for (const endpoint of allowedEndpoints) {
          const trimmedEndpoint = endpoint.trim();

          // Check if this is a regex pattern (wrapped in /)
          if (
            trimmedEndpoint.startsWith("/") &&
            trimmedEndpoint.endsWith("/")
          ) {
            try {
              const pattern = trimmedEndpoint.slice(1, -1); // Remove leading/trailing /
              const regex = new RegExp(pattern);
              if (regex.test(value)) {
                return;
              }
            } catch (error) {
              console.warn(
                `Invalid regex pattern in MCP_ALLOWED_ENDPOINTS: ${trimmedEndpoint}, error: ${error}`,
              );
            }
          } else {
            // Exact match
            if (value === trimmedEndpoint) {
              return;
            }
          }
        }
        throw new Error(`URL ${value} is not allowed`);
      }
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
    entryLoop: for (const entry of this.getAll()) {
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
          continue entryLoop; // Skip configuring this client - missing required config
        }
      }
      await entry.configure(server, config);
      if (entry.isConfigured()) {
        await server.addClient(entry);
        configuredCount++;
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
