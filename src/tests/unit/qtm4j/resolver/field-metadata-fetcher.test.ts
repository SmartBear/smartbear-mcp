import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../../../qtm4j/config/constants";
import { SearchableField } from "../../../../qtm4j/config/field-resolution.types";
import { FieldMetadataFetcher } from "../../../../qtm4j/resolver/field-metadata-fetcher";

describe("FieldMetadataFetcher", () => {
  let mockApiClient: any;
  let fetcher: FieldMetadataFetcher;

  beforeEach(() => {
    mockApiClient = {
      get: vi.fn(),
    };
    fetcher = new FieldMetadataFetcher(mockApiClient);
  });

  describe("fetchCommonAttributes", () => {
    it("should fetch common attributes for a project", async () => {
      const mockResponse = {
        priority: { high: "1", low: "2" },
        testCaseStatus: { "to do": "1", "in progress": "2", done: "3" },
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await fetcher.fetchCommonAttributes(10000);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.COMMON_ATTRIBUTES(10000),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle empty common attributes response", async () => {
      const mockResponse = {};
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await fetcher.fetchCommonAttributes(10000);

      expect(result).toEqual({});
    });

    it("should propagate API errors", async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error("API Error"));

      await expect(fetcher.fetchCommonAttributes(10000)).rejects.toThrow(
        "API Error",
      );
    });
  });

  describe("fetchSearchableField", () => {
    it("should fetch labels with search parameter", async () => {
      const mockResponse = { "release 1": "100", "sprint 1": "101" };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await fetcher.fetchSearchableField(
        SearchableField.LABEL,
        10000,
        "release",
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(ENDPOINTS.LABELS(10000), {
        search: "release",
      });
      expect(result).toEqual(mockResponse);
    });

    it("should fetch components with search parameter", async () => {
      const mockResponse = { ui: "200", cloud: "201" };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await fetcher.fetchSearchableField(
        SearchableField.COMPONENTS,
        10000,
        "ui",
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.COMPONENTS(10000),
        { search: "ui" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle empty search results", async () => {
      const mockResponse = {};
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await fetcher.fetchSearchableField(
        SearchableField.LABEL,
        10000,
        "nonexistent",
      );

      expect(result).toEqual({});
    });

    it("should propagate API errors when fetching labels", async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error("Network Error"));

      await expect(
        fetcher.fetchSearchableField(SearchableField.LABEL, 10000, "test"),
      ).rejects.toThrow("Network Error");
    });

    it("should propagate API errors when fetching components", async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error("Network Error"));

      await expect(
        fetcher.fetchSearchableField(SearchableField.COMPONENTS, 10000, "test"),
      ).rejects.toThrow("Network Error");
    });

    it("should work with empty search string", async () => {
      const mockResponse = { label1: "1", label2: "2" };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await fetcher.fetchSearchableField(
        SearchableField.LABEL,
        10000,
        "",
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(ENDPOINTS.LABELS(10000), {
        search: "",
      });
      expect(result).toEqual(mockResponse);
    });
  });
});
