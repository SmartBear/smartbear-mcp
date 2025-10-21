import type { SmartBearMcpServer } from "./server.js";
import type { Client } from "./types.js";

/**
 * Central registry for all MCP clients
 * Add new clients here to make them automatically available
 */
class ClientRegistry {
  private entries: Client[] = [];
  private enabledClients: Set<string> | null = null;

  /**
   * Configure which clients should be enabled based on MCP_ENABLED_CLIENTS env var
   * If not set or empty, all clients are enabled
   * If set, should be comma-separated list of client names (case-insensitive)
   */
  constructor() {
    const enabledClientsEnv = process.env.MCP_ENABLED_CLIENTS?.trim();

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
   * Check if a client is enabled based on MCP_ENABLED_CLIENTS configuration
   */
  private isClientEnabled(name: string): boolean {
    if (this.enabledClients === null) {
      return true; // All clients enabled
    }
    return this.enabledClients.has(name.toLowerCase());
  }

  /**
   * Register a client class
   * @param name Display name for the client (for logging)
   * @param clientClass The client class with fromAuthSource method
   * @param options Configuration options
   */
  register(client: Client): void {
    this.entries.push(client);
  }

  /**
   * Get all registered clients (filtered by MCP_ENABLED_CLIENTS if configured)
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
  async configure(server: SmartBearMcpServer, getConfigValue: (client: Client, key: string) => string | null): Promise<number> {
    let configuredCount = 0;
    entryLoop: for (const entry of this.getAll()) {
      const config: Record<string, string> = {};
      for (const configKey of Object.keys(entry.config.shape)) {
        const value = getConfigValue(entry, configKey);
        if (value !== null) {
          config[configKey] = value;
        } else if (!entry.config.shape[configKey].isOptional()) {
          continue entryLoop; // Skip configuring this client - missing required config
        }
      }
      if (await entry.configure(server, config)) {
        server.addClient(entry);
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
