import NodeCache from "node-cache";

/** Default cache lifetime in seconds when CACHE_TTL is not set: 24 hours. */
const DEFAULT_CACHE_TTL_SECONDS = 86400;

/**
 * The configured cache lifetime in seconds (CACHE_TTL, default 24 hours).
 * Shared by the in-process {@link CacheService} and the protocol-level cache
 * hints stamped onto modern-era (2026-07-28) list/read results, so both
 * caching layers honor the same operator-configured lifetime.
 */
export function getConfiguredCacheTtlSeconds(): number {
  const parsed = process.env.CACHE_TTL
    ? Number.parseInt(process.env.CACHE_TTL, 10)
    : DEFAULT_CACHE_TTL_SECONDS;
  return Number.isFinite(parsed) && parsed >= 0
    ? parsed
    : DEFAULT_CACHE_TTL_SECONDS;
}

/**
 * Whether caching is enabled (CACHE_ENABLED, default on). Also gates the
 * protocol-level cache hints: with caching disabled the modern-era results
 * keep the SDK default of `ttlMs: 0` (do not cache).
 */
export function isCachingEnabled(): boolean {
  return process.env.CACHE_ENABLED !== "false";
}

/**
 * Common cache service that can be shared across all clients.
 * Wraps NodeCache and provides a way to disable caching entirely.
 * Reads CACHE_ENABLED and CACHE_TTL environment variables for configuration.
 */
export class CacheService {
  private cache: NodeCache | null;
  private enabled: boolean;

  /**
   * @param options.sweepExpired Run node-cache's periodic expiry sweep
   *   (default true). The sweep re-arms a timer forever, and that pending timer
   *   keeps the cache - and everything in it - reachable until `close()` is
   *   called. Short-lived owners (one cache per server instance, which can mean
   *   one per request) must pass false so the cache can be garbage collected
   *   along with its owner; expired entries are still dropped lazily on `get`.
   *   Only process-lifetime singletons should leave the sweep on.
   */
  constructor(options: { sweepExpired?: boolean } = {}) {
    // Read configuration from environment variables
    this.enabled = isCachingEnabled();
    const ttl = getConfiguredCacheTtlSeconds();

    this.cache = this.enabled
      ? new NodeCache({
          stdTTL: ttl,
          // Only set when disabling: an explicit `undefined` would override
          // node-cache's default sweep period rather than fall back to it.
          ...(options.sweepExpired === false ? { checkperiod: 0 } : {}),
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
   * Set a value in the cache, optionally overriding the default TTL
   * (in seconds) for this key only.
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    if (!this.enabled || !this.cache) {
      return false;
    }
    return ttl !== undefined
      ? this.cache.set(key, value, ttl)
      : this.cache.set(key, value);
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
   * Stop the expiry sweep timer and drop all entries.
   */
  close(): void {
    this.cache?.close();
    this.cache?.flushAll();
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
