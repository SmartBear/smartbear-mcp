import NodeCache from "node-cache";

/**
 * Common cache service that can be shared across all clients.
 * Wraps NodeCache and provides a way to disable caching entirely.
 * Reads CACHE_ENABLED and CACHE_TTL environment variables for configuration.
 */
export class CacheService {
  private cache: NodeCache | null;
  private enabled: boolean;

  constructor() {
    // Read configuration from environment variables
    this.enabled = process.env.CACHE_ENABLED !== "false";
    const ttl = process.env.CACHE_TTL
      ? Number.parseInt(process.env.CACHE_TTL, 10)
      : 86400; // Default 24 hours

    this.cache = this.enabled
      ? new NodeCache({
        stdTTL: ttl,
      })
      : null;
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | undefined {
    if (!this.enabled || !this.cache) {
      return undefined;
    }
    return this.cache.get<T>(key);
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T): boolean {
    if (!this.enabled || !this.cache) {
      return false;
    }
    return this.cache.set(key, value);
  }

  /**
   * Delete a value from the cache
   */
  del(key: string): number {
    if (!this.enabled || !this.cache) {
      return 0;
    }
    return this.cache.del(key);
  }

  /**
   * Check if caching is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Clear all cache entries
   */
  flushAll(): void {
    if (this.enabled && this.cache) {
      this.cache.flushAll();
    }
  }
}
