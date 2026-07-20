import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../config/constants";
import { ResolverKeys } from "../config/field-resolution.types";
import { DefectIdResolver } from "./resolvers/defect-id-resolver";

describe("DefectIdResolver", () => {
  let mockApiClient: any;
  let resolver: DefectIdResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient = { get: vi.fn() };
    mockApiClient.skipAnalytics = vi.fn().mockReturnValue(mockApiClient);
    resolver = new DefectIdResolver(mockApiClient);
  });

  describe("fieldKeys", () => {
    it("should include defect key-to-id field key", () => {
      expect(resolver.fieldKeys).toEqual([
        ResolverKeys.SearchableField.DEFECT_KEY_TO_ID,
      ]);
    });
  });

  describe("resolveAndReturn", () => {
    it("should return empty object when keys array is empty", async () => {
      const result = await resolver.resolveAndReturn(10000, []);
      expect(result).toEqual({});
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it("should call the resolve-ids endpoint with joined keys", async () => {
      const mockResponse = {
        "PROJ-456": 14488,
        "PROJ-789": 14489,
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(10000, [
        "PROJ-456",
        "PROJ-789",
      ]);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.RESOLVE_DEFECT_IDS(10000),
        { keys: "PROJ-456,PROJ-789" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle a single key", async () => {
      const mockResponse = { "PROJ-456": 14488 };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(10000, ["PROJ-456"]);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.RESOLVE_DEFECT_IDS(10000),
        { keys: "PROJ-456" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should omit keys not tracked in QTM4J (empty map)", async () => {
      mockApiClient.get.mockResolvedValueOnce({});

      const result = await resolver.resolveAndReturn(10000, ["PROJ-999"]);

      expect(result).toEqual({});
    });

    it("should propagate API errors", async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error("Network Error"));

      await expect(
        resolver.resolveAndReturn(10000, ["PROJ-456"]),
      ).rejects.toThrow("Network Error");
    });
  });

  describe("resolve", () => {
    const context: any = {
      projectId: 10007,
      projectKey: "PROJ",
      projectName: "Test Project",
    };

    it("should be a no-op when field value is null/undefined", async () => {
      const body: Record<string, unknown> = {};
      await resolver.resolve("defectIDs", "someKey", body, context, []);
      expect(body).toEqual({});
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it("should be a no-op when field value is strictly null", async () => {
      const body: Record<string, unknown> = { defectIDs: null };
      await resolver.resolve("defectIDs", "someKey", body, context, []);
      expect(body.defectIDs).toBeNull();
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it("should be a no-op when field value is empty array", async () => {
      const body: Record<string, unknown> = { defectIDs: [] };
      await resolver.resolve("defectIDs", "someKey", body, context, []);
      expect(body.defectIDs).toEqual([]);
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it("should resolve an array of keys to numeric IDs", async () => {
      mockApiClient.get.mockResolvedValueOnce({
        "PROJ-456": 14488,
        "PROJ-789": 14489,
      });
      const body: Record<string, unknown> = {
        defectIDs: ["PROJ-456", "PROJ-789"],
      };
      const warnings: string[] = [];
      await resolver.resolve("defectIDs", "someKey", body, context, warnings);
      expect(body.defectIDs).toEqual([14488, 14489]);
      expect(warnings).toEqual([]);
    });

    it("should resolve a single string value (wraps to array)", async () => {
      mockApiClient.get.mockResolvedValueOnce({ "PROJ-456": 14488 });
      const body: Record<string, unknown> = { defectIDs: "PROJ-456" };
      const warnings: string[] = [];
      await resolver.resolve("defectIDs", "someKey", body, context, warnings);
      expect(body.defectIDs).toEqual([14488]);
      expect(warnings).toEqual([]);
    });

    it("should delete field and warn when all keys are unresolved", async () => {
      mockApiClient.get.mockResolvedValueOnce({});
      const body: Record<string, unknown> = { defectIDs: ["PROJ-UNKNOWN"] };
      const warnings: string[] = [];
      await resolver.resolve("defectIDs", "someKey", body, context, warnings);
      expect(body.defectIDs).toBeUndefined();
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("PROJ-UNKNOWN");
    });

    it("should set resolved IDs and warn about unresolved keys (partial)", async () => {
      mockApiClient.get.mockResolvedValueOnce({ "PROJ-456": 14488 });
      const body: Record<string, unknown> = {
        defectIDs: ["PROJ-456", "PROJ-UNKNOWN"],
      };
      const warnings: string[] = [];
      await resolver.resolve("defectIDs", "someKey", body, context, warnings);
      expect(body.defectIDs).toEqual([14488]);
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toContain("PROJ-UNKNOWN");
    });
  });

  describe("clearCache", () => {
    it("should not throw when called without projectKey", () => {
      expect(() => resolver.clearCache()).not.toThrow();
    });

    it("should not throw when called with a projectKey", () => {
      expect(() => resolver.clearCache("PROJ")).not.toThrow();
    });
  });
});
