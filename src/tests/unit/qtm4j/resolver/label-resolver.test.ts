import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchableField } from "../../../../qtm4j/config/field-resolution.types";
import { FieldMetadataCache } from "../../../../qtm4j/resolver/field-metadata-cache";
import { FieldMetadataFetcher } from "../../../../qtm4j/resolver/field-metadata-fetcher";
import { LabelResolver } from "../../../../qtm4j/resolver/label-resolver";

// Mock the dependencies
vi.mock("../../../../qtm4j/resolver/field-metadata-cache");
vi.mock("../../../../qtm4j/resolver/field-metadata-fetcher");

describe("LabelResolver", () => {
  let mockApiClient: any;
  let resolver: LabelResolver;
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
      fetchSearchableField: vi.fn(),
    };

    // Mock constructor implementations
    vi.mocked(FieldMetadataCache).mockImplementation(() => mockCache);
    vi.mocked(FieldMetadataFetcher).mockImplementation(() => mockFetcher);

    resolver = new LabelResolver(mockApiClient);
  });

  describe("fieldKeys", () => {
    it("should include label field", () => {
      expect(resolver.fieldKeys).toEqual([SearchableField.LABEL]);
    });
  });

  describe("resolve", () => {
    it("should return cached value when available", async () => {
      mockCache.matchValue.mockReturnValueOnce("100");

      const result = await resolver.resolve(
        "PROJ",
        10000,
        SearchableField.LABEL,
        "Release_1",
      );

      expect(result).toBe("100");
      expect(mockCache.matchValue).toHaveBeenCalledWith(
        "PROJ",
        SearchableField.LABEL,
        "Release_1",
      );
      expect(mockFetcher.fetchSearchableField).not.toHaveBeenCalled();
    });

    it("should fetch and cache values when not in cache", async () => {
      mockCache.matchValue
        .mockReturnValueOnce(undefined) // First call - not in cache
        .mockReturnValueOnce("100"); // Second call - after fetch

      mockFetcher.fetchSearchableField.mockResolvedValueOnce({
        release_1: "100",
        "sprint 1": "101",
      });

      const result = await resolver.resolve(
        "PROJ",
        10000,
        SearchableField.LABEL,
        "Release_1",
      );

      expect(result).toBe("100");
      expect(mockFetcher.fetchSearchableField).toHaveBeenCalledWith(
        SearchableField.LABEL,
        10000,
        "Release_1",
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        "PROJ",
        SearchableField.LABEL,
        {
          release_1: "100",
          "sprint 1": "101",
        },
      );
    });

    it("should return undefined when value not found even after fetch", async () => {
      mockCache.matchValue.mockReturnValue(undefined);

      mockFetcher.fetchSearchableField.mockResolvedValueOnce({
        release_1: "100",
      });

      const result = await resolver.resolve(
        "PROJ",
        10000,
        SearchableField.LABEL,
        "NonExistent",
      );

      expect(result).toBeUndefined();
    });

    it("should handle API errors", async () => {
      mockCache.matchValue.mockReturnValueOnce(undefined);
      mockFetcher.fetchSearchableField.mockRejectedValueOnce(
        new Error("API Error"),
      );

      await expect(
        resolver.resolve("PROJ", 10000, SearchableField.LABEL, "Release_1"),
      ).rejects.toThrow("API Error");
    });

    it("should handle empty search results", async () => {
      mockCache.matchValue.mockReturnValue(undefined);

      mockFetcher.fetchSearchableField.mockResolvedValueOnce({});

      const result = await resolver.resolve(
        "PROJ",
        10000,
        SearchableField.LABEL,
        "Release_1",
      );

      expect(result).toBeUndefined();
    });
  });

  describe("preload", () => {
    it("should return empty object (labels are lazy-loaded)", async () => {
      const result = await resolver.preload("PROJ", 10000);

      expect(result).toEqual({});
      expect(mockFetcher.fetchSearchableField).not.toHaveBeenCalled();
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
