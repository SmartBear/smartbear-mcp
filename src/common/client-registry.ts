import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import type { Client } from "./types.js";

/**
 * Interface for a client class that can be instantiated from environment variables
 */
export interface ClientClass {
  /**
   * Create a client instance from environment variables
   * @param mcpServer Optional MCP server instance (needed for some clients like PactFlow)
   * @returns Client instance or null if required env vars are not set
   */
  fromEnv(mcpServer?: Server): Client | null;

  /**
   * Optional async initialization method
   * Some clients (like Bugsnag) need to perform async setup after construction
   */
  initialize?: (client: Client) => Promise<void>;
}

/**
 * Registry entry for a client
 */
interface ClientRegistryEntry {
  name: string;
  clientClass: ClientClass;
  needsMcpServer: boolean;
  asyncInit: boolean;
}

/**
 * Central registry for all MCP clients
 * Add new clients here to make them automatically available
 */
class ClientRegistry {
  private entries: ClientRegistryEntry[] = [];
  private enabledClients: Set<string> | null = null;

  /**
   * Configure which clients should be enabled based on MCP_ENABLED_CLIENTS env var
   * If not set or empty, all clients are enabled
   * If set, should be comma-separated list of client names (case-insensitive)
   */
  configureEnabledClients(): void {
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
  register(
    name: string,
    clientClass: ClientClass,
    options: { needsMcpServer?: boolean; asyncInit?: boolean } = {},
  ): void {
    this.entries.push({
      name,
      clientClass,
      needsMcpServer: options.needsMcpServer ?? false,
      asyncInit: options.asyncInit ?? false,
    });
  }

  /**
   * Get all registered clients (filtered by MCP_ENABLED_CLIENTS if configured)
   */
  getAll(): ClientRegistryEntry[] {
    return this.entries.filter((entry) => this.isClientEnabled(entry.name));
  }

  /**
   * Get all HTTP headers that clients support for authentication
   * Returns a list of header names (in kebab-case) that should be allowed
   */
  getHttpAuthHeaders(): string[] {
    const headers = new Set<string>();

    // Use getAll() to respect MCP_ENABLED_CLIENTS filtering
    for (const entry of this.getAll()) {
      if ("getAuthConfig" in entry.clientClass) {
        const config = (entry.clientClass as any).getAuthConfig();
        for (const req of config.requirements) {
          // Convert env var name to header name (e.g., BUGSNAG_AUTH_TOKEN -> X-Bugsnag-Auth-Token)
          const headerName = `X-${req.key
            .split("_")
            .map(
              (part: string) =>
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
            )
            .join("-")}`;
          headers.add(headerName);
        }
      }
    }

    return Array.from(headers).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Get human-readable list of HTTP headers for logging/error messages
   * Organized by client
   */
  getHttpAuthHeadersHelp(): string[] {
    const messages: string[] = [];

    // Use getAll() to respect MCP_ENABLED_CLIENTS filtering
    for (const entry of this.getAll()) {
      // Check if client supports fromHeaders
      if (
        !(
          "fromHeaders" in entry.clientClass &&
          typeof (entry.clientClass as any).fromHeaders === "function"
        )
      ) {
        continue;
      }

      if ("getAuthConfig" in entry.clientClass) {
        const config = (entry.clientClass as any).getAuthConfig();
        messages.push(`\n  ${entry.name}:`);

        for (const req of config.requirements) {
          const headerName = `X-${req.key
            .split("_")
            .map(
              (part: string) =>
                part.charAt(0).toUpperCase() + part.slice(1).toLowerCase(),
            )
            .join("-")}`;
          const requiredTag = req.required ? " (required)" : " (optional)";
          messages.push(
            `    - ${headerName}${requiredTag}: ${req.description}`,
          );
        }
      }
    }

    return messages;
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
