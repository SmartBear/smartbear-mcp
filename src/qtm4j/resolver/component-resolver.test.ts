import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CacheService } from "../../common/cache.ts";
import { ENDPOINTS } from "../config/constants.ts";
import {
  InputField,
  type ProjectContext,
  ResolverKeys,
} from "../config/field-resolution.types.ts";
import type { ApiClient } from "../http/api-client.ts";
import { Cache } from "./cache/cache.ts";
import { ComponentResolver } from "./resolvers/component-resolver.ts";

vi.mock("./cache/cache");

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

describe("ComponentResolver", () => {
  let mockApiClient: { get: ReturnType<typeof vi.fn> };
  let resolver: ComponentResolver;
  let mockCache: {
    matchValue: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    clear: ReturnType<typeof vi.fn>;
  };
  const context: ProjectContext = {
    projectKey: "PROJ",
    projectId: 10_000,
    projectName: "Project Name",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = { get: vi.fn() };
    mockCache = { matchValue: vi.fn(), set: vi.fn(), clear: vi.fn() };

    vi.mocked(Cache).mockImplementation(() => mockCache as unknown as Cache);

    resolver = new ComponentResolver(
      mockApiClient as unknown as ApiClient,
      makeMockCacheService(),
    );
  });

  describe("fieldKeys", () => {
    it("should include components field", () => {
      expect(resolver.fieldKeys).toEqual([
        ResolverKeys.SearchableField.COMPONENTS,
      ]);
    });
  });

  describe("resolveAndReturn", () => {
    it("should return cached value without calling API", async () => {
      mockCache.matchValue.mockReturnValueOnce("200");

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10_000,
        ResolverKeys.SearchableField.COMPONENTS,
        "UI",
      );

      expect(result).toBe("200");
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it("should fetch from API on cache miss and return resolved value", async () => {
      mockCache.matchValue
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce("200");
      mockApiClient.get.mockResolvedValueOnce({ ui: "200", cloud: "201" });

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10_000,
        ResolverKeys.SearchableField.COMPONENTS,
        "UI",
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.COMPONENTS(10_000),
        { search: "UI" },
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        "PROJ",
        ResolverKeys.SearchableField.COMPONENTS,
        { ui: "200", cloud: "201" },
      );
      expect(result).toBe("200");
    });

    it("should return undefined when value not found after fetch", async () => {
      mockCache.matchValue.mockReturnValue(undefined);
      mockApiClient.get.mockResolvedValueOnce({ ui: "200" });

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10_000,
        ResolverKeys.SearchableField.COMPONENTS,
        "NonExistent",
      );

      expect(result).toBeUndefined();
    });

    it("should propagate API errors", async () => {
      mockCache.matchValue.mockReturnValueOnce(undefined);
      mockApiClient.get.mockRejectedValueOnce(new Error("API Error"));

      await expect(
        resolver.resolveAndReturn(
          "PROJ",
          10_000,
          ResolverKeys.SearchableField.COMPONENTS,
          "UI",
        ),
      ).rejects.toThrow("API Error");
    });
  });

  describe("resolve", () => {
    it("should return early when field is not in body", async () => {
      const body: Record<string, unknown> = {};
      await resolver.resolve(
        InputField.COMPONENTS,
        ResolverKeys.SearchableField.COMPONENTS,
        body,
        context,
        [],
      );
      expect(mockCache.matchValue).not.toHaveBeenCalled();
    });

    it("should resolve single value and replace in body", async () => {
      mockCache.matchValue.mockReturnValueOnce("200");
      const body: Record<string, unknown> = { [InputField.COMPONENTS]: "UI" };
      const warnings: string[] = [];

      await resolver.resolve(
        InputField.COMPONENTS,
        ResolverKeys.SearchableField.COMPONENTS,
        body,
        context,
        warnings,
      );

      expect(body[InputField.COMPONENTS]).toBe(200);
      expect(warnings).toHaveLength(0);
    });

    it("should resolve array values and replace with ID array", async () => {
      mockCache.matchValue
        .mockReturnValueOnce("200")
        .mockReturnValueOnce("201");
      const body: Record<string, unknown> = {
        [InputField.COMPONENTS]: ["UI", "Cloud"],
      };

      await resolver.resolve(
        InputField.COMPONENTS,
        ResolverKeys.SearchableField.COMPONENTS,
        body,
        context,
        [],
      );

      expect(body[InputField.COMPONENTS]).toEqual([200, 201]);
    });

    it("should push warning for unresolvable name", async () => {
      mockCache.matchValue.mockReturnValue(undefined);
      mockApiClient.get.mockResolvedValueOnce({});
      const body: Record<string, unknown> = {
        [InputField.COMPONENTS]: "NonExistent",
      };
      const warnings: string[] = [];

      await resolver.resolve(
        InputField.COMPONENTS,
        ResolverKeys.SearchableField.COMPONENTS,
        body,
        context,
        warnings,
      );

      expect(body).not.toHaveProperty(InputField.COMPONENTS);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("NonExistent");
    });

    it("should partially resolve array — skip unresolved, warn for each", async () => {
      mockCache.matchValue
        .mockReturnValueOnce("200") // "UI" hit
        .mockReturnValueOnce(undefined) // "Bad" miss
        .mockReturnValueOnce(undefined) // "Bad" after fetch
        .mockReturnValueOnce("201"); // "Cloud" hit
      mockApiClient.get.mockResolvedValueOnce({});
      const body: Record<string, unknown> = {
        [InputField.COMPONENTS]: ["UI", "Bad", "Cloud"],
      };
      const warnings: string[] = [];

      await resolver.resolve(
        InputField.COMPONENTS,
        ResolverKeys.SearchableField.COMPONENTS,
        body,
        context,
        warnings,
      );

      expect(body[InputField.COMPONENTS]).toEqual([200, 201]);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("Bad");
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
