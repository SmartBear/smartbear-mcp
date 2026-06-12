import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../../../qtm4j/config/constants";
import {
  InputField,
  type ProjectContext,
  ResolverKeys,
} from "../../../../qtm4j/config/field-resolution.types";
import { Cache } from "../../../../qtm4j/resolver/cache/cache";
import { CommonAttributeResolver } from "../../../../qtm4j/resolver/resolvers/common-attribute-resolver";

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

describe("CommonAttributeResolver", () => {
  let mockApiClient: any;
  let resolver: CommonAttributeResolver;
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

    resolver = new CommonAttributeResolver(
      mockApiClient,
      makeMockCacheService() as any,
    );
  });

  describe("fieldKeys", () => {
    it("should include all common attribute fields", () => {
      expect(resolver.fieldKeys).toEqual(
        Object.values(ResolverKeys.CommonAttribute),
      );
    });
  });

  describe("resolveAndReturn", () => {
    it("should return cached value without calling API", async () => {
      mockCache.matchValue.mockReturnValueOnce("1");

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.CommonAttribute.PRIORITY,
        "High",
      );

      expect(result).toBe("1");
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it("should preload (fetch all attributes) on cache miss", async () => {
      mockCache.matchValue
        .mockReturnValueOnce(undefined)
        .mockReturnValueOnce("1");
      mockApiClient.get.mockResolvedValueOnce({
        [ResolverKeys.CommonAttribute.PRIORITY]: { high: "1", low: "2" },
        [ResolverKeys.CommonAttribute.TESTCASE_STATUS]: {
          "to do": "10",
          done: "20",
        },
      });

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.CommonAttribute.PRIORITY,
        "High",
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.COMMON_ATTRIBUTES(10000),
      );
      expect(mockCache.set).toHaveBeenCalledTimes(2);
      expect(result).toBe("1");
    });

    it("should return undefined when value not found after fetch", async () => {
      mockCache.matchValue.mockReturnValue(undefined);
      mockApiClient.get.mockResolvedValueOnce({
        [ResolverKeys.CommonAttribute.PRIORITY]: { high: "1" },
      });

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10000,
        ResolverKeys.CommonAttribute.PRIORITY,
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
          ResolverKeys.CommonAttribute.PRIORITY,
          "High",
        ),
      ).rejects.toThrow("API Error");
    });
  });

  describe("resolve", () => {
    it("should return early when field is not in body", async () => {
      const body: Record<string, unknown> = {};
      await resolver.resolve(
        InputField.PRIORITY,
        ResolverKeys.CommonAttribute.PRIORITY,
        body,
        context,
        [],
      );
      expect(mockCache.matchValue).not.toHaveBeenCalled();
    });

    it("should resolve single value and replace in body", async () => {
      mockCache.matchValue.mockReturnValueOnce("1");
      const body: Record<string, unknown> = { [InputField.PRIORITY]: "High" };
      const warnings: string[] = [];

      await resolver.resolve(
        InputField.PRIORITY,
        ResolverKeys.CommonAttribute.PRIORITY,
        body,
        context,
        warnings,
      );

      expect(body[InputField.PRIORITY]).toBe(1);
      expect(warnings).toHaveLength(0);
    });

    it("should push warning for unresolvable name", async () => {
      mockCache.matchValue.mockReturnValue(undefined);
      mockApiClient.get.mockResolvedValueOnce({
        [ResolverKeys.CommonAttribute.PRIORITY]: { high: "1" },
      });
      const body: Record<string, unknown> = {
        [InputField.PRIORITY]: "NonExistent",
      };
      const warnings: string[] = [];

      await resolver.resolve(
        InputField.PRIORITY,
        ResolverKeys.CommonAttribute.PRIORITY,
        body,
        context,
        warnings,
      );

      expect(body).not.toHaveProperty(InputField.PRIORITY);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("NonExistent");
    });

    it("should propagate API errors", async () => {
      mockCache.matchValue.mockReturnValueOnce(undefined);
      mockApiClient.get.mockRejectedValueOnce(new Error("API Error"));
      const body: Record<string, unknown> = { [InputField.PRIORITY]: "High" };

      await expect(
        resolver.resolve(
          InputField.PRIORITY,
          ResolverKeys.CommonAttribute.PRIORITY,
          body,
          context,
          [],
        ),
      ).rejects.toThrow("API Error");
    });
  });

  describe("preload", () => {
    it("should fetch and cache all common attributes", async () => {
      const mockAttributes = {
        [ResolverKeys.CommonAttribute.PRIORITY]: {
          high: "1",
          medium: "2",
          low: "3",
        },
        [ResolverKeys.CommonAttribute.TESTCASE_STATUS]: {
          "to do": "10",
          "in progress": "11",
          done: "12",
        },
        [ResolverKeys.CommonAttribute.TEST_PLAN_STATUS]: {
          active: "20",
          completed: "21",
        },
      };
      mockApiClient.get.mockResolvedValueOnce(mockAttributes);

      const result = await resolver.preload("PROJ", 10000);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.COMMON_ATTRIBUTES(10000),
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        "PROJ",
        ResolverKeys.CommonAttribute.PRIORITY,
        mockAttributes[ResolverKeys.CommonAttribute.PRIORITY],
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        "PROJ",
        ResolverKeys.CommonAttribute.TESTCASE_STATUS,
        mockAttributes[ResolverKeys.CommonAttribute.TESTCASE_STATUS],
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        "PROJ",
        ResolverKeys.CommonAttribute.TEST_PLAN_STATUS,
        mockAttributes[ResolverKeys.CommonAttribute.TEST_PLAN_STATUS],
      );
      expect(result).toEqual(mockAttributes);
    });

    it("should handle empty attributes response", async () => {
      mockApiClient.get.mockResolvedValueOnce({});
      const result = await resolver.preload("PROJ", 10000);
      expect(result).toEqual({});
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it("should propagate API errors", async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error("Network Error"));
      await expect(resolver.preload("PROJ", 10000)).rejects.toThrow(
        "Network Error",
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
