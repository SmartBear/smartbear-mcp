import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../config/constants";
import {
  InputField,
  type ProjectContext,
  ResolverKeys,
} from "../config/field-resolution.types";
import { Cache } from "./cache/cache";
import { EnvironmentResolver } from "./resolvers/environment-resolver";

vi.mock("./cache/cache");

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

describe("EnvironmentResolver", () => {
  let mockApiClient: any;
  let resolver: EnvironmentResolver;
  let mockCache: any;
  const context: ProjectContext = {
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

    resolver = new EnvironmentResolver(
      mockApiClient,
      makeMockCacheService() as any,
    );
  });

  describe("fieldKeys", () => {
    it("should include environment field", () => {
      expect(resolver.fieldKeys).toEqual([
        ResolverKeys.SearchableField.ENVIRONMENT,
      ]);
    });
  });

  describe("resolveAndReturn", () => {
    it("should return cached value without calling API", async () => {
      mockCache.matchValue.mockReturnValueOnce("1562");

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.SearchableField.ENVIRONMENT,
        "Production",
      );

      expect(result).toBe("1562");
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it("should fetch from API on cache miss and return resolved value", async () => {
      mockCache.matchValue
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce("1562");
      mockApiClient.get.mockResolvedValueOnce({
        production: "1562",
        staging: "1563",
      });

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.SearchableField.ENVIRONMENT,
        "Production",
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.ENVIRONMENTS(10000),
        { search: "Production" },
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        "PROJ",
        ResolverKeys.SearchableField.ENVIRONMENT,
        { production: "1562", staging: "1563" },
      );
      expect(result).toBe("1562");
    });

    it("should return undefined when value not found after fetch", async () => {
      mockCache.matchValue.mockReturnValue(undefined);
      mockApiClient.get.mockResolvedValueOnce({ staging: "1563" });

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.SearchableField.ENVIRONMENT,
        "Production",
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
          ResolverKeys.SearchableField.ENVIRONMENT,
          "Production",
        ),
      ).rejects.toThrow("API Error");
    });
  });

  describe("resolve", () => {
    it("should return early when field is not in body", async () => {
      const body: Record<string, unknown> = {};
      await resolver.resolve(
        InputField.ENVIRONMENT,
        ResolverKeys.SearchableField.ENVIRONMENT,
        body,
        context,
        [],
      );
      expect(mockCache.matchValue).not.toHaveBeenCalled();
    });

    it("should resolve single value and replace in body", async () => {
      mockCache.matchValue.mockReturnValueOnce("1562");
      const body: Record<string, unknown> = {
        [InputField.ENVIRONMENT]: "Production",
      };
      const warnings: string[] = [];

      await resolver.resolve(
        InputField.ENVIRONMENT,
        ResolverKeys.SearchableField.ENVIRONMENT,
        body,
        context,
        warnings,
      );

      expect(body[InputField.ENVIRONMENT]).toBe(1562);
      expect(warnings).toHaveLength(0);
    });

    it("should push warning and delete field for unresolvable name", async () => {
      mockCache.matchValue.mockReturnValue(undefined);
      mockApiClient.get.mockResolvedValueOnce({});
      const body: Record<string, unknown> = {
        [InputField.ENVIRONMENT]: "NonExistent",
      };
      const warnings: string[] = [];

      await resolver.resolve(
        InputField.ENVIRONMENT,
        ResolverKeys.SearchableField.ENVIRONMENT,
        body,
        context,
        warnings,
      );

      expect(body).not.toHaveProperty(InputField.ENVIRONMENT);
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
