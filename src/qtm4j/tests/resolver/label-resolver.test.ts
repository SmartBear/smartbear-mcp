import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../config/constants";
import {
  InputField,
  type ProjectContext,
  ResolverKeys,
} from "../../config/field-resolution.types";
import { Cache } from "../../resolver/cache/cache";
import { LabelResolver } from "../../resolver/resolvers/label-resolver";

vi.mock("../../resolver/cache/cache");

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

describe("LabelResolver", () => {
  let mockApiClient: any;
  let resolver: LabelResolver;
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

    resolver = new LabelResolver(mockApiClient, makeMockCacheService() as any);
  });

  describe("fieldKeys", () => {
    it("should include label field", () => {
      expect(resolver.fieldKeys).toEqual([ResolverKeys.SearchableField.LABEL]);
    });
  });

  describe("resolveAndReturn", () => {
    it("should return cached value without calling API", async () => {
      mockCache.matchValue.mockReturnValueOnce("100");

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.SearchableField.LABEL,
        "Release_1",
      );

      expect(result).toBe("100");
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it("should fetch from API on cache miss and return resolved value", async () => {
      mockCache.matchValue
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce("100");
      mockApiClient.get.mockResolvedValueOnce({
        release_1: "100",
        "sprint 1": "101",
      });

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.SearchableField.LABEL,
        "Release_1",
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(ENDPOINTS.LABELS(10000), {
        search: "Release_1",
      });
      expect(mockCache.set).toHaveBeenCalledWith(
        "PROJ",
        ResolverKeys.SearchableField.LABEL,
        { release_1: "100", "sprint 1": "101" },
      );
      expect(result).toBe("100");
    });

    it("should return undefined when value not found after fetch", async () => {
      mockCache.matchValue.mockReturnValue(undefined);
      mockApiClient.get.mockResolvedValueOnce({});

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.SearchableField.LABEL,
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
          10000,
          ResolverKeys.SearchableField.LABEL,
          "Release_1",
        ),
      ).rejects.toThrow("API Error");
    });
  });

  describe("resolve", () => {
    it("should return early when field is not in body", async () => {
      const body: Record<string, unknown> = {};
      await resolver.resolve(
        InputField.LABELS,
        ResolverKeys.SearchableField.LABEL,
        body,
        context,
        [],
      );
      expect(mockCache.matchValue).not.toHaveBeenCalled();
    });

    it("should resolve single value and replace in body", async () => {
      mockCache.matchValue.mockReturnValueOnce("100");
      const body: Record<string, unknown> = {
        [InputField.LABELS]: "Release_1",
      };
      const warnings: string[] = [];

      await resolver.resolve(
        InputField.LABELS,
        ResolverKeys.SearchableField.LABEL,
        body,
        context,
        warnings,
      );

      expect(body[InputField.LABELS]).toBe(100);
      expect(warnings).toHaveLength(0);
    });

    it("should resolve array values and replace with ID array", async () => {
      mockCache.matchValue
        .mockReturnValueOnce("100")
        .mockReturnValueOnce("101");
      const body: Record<string, unknown> = {
        [InputField.LABELS]: ["Release_1", "Sprint 1"],
      };

      await resolver.resolve(
        InputField.LABELS,
        ResolverKeys.SearchableField.LABEL,
        body,
        context,
        [],
      );

      expect(body[InputField.LABELS]).toEqual([100, 101]);
    });

    it("should push warning for unresolvable name", async () => {
      mockCache.matchValue.mockReturnValue(undefined);
      mockApiClient.get.mockResolvedValueOnce({});
      const body: Record<string, unknown> = {
        [InputField.LABELS]: "NonExistent",
      };
      const warnings: string[] = [];

      await resolver.resolve(
        InputField.LABELS,
        ResolverKeys.SearchableField.LABEL,
        body,
        context,
        warnings,
      );

      expect(body).not.toHaveProperty(InputField.LABELS);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("NonExistent");
    });

    it("should partially resolve array — skip unresolved, warn for each", async () => {
      mockCache.matchValue
        .mockReturnValueOnce("100") // "A" hit
        .mockReturnValueOnce(undefined) // "Bad" miss
        .mockReturnValueOnce(undefined) // "Bad" after fetch
        .mockReturnValueOnce("101"); // "B" hit
      mockApiClient.get.mockResolvedValueOnce({});
      const body: Record<string, unknown> = {
        [InputField.LABELS]: ["A", "Bad", "B"],
      };
      const warnings: string[] = [];

      await resolver.resolve(
        InputField.LABELS,
        ResolverKeys.SearchableField.LABEL,
        body,
        context,
        warnings,
      );

      expect(body[InputField.LABELS]).toEqual([100, 101]);
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
