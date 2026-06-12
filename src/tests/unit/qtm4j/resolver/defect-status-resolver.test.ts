import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../../../qtm4j/config/constants";
import { ResolverKeys } from "../../../../qtm4j/config/field-resolution.types";
import { Cache } from "../../../../qtm4j/resolver/cache/cache";
import { DefectStatusResolver } from "../../../../qtm4j/resolver/resolvers/defect-status-resolver";

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

describe("DefectStatusResolver", () => {
  let mockApiClient: any;
  let resolver: DefectStatusResolver;
  let mockCache: any;

  const context = {
    projectKey: "PROJ",
    projectId: 10000,
    projectName: "Project Name",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = { get: vi.fn() };
    mockCache = { matchValue: vi.fn(), set: vi.fn(), clear: vi.fn() };

    vi.mocked(Cache).mockImplementation(() => mockCache);

    resolver = new DefectStatusResolver(
      mockApiClient,
      makeMockCacheService() as any,
    );
  });

  describe("fieldKeys", () => {
    it("should include DEFECT_STATUS field key", () => {
      expect(resolver.fieldKeys).toEqual([
        ResolverKeys.SearchableField.DEFECT_STATUS,
      ]);
    });
  });

  describe("resolveAndReturn", () => {
    it("should return cached value without calling API", async () => {
      mockCache.matchValue.mockReturnValueOnce("10000");

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.SearchableField.DEFECT_STATUS,
        "To Do",
      );

      expect(result).toBe("10000");
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it("should fetch from API on cache miss and return resolved value", async () => {
      mockCache.matchValue
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce("10000");
      mockApiClient.get.mockResolvedValueOnce({
        "to do": "10000",
        "in progress": "10001",
      });

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.SearchableField.DEFECT_STATUS,
        "To Do",
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.DEFECT_STATUSES(10000),
        { statusNames: "To Do" },
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        "PROJ",
        ResolverKeys.SearchableField.DEFECT_STATUS,
        { "to do": "10000", "in progress": "10001" },
      );
      expect(result).toBe("10000");
    });

    it("should return undefined when status not found after fetch", async () => {
      mockCache.matchValue.mockReturnValue(undefined);
      mockApiClient.get.mockResolvedValueOnce({});

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.SearchableField.DEFECT_STATUS,
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
          ResolverKeys.SearchableField.DEFECT_STATUS,
          "To Do",
        ),
      ).rejects.toThrow("API Error");
    });
  });

  describe("resolve — array", () => {
    it("should be a no-op when field is absent from body", async () => {
      const body: Record<string, unknown> = {};
      const warnings: string[] = [];
      await resolver.resolve(
        "status",
        ResolverKeys.SearchableField.DEFECT_STATUS,
        body,
        context,
        warnings,
      );
      expect(mockCache.matchValue).not.toHaveBeenCalled();
      expect(warnings).toHaveLength(0);
    });

    it("should be a no-op for empty array", async () => {
      const body: Record<string, unknown> = { status: [] };
      const warnings: string[] = [];
      await resolver.resolve(
        "status",
        ResolverKeys.SearchableField.DEFECT_STATUS,
        body,
        context,
        warnings,
      );
      expect(mockCache.matchValue).not.toHaveBeenCalled();
      expect(warnings).toHaveLength(0);
    });

    it("should resolve all array items and set array of numeric IDs", async () => {
      mockCache.matchValue
        .mockReturnValueOnce("10000")
        .mockReturnValueOnce("10001");
      const body: Record<string, unknown> = {
        status: ["To Do", "In Progress"],
      };
      const warnings: string[] = [];

      await resolver.resolve(
        "status",
        ResolverKeys.SearchableField.DEFECT_STATUS,
        body,
        context,
        warnings,
      );

      expect(body.status).toEqual([10000, 10001]);
      expect(warnings).toHaveLength(0);
    });

    it("should warn and skip unresolvable array items, keeping resolved ones", async () => {
      mockCache.matchValue
        .mockReturnValueOnce("10000")
        .mockReturnValueOnce(undefined);
      mockApiClient.get.mockResolvedValueOnce({});
      const body: Record<string, unknown> = { status: ["To Do", "Unknown"] };
      const warnings: string[] = [];

      await resolver.resolve(
        "status",
        ResolverKeys.SearchableField.DEFECT_STATUS,
        body,
        context,
        warnings,
      );

      expect(body.status).toEqual([10000]);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("Unknown");
    });

    it("should delete field and warn when all array items are unresolvable", async () => {
      mockCache.matchValue.mockReturnValue(undefined);
      mockApiClient.get.mockResolvedValue({});
      const body: Record<string, unknown> = { status: ["Nonexistent"] };
      const warnings: string[] = [];

      await resolver.resolve(
        "status",
        ResolverKeys.SearchableField.DEFECT_STATUS,
        body,
        context,
        warnings,
      );

      expect(body).not.toHaveProperty("status");
      expect(warnings).toHaveLength(1);
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
