import { beforeEach, describe, expect, it, vi } from "vitest";
import { CommonAttributeField } from "../../../../qtm4j/config/field-resolution.types";
import { CommonAttributeResolver } from "../../../../qtm4j/resolver/common-attribute-resolver";
import { FieldMetadataCache } from "../../../../qtm4j/resolver/field-metadata-cache";
import { FieldMetadataFetcher } from "../../../../qtm4j/resolver/field-metadata-fetcher";

// Mock the dependencies
vi.mock("../../../../qtm4j/resolver/field-metadata-cache");
vi.mock("../../../../qtm4j/resolver/field-metadata-fetcher");

describe("CommonAttributeResolver", () => {
  let mockApiClient: any;
  let resolver: CommonAttributeResolver;
  let mockCache: any;
  let mockFetcher: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockApiClient = {
      get: vi.fn(),
    };

    mockCache = {
      matchValue: vi.fn(),
      set: vi.fn(),
      clear: vi.fn(),
    };

    mockFetcher = {
      fetchCommonAttributes: vi.fn(),
    };

    // Mock constructor implementations
    vi.mocked(FieldMetadataCache).mockImplementation(() => mockCache);
    vi.mocked(FieldMetadataFetcher).mockImplementation(() => mockFetcher);

    resolver = new CommonAttributeResolver(mockApiClient);
  });

  describe("fieldKeys", () => {
    it("should include all common attribute fields", () => {
      expect(resolver.fieldKeys).toEqual(Object.values(CommonAttributeField));
    });
  });

  describe("resolve", () => {
    it("should return cached value when available", async () => {
      mockCache.matchValue.mockReturnValueOnce("1");

      const result = await resolver.resolve(
        "PROJ",
        10000,
        CommonAttributeField.PRIORITY,
        "High",
      );

      expect(result).toBe("1");
      expect(mockCache.matchValue).toHaveBeenCalledWith(
        "PROJ",
        CommonAttributeField.PRIORITY,
        "High",
      );
      expect(mockFetcher.fetchCommonAttributes).not.toHaveBeenCalled();
    });

    it("should fetch and cache values when not in cache", async () => {
      mockCache.matchValue
        .mockReturnValueOnce(undefined) // First call - not in cache
        .mockReturnValueOnce("1"); // Second call - after preload

      mockFetcher.fetchCommonAttributes.mockResolvedValueOnce({
        [CommonAttributeField.PRIORITY]: { high: "1", low: "2" },
        [CommonAttributeField.TESTCASE_STATUS]: { "to do": "10", done: "20" },
      });

      const result = await resolver.resolve(
        "PROJ",
        10000,
        CommonAttributeField.PRIORITY,
        "High",
      );

      expect(result).toBe("1");
      expect(mockFetcher.fetchCommonAttributes).toHaveBeenCalledWith(10000);
      expect(mockCache.set).toHaveBeenCalledTimes(2);
    });

    it("should return undefined when value not found even after fetch", async () => {
      mockCache.matchValue.mockReturnValue(undefined);

      mockFetcher.fetchCommonAttributes.mockResolvedValueOnce({
        [CommonAttributeField.PRIORITY]: { high: "1", low: "2" },
      });

      const result = await resolver.resolve(
        "PROJ",
        10000,
        CommonAttributeField.PRIORITY,
        "NonExistent",
      );

      expect(result).toBeUndefined();
    });

    it("should handle API errors", async () => {
      mockCache.matchValue.mockReturnValueOnce(undefined);
      mockFetcher.fetchCommonAttributes.mockRejectedValueOnce(
        new Error("API Error"),
      );

      await expect(
        resolver.resolve("PROJ", 10000, CommonAttributeField.PRIORITY, "High"),
      ).rejects.toThrow("API Error");
    });
  });

  describe("preload", () => {
    it("should fetch and cache all common attributes", async () => {
      const mockAttributes = {
        [CommonAttributeField.PRIORITY]: { high: "1", medium: "2", low: "3" },
        [CommonAttributeField.TESTCASE_STATUS]: {
          "to do": "10",
          "in progress": "11",
          done: "12",
        },
        [CommonAttributeField.TEST_PLAN_STATUS]: {
          active: "20",
          completed: "21",
        },
      };

      mockFetcher.fetchCommonAttributes.mockResolvedValueOnce(mockAttributes);

      const result = await resolver.preload("PROJ", 10000);

      expect(mockFetcher.fetchCommonAttributes).toHaveBeenCalledWith(10000);
      expect(mockCache.set).toHaveBeenCalledWith(
        "PROJ",
        CommonAttributeField.PRIORITY,
        mockAttributes[CommonAttributeField.PRIORITY],
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        "PROJ",
        CommonAttributeField.TESTCASE_STATUS,
        mockAttributes[CommonAttributeField.TESTCASE_STATUS],
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        "PROJ",
        CommonAttributeField.TEST_PLAN_STATUS,
        mockAttributes[CommonAttributeField.TEST_PLAN_STATUS],
      );
      expect(result).toEqual(mockAttributes);
    });

    it("should handle empty attributes response", async () => {
      mockFetcher.fetchCommonAttributes.mockResolvedValueOnce({});

      const result = await resolver.preload("PROJ", 10000);

      expect(result).toEqual({});
      expect(mockCache.set).not.toHaveBeenCalled();
    });

    it("should propagate API errors", async () => {
      mockFetcher.fetchCommonAttributes.mockRejectedValueOnce(
        new Error("Network Error"),
      );

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
