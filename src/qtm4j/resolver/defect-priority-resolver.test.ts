import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../../../qtm4j/config/constants";
import { ResolverKeys } from "../../../../qtm4j/config/field-resolution.types";
import { Cache } from "../../../../qtm4j/resolver/cache/cache";
import { DefectPriorityResolver } from "../../../../qtm4j/resolver/resolvers/defect-priority-resolver";

vi.mock("../../../../qtm4j/resolver/cache/cache");

function makeMockCacheService() {
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
    flushAll: () => {},
  };
}

describe("DefectPriorityResolver", () => {
  let mockApiClient: any;
  let resolver: DefectPriorityResolver;
  let mockCache: any;

  const context = {
    projectKey: "PROJ",
    projectId: 10000,
    projectName: "Project Name",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = { get: vi.fn() };
    mockApiClient.skipAnalytics = vi.fn().mockReturnValue(mockApiClient);
    mockCache = { matchValue: vi.fn(), set: vi.fn(), clear: vi.fn() };

    vi.mocked(Cache).mockImplementation(() => mockCache);

    resolver = new DefectPriorityResolver(
      mockApiClient,
      makeMockCacheService() as any,
    );
  });

  describe("fieldKeys", () => {
    it("should include DEFECT_PRIORITY field key", () => {
      expect(resolver.fieldKeys).toEqual([
        ResolverKeys.SearchableField.DEFECT_PRIORITY,
      ]);
    });
  });

  describe("resolveAndReturn", () => {
    it("should return cached value without calling API", async () => {
      mockCache.matchValue.mockReturnValueOnce("3");

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.SearchableField.DEFECT_PRIORITY,
        "High",
      );

      expect(result).toBe("3");
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it("should fetch from API on cache miss and return resolved value", async () => {
      mockCache.matchValue
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce("3");
      mockApiClient.get.mockResolvedValueOnce({ high: "3", medium: "4" });

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.SearchableField.DEFECT_PRIORITY,
        "High",
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.DEFECT_PRIORITIES(10000),
        { priorityNames: "High" },
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        "PROJ",
        ResolverKeys.SearchableField.DEFECT_PRIORITY,
        { high: "3", medium: "4" },
      );
      expect(result).toBe("3");
    });

    it("should return undefined when priority not found after fetch", async () => {
      mockCache.matchValue.mockReturnValue(undefined);
      mockApiClient.get.mockResolvedValueOnce({});

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.SearchableField.DEFECT_PRIORITY,
        "Nonexistent",
      );

      expect(result).toBeUndefined();
    });

    it("should propagate API errors", async () => {
      mockCache.matchValue.mockReturnValueOnce(undefined);
      mockApiClient.get.mockRejectedValueOnce(new Error("API Error"));

      await expect(
        resolver.resolveAndReturn(
          "PROJ",
          10000,
          ResolverKeys.SearchableField.DEFECT_PRIORITY,
          "High",
        ),
      ).rejects.toThrow("API Error");
    });
  });

  describe("resolve", () => {
    it("should be a no-op when field is absent from body", async () => {
      const body: Record<string, unknown> = {};
      const warnings: string[] = [];
      await resolver.resolve(
        "priority",
        ResolverKeys.SearchableField.DEFECT_PRIORITY,
        body,
        context,
        warnings,
      );
      expect(mockCache.matchValue).not.toHaveBeenCalled();
      expect(warnings).toHaveLength(0);
    });

    it("should be a no-op when field is not an array", async () => {
      const body: Record<string, unknown> = { priority: "High" };
      const warnings: string[] = [];
      await resolver.resolve(
        "priority",
        ResolverKeys.SearchableField.DEFECT_PRIORITY,
        body,
        context,
        warnings,
      );
      expect(mockCache.matchValue).not.toHaveBeenCalled();
      expect(body.priority).toBe("High");
    });

    it("should be a no-op when array is empty", async () => {
      const body: Record<string, unknown> = { priority: [] };
      const warnings: string[] = [];
      await resolver.resolve(
        "priority",
        ResolverKeys.SearchableField.DEFECT_PRIORITY,
        body,
        context,
        warnings,
      );
      expect(mockCache.matchValue).not.toHaveBeenCalled();
    });

    it("should resolve all items and set array of numeric IDs", async () => {
      mockCache.matchValue.mockReturnValueOnce("3").mockReturnValueOnce("4");
      const body: Record<string, unknown> = { priority: ["High", "Medium"] };
      const warnings: string[] = [];

      await resolver.resolve(
        "priority",
        ResolverKeys.SearchableField.DEFECT_PRIORITY,
        body,
        context,
        warnings,
      );

      expect(body.priority).toEqual([3, 4]);
      expect(warnings).toHaveLength(0);
    });

    it("should warn and skip unresolvable items, keeping resolved ones", async () => {
      mockCache.matchValue
        .mockReturnValueOnce("3")
        .mockReturnValueOnce(undefined);
      mockApiClient.get.mockResolvedValueOnce({});
      const body: Record<string, unknown> = { priority: ["High", "Unknown"] };
      const warnings: string[] = [];

      await resolver.resolve(
        "priority",
        ResolverKeys.SearchableField.DEFECT_PRIORITY,
        body,
        context,
        warnings,
      );

      expect(body.priority).toEqual([3]);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("Unknown");
    });

    it("should delete field and warn when all items are unresolvable", async () => {
      mockCache.matchValue.mockReturnValue(undefined);
      mockApiClient.get.mockResolvedValue({});
      const body: Record<string, unknown> = { priority: ["Nonexistent"] };
      const warnings: string[] = [];

      await resolver.resolve(
        "priority",
        ResolverKeys.SearchableField.DEFECT_PRIORITY,
        body,
        context,
        warnings,
      );

      expect(body).not.toHaveProperty("priority");
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("Nonexistent");
    });

    it("should trim whitespace from each item before resolving", async () => {
      mockCache.matchValue.mockReturnValueOnce("3");
      const body: Record<string, unknown> = { priority: ["  High  "] };
      await resolver.resolve(
        "priority",
        ResolverKeys.SearchableField.DEFECT_PRIORITY,
        body,
        context,
        [],
      );
      expect(mockCache.matchValue).toHaveBeenCalledWith(
        "PROJ",
        ResolverKeys.SearchableField.DEFECT_PRIORITY,
        "High",
      );
    });
  });

  describe("clearCache", () => {
    it("should clear all cache when no projectKey is provided", () => {
      resolver.clearCache();
      expect(mockCache.clear).toHaveBeenCalledWith(undefined);
    });

    it("should clear cache for specific project", () => {
      resolver.clearCache("PROJ");
      expect(mockCache.clear).toHaveBeenCalledWith("PROJ");
    });
  });
});
