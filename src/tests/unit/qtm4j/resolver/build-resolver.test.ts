import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../../../qtm4j/config/constants";
import {
  InputField,
  type ProjectContext,
  ResolverKeys,
} from "../../../../qtm4j/config/field-resolution.types";
import { Cache } from "../../../../qtm4j/resolver/cache/cache";
import { BuildResolver } from "../../../../qtm4j/resolver/resolvers/build-resolver";

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

describe("BuildResolver", () => {
  let mockApiClient: any;
  let resolver: BuildResolver;
  let mockCache: any;
  const context: ProjectContext = {
    projectKey: "PROJ",
    projectId: 10000,
    projectName: "Project Name",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = { get: vi.fn() };
    mockCache = { matchValue: vi.fn(), set: vi.fn(), clear: vi.fn() };

    vi.mocked(Cache).mockImplementation(() => mockCache);

    resolver = new BuildResolver(mockApiClient, makeMockCacheService() as any);
  });

  describe("fieldKeys", () => {
    it("should include build field", () => {
      expect(resolver.fieldKeys).toEqual([ResolverKeys.SearchableField.BUILD]);
    });
  });

  describe("resolveAndReturn", () => {
    it("should return cached value without calling API", async () => {
      mockCache.matchValue.mockReturnValueOnce("1079");

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.SearchableField.BUILD,
        "Build 2.0",
      );

      expect(result).toBe("1079");
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it("should fetch from API on cache miss and return resolved value", async () => {
      mockCache.matchValue
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce("1079");
      mockApiClient.get.mockResolvedValueOnce({
        "build 1.0": "1078",
        "build 2.0": "1079",
      });

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.SearchableField.BUILD,
        "Build 2.0",
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(ENDPOINTS.BUILDS(10000), {
        search: "Build 2.0",
      });
      expect(mockCache.set).toHaveBeenCalledWith(
        "PROJ",
        ResolverKeys.SearchableField.BUILD,
        { "build 1.0": "1078", "build 2.0": "1079" },
      );
      expect(result).toBe("1079");
    });

    it("should return undefined when value not found after fetch", async () => {
      mockCache.matchValue.mockReturnValue(undefined);
      mockApiClient.get.mockResolvedValueOnce({ "build 1.0": "1078" });

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.SearchableField.BUILD,
        "Sprint 3",
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
          ResolverKeys.SearchableField.BUILD,
          "Build 2.0",
        ),
      ).rejects.toThrow("API Error");
    });
  });

  describe("resolve", () => {
    it("should return early when field is not in body", async () => {
      const body: Record<string, unknown> = {};
      await resolver.resolve(
        InputField.BUILD,
        ResolverKeys.SearchableField.BUILD,
        body,
        context,
        [],
      );
      expect(mockCache.matchValue).not.toHaveBeenCalled();
    });

    it("should resolve single value and replace in body", async () => {
      mockCache.matchValue.mockReturnValueOnce("1079");
      const body: Record<string, unknown> = {
        [InputField.BUILD]: "Build 2.0",
      };
      const warnings: string[] = [];

      await resolver.resolve(
        InputField.BUILD,
        ResolverKeys.SearchableField.BUILD,
        body,
        context,
        warnings,
      );

      expect(body[InputField.BUILD]).toBe(1079);
      expect(warnings).toHaveLength(0);
    });

    it("should push warning and delete field for unresolvable name", async () => {
      mockCache.matchValue.mockReturnValue(undefined);
      mockApiClient.get.mockResolvedValueOnce({});
      const body: Record<string, unknown> = {
        [InputField.BUILD]: "NonExistent",
      };
      const warnings: string[] = [];

      await resolver.resolve(
        InputField.BUILD,
        ResolverKeys.SearchableField.BUILD,
        body,
        context,
        warnings,
      );

      expect(body).not.toHaveProperty(InputField.BUILD);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("NonExistent");
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
