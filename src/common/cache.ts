import NodeCache from "node-cache";
import { getEnv } from "./env.ts";

const DEFAULT_CACHE_TTL_SECONDS = 86_400; // 24 hours

/**
 * Common cache service that can be shared across all clients.
 * Wraps NodeCache and provides a way to disable caching entirely.
 * Reads CACHE_ENABLED and CACHE_TTL environment variables for configuration.
 */
export class CacheService {
  private readonly cache: NodeCache | null;
  private readonly enabled: boolean;

  constructor() {
    // Read configuration from environment variables
    this.enabled = getEnv("CACHE_ENABLED") !== "false";
    const cacheTtl = getEnv("CACHE_TTL");
    const ttl = cacheTtl
      ? Number.parseInt(cacheTtl, 10)
      : DEFAULT_CACHE_TTL_SECONDS;

    this.cache = this.enabled
      ? new NodeCache({
          // `stdTTL` is the NodeCache constructor option name, dictated by the library.
          // biome-ignore lint/style/useNamingConvention: see above
          stdTTL: ttl,
        })
      : null;
  }

  /**
   * Get a value from the cache
   */
  get<T>(key: string): T | undefined {
    if (!(this.enabled && this.cache)) {
      return;
    }
    return this.cache.get<T>(key);
  }

  /**
   * Set a value in the cache
   */
  set<T>(key: string, value: T): boolean {
    if (!(this.enabled && this.cache)) {
      return false;
    }
    return this.cache.set(key, value);
  }

  /**
   * Delete a value from the cache
   */
  del(key: string): number {
    if (!(this.enabled && this.cache)) {
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
