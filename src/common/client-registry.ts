import { ZodError, type ZodType, ZodURL } from "zod";
import type { SmartBearMcpServer } from "./server";
import type { Client, GetEnvFn } from "./types";
import { fullyUnwrapZodType, isOptionalType } from "./zod-utils";

/**
 * Central registry for all MCP clients
 * Add new clients here to make them automatically available
 */
class ClientRegistry {
  private entries: Client[] = [];
  private enabledClients: Set<string> | null = null;

  /**
   * Configure which clients should be enabled based on MCP_CLIENTS env var
   * If not set or empty, all clients are enabled
   * If set, should be comma-separated list of client names (case-insensitive)
   */
  constructor() {
    const enabledClientsEnv = process.env.MCP_CLIENTS?.trim();

    if (!enabledClientsEnv) {
      // Empty or not set = all clients enabled
      this.enabledClients = null;
      return;
    }

    // Parse comma-separated list and normalize to lowercase for comparison
    this.enabledClients = new Set(
      enabledClientsEnv
        .split(",")
        .map((name) => name.trim().toLowerCase())
        .filter((name) => name.length > 0),
    );
  }

  /**
   * Check if a client is enabled based on MCP_CLIENTS configuration
   */
  private isClientEnabled(name: string): boolean {
    if (this.enabledClients === null) {
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
   * Registers all enabled clients on the given MCP server
   * @param server The MCP server on which the client is registered
   * @param getConfigValue A function that obtains a configuration value for the given client and requirement name
   * @returns The number of clients successfully added
   */
  async registerAll(
    server: SmartBearMcpServer,
    getConfigValue: GetEnvFn,
    configure: boolean,
    authorizationCheck: boolean,
  ): Promise<number> {
    if (authorizationCheck && !configure) {
      throw new Error(
        "Cannot perform authorization check without configuring clients",
      );
    }
    let addedCount = 0;
    clientLoop: for (const client of this.getAll()) {
      if (configure) {
        const config: Record<string, string> = {};
        for (const configKey of Object.keys(client.config.shape)) {
          const value = getConfigValue(configKey, client);
          if (value) {
            // validate if a config option is an Allowed Endpoint URL
            this.validateAllowedEndpoint(client.config.shape[configKey], value);
            config[configKey] = value;
          } else if (!isOptionalType(client.config.shape[configKey])) {
            continue clientLoop; // Skip configuring this client - missing required config
          }
        }

        let parsedConfig: any;
        try {
          parsedConfig = client.config.parse(config); // Validate config against schema, validate and apply default values
        } catch (error) {
          if (error instanceof ZodError) {
            console.warn(
              `Configuration for client ${client.name} is invalid: ${error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")}`,
            );
          } else {
            console.warn(
              `Unable to apply configuration for client ${client.name}: ${error}`,
            );
          }
          continue; // Skip configuring this client - config is invalid
        }

        await client.configure(server, parsedConfig);
        if (!client.isConfigured()) {
          continue; // Client did not configure successfully - skip adding to server
        }
        if (authorizationCheck && !client.hasAuth()) {
          continue; // Client is not authorized - skip adding to server
        }
      }
      await server.addClient(client);
      addedCount++;
    }
    return addedCount;
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
