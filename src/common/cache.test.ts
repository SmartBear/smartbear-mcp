import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CacheService } from "./cache";

describe("CacheService", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.CACHE_ENABLED = "true";
    delete process.env.CACHE_TTL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
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
