import { beforeEach, describe, expect, it, vi } from "vitest";
import { SearchableField } from "../../../../qtm4j/config/field-resolution.types";
import { ComponentResolver } from "../../../../qtm4j/resolver/component-resolver";
import { FieldMetadataCache } from "../../../../qtm4j/resolver/field-metadata-cache";
import { FieldMetadataFetcher } from "../../../../qtm4j/resolver/field-metadata-fetcher";

// Mock the dependencies
vi.mock("../../../../qtm4j/resolver/field-metadata-cache");
vi.mock("../../../../qtm4j/resolver/field-metadata-fetcher");

describe("ComponentResolver", () => {
  let mockApiClient: any;
  let resolver: ComponentResolver;
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

    resolver = new ComponentResolver(mockApiClient);
  });

  describe("fieldKeys", () => {
    it("should include components field", () => {
      expect(resolver.fieldKeys).toEqual([SearchableField.COMPONENTS]);
    });
  });

  describe("resolve", () => {
    it("should return cached value when available", async () => {
      mockCache.matchValue.mockReturnValueOnce("200");

      const result = await resolver.resolve(
        "PROJ",
        10000,
        SearchableField.COMPONENTS,
        "UI",
      );

      expect(result).toBe("200");
      expect(mockCache.matchValue).toHaveBeenCalledWith(
        "PROJ",
        SearchableField.COMPONENTS,
        "UI",
      );
      expect(mockFetcher.fetchSearchableField).not.toHaveBeenCalled();
    });

    it("should fetch and cache values when not in cache", async () => {
      mockCache.matchValue
        .mockReturnValueOnce(undefined) // First call - not in cache
        .mockReturnValueOnce("200"); // Second call - after fetch

      mockFetcher.fetchSearchableField.mockResolvedValueOnce({
        ui: "200",
        cloud: "201",
      });

      const result = await resolver.resolve(
        "PROJ",
        10000,
        SearchableField.COMPONENTS,
        "UI",
      );

      expect(result).toBe("200");
      expect(mockFetcher.fetchSearchableField).toHaveBeenCalledWith(
        SearchableField.COMPONENTS,
        10000,
        "UI",
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        "PROJ",
        SearchableField.COMPONENTS,
        { ui: "200", cloud: "201" },
      );
    });

    it("should return undefined when value not found even after fetch", async () => {
      mockCache.matchValue.mockReturnValue(undefined);

      mockFetcher.fetchSearchableField.mockResolvedValueOnce({
        ui: "200",
      });

      const result = await resolver.resolve(
        "PROJ",
        10000,
        SearchableField.COMPONENTS,
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
        resolver.resolve("PROJ", 10000, SearchableField.COMPONENTS, "UI"),
      ).rejects.toThrow("API Error");
    });

    it("should handle empty search results", async () => {
      mockCache.matchValue.mockReturnValue(undefined);

      mockFetcher.fetchSearchableField.mockResolvedValueOnce({});

      const result = await resolver.resolve(
        "PROJ",
        10000,
        SearchableField.COMPONENTS,
        "UI",
      );

      expect(result).toBeUndefined();
    });
  });

  describe("preload", () => {
    it("should return empty object (components are lazy-loaded)", async () => {
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
