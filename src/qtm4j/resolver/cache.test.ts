import { beforeEach, describe, expect, it } from "vitest";
import type { CacheService } from "../../common/cache.ts";
import { Cache } from "./cache/cache.ts";

function makeMockCacheService(): CacheService {
  const store = new Map<string, unknown>();
  return {
    get: <T>(key: string): T | undefined => store.get(key) as T | undefined,
    set: <T>(key: string, value: T): boolean => {
      store.set(key, value);
      return true;
    },
    del: (key: string): number => {
      store.delete(key);
      return 1;
    },
    isEnabled: () => true,
    flushAll: () => {
      store.clear();
    },
  } as unknown as CacheService;
}

describe("Cache", () => {
  let cache: Cache;

  beforeEach(() => {
    cache = new Cache(makeMockCacheService());
  });

  describe("get", () => {
    it("should return undefined for non-existent project", () => {
      expect(cache.get("PROJ", "priority")).toBeUndefined();
    });

    it("should return undefined for non-existent field", () => {
      cache.set("PROJ", "priority", { high: "1", low: "2" });
      expect(cache.get("PROJ", "status")).toBeUndefined();
    });

    it("should return stored values", () => {
      const values = { high: "1", low: "2" };
      cache.set("PROJ", "priority", values);
      expect(cache.get("PROJ", "priority")).toEqual(values);
    });

    it("should handle multiple projects separately", () => {
      cache.set("PROJ1", "priority", { high: "1" });
      cache.set("PROJ2", "priority", { high: "2" });
      expect(cache.get("PROJ1", "priority")).toEqual({ high: "1" });
      expect(cache.get("PROJ2", "priority")).toEqual({ high: "2" });
    });
  });

  describe("set", () => {
    it("should store values for new project", () => {
      cache.set("PROJ", "priority", { high: "1" });
      expect(cache.get("PROJ", "priority")).toEqual({ high: "1" });
    });

    it("should merge values for existing field", () => {
      cache.set("PROJ", "priority", { high: "1" });
      cache.set("PROJ", "priority", { low: "2" });
      expect(cache.get("PROJ", "priority")).toEqual({ high: "1", low: "2" });
    });

    it("should not affect other projects", () => {
      cache.set("PROJ1", "priority", { high: "1" });
      cache.set("PROJ2", "priority", { high: "2" });
      expect(cache.get("PROJ1", "priority")).toEqual({ high: "1" });
      expect(cache.get("PROJ2", "priority")).toEqual({ high: "2" });
    });

    it("should not affect other fields", () => {
      cache.set("PROJ", "priority", { high: "1" });
      cache.set("PROJ", "status", { done: "10" });
      expect(cache.get("PROJ", "priority")).toEqual({ high: "1" });
      expect(cache.get("PROJ", "status")).toEqual({ done: "10" });
    });
  });

  describe("has", () => {
    it("should return false for non-existent project", () => {
      expect(cache.has("PROJ", "priority")).toBe(false);
    });

    it("should return false for non-existent field", () => {
      cache.set("PROJ", "priority", { high: "1" });
      expect(cache.has("PROJ", "status")).toBe(false);
    });

    it("should return true for existing field", () => {
      cache.set("PROJ", "priority", { high: "1" });
      expect(cache.has("PROJ", "priority")).toBe(true);
    });
  });

  describe("clear", () => {
    it("should clear all data when no projectKey is provided", () => {
      cache.set("PROJ1", "priority", { high: "1" });
      cache.set("PROJ2", "status", { done: "10" });
      cache.clear();
      expect(cache.get("PROJ1", "priority")).toBeUndefined();
      expect(cache.get("PROJ2", "status")).toBeUndefined();
    });

    it("should clear only specified project", () => {
      cache.set("PROJ1", "priority", { high: "1" });
      cache.set("PROJ2", "status", { done: "10" });
      cache.clear("PROJ1");
      expect(cache.get("PROJ1", "priority")).toBeUndefined();
      expect(cache.get("PROJ2", "status")).toEqual({ done: "10" });
    });

    it("should not throw when clearing non-existent project", () => {
      expect(() => cache.clear("NON_EXISTENT")).not.toThrow();
    });
  });

  describe("matchValue", () => {
    it("should return undefined for non-existent project", () => {
      expect(cache.matchValue("PROJ", "priority", "High")).toBeUndefined();
    });

    it("should return undefined for non-existent value", () => {
      cache.set("PROJ", "priority", { high: "1" });
      expect(cache.matchValue("PROJ", "priority", "Critical")).toBeUndefined();
    });

    it("should perform case-insensitive lookup", () => {
      cache.set("PROJ", "priority", { high: "1", low: "2" });
      expect(cache.matchValue("PROJ", "priority", "high")).toBe("1");
      expect(cache.matchValue("PROJ", "priority", "High")).toBe("1");
      expect(cache.matchValue("PROJ", "priority", "HIGH")).toBe("1");
    });

    it("should return correct ID for matching name", () => {
      cache.set("PROJ", "priority", { high: "1", medium: "2", low: "3" });
      expect(cache.matchValue("PROJ", "priority", "medium")).toBe("2");
    });
  });
});
