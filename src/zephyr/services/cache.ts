/**
 * Caching service for performance optimization in Zephyr API operations.
 */

import NodeCache from "node-cache";

export class CacheService {
    /**
     * Provides caching functionality for API responses.
     *
     * Implements TTL-based caching following BugSnag patterns to improve
     * performance for frequently accessed metadata and reference data.
     *
     * Properties
     * ----------
     * cache : NodeCache
     *     Underlying cache instance with TTL support
     */
    private cache: NodeCache;

    constructor(defaultTtlSeconds: number = 300) {
        /**
         * Initialize caching service with TTL configuration.
         *
         * Parameters
         * ----------
         * defaultTtlSeconds : number, optional
         *     Default time-to-live for cached items in seconds (default: 5 minutes)
         */
        this.cache = new NodeCache({
            stdTTL: defaultTtlSeconds,
            checkperiod: Math.floor(defaultTtlSeconds / 10)
        });
    }

    get<T>(key: string): T | undefined {
        /**
         * Retrieve cached value by key.
         *
         * Parameters
         * ----------
         * key : string
         *     Cache key to retrieve
         *
         * Returns
         * -------
         * T | undefined
         *     Cached value if exists and not expired, undefined otherwise
         */
        return this.cache.get<T>(key);
    }

    set<T>(key: string, value: T, ttlSeconds?: number): void {
        /**
         * Store value in cache with optional TTL override.
         *
         * Parameters
         * ----------
         * key : string
         *     Cache key for storage
         * value : T
         *     Value to cache
         * ttlSeconds : number, optional
         *     Custom TTL for this item, uses default if not specified
         */
        if (ttlSeconds !== undefined) {
            this.cache.set(key, value, ttlSeconds);
        } else {
            this.cache.set(key, value);
        }
    }

    delete(key: string): void {
        /**
         * Remove specific key from cache.
         *
         * Parameters
         * ----------
         * key : string
         *     Cache key to remove
         */
        this.cache.del(key);
    }

    clear(): void {
        /**
         * Clear all cached items.
         *
         * Useful for cache invalidation during testing or configuration changes.
         */
        this.cache.flushAll();
    }

    generateKey(prefix: string, ...params: (string | number)[]): string {
        /**
         * Generate consistent cache key from parameters.
         *
         * Creates standardized cache keys for consistent storage and retrieval.
         *
         * Parameters
         * ----------
         * prefix : string
         *     Key prefix (e.g., "statuses", "priorities")
         * params : (string | number)[]
         *     Additional parameters to include in key
         *
         * Returns
         * -------
         * string
         *     Generated cache key
         */
        const cleanParams = params
            .filter(param => param !== undefined && param !== null)
            .map(param => String(param))
            .join(":");

        return cleanParams ? `${prefix}:${cleanParams}` : prefix;
    }
}