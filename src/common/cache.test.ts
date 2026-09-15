import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  CacheService,
  getConfiguredCacheTtlSeconds,
  isCachingEnabled,
} from "./cache";

describe("CacheService", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.CACHE_ENABLED = "true";
    delete process.env.CACHE_TTL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("getConfiguredCacheTtlSeconds", () => {
    it("defaults to 24 hours when CACHE_TTL is unset", () => {
      expect(getConfiguredCacheTtlSeconds()).toBe(86400);
    });

    it("honors a CACHE_TTL override", () => {
      process.env.CACHE_TTL = "120";
      expect(getConfiguredCacheTtlSeconds()).toBe(120);
    });

    it("falls back to the default for garbage or negative CACHE_TTL", () => {
      // The value also feeds the SDK's cacheHints, which throw a RangeError
      // at construction for negative ttlMs — sanitizing here keeps server
      // construction from ever failing on a bad env var.
      process.env.CACHE_TTL = "not-a-number";
      expect(getConfiguredCacheTtlSeconds()).toBe(86400);
      process.env.CACHE_TTL = "-5";
      expect(getConfiguredCacheTtlSeconds()).toBe(86400);
    });
  });

  describe("isCachingEnabled", () => {
    it("is on by default and only 'false' disables it", () => {
      expect(isCachingEnabled()).toBe(true);
      process.env.CACHE_ENABLED = "false";
      expect(isCachingEnabled()).toBe(false);
    });
  });

  it("stores and retrieves a value using the default TTL", () => {
    const cache = new CacheService();
    cache.set("key1", { hello: "world" });
    expect(cache.get("key1")).toEqual({ hello: "world" });
  });

  it("expires a value after a per-key ttl override, in seconds", async () => {
    const cache = new CacheService();
    cache.set("key2", "value2", 0.05); // 50ms
    expect(cache.get("key2")).toBe("value2");
    await new Promise((resolve) => setTimeout(resolve, 150));
    expect(cache.get("key2")).toBeUndefined();
  });

  it("does not persist values when caching is disabled", () => {
    process.env.CACHE_ENABLED = "false";
    const cache = new CacheService();
    cache.set("key3", "value3", 60);
    expect(cache.get("key3")).toBeUndefined();
  });
});
