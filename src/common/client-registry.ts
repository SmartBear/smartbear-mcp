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
   * Get all registered clients
   */
  getAll(): ClientRegistryEntry[] {
    return [...this.entries];
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
