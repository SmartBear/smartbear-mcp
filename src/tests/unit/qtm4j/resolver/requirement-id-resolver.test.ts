import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../../../qtm4j/config/constants";
import { ResolverKeys } from "../../../../qtm4j/config/field-resolution.types";
import { RequirementIdResolver } from "../../../../qtm4j/resolver/resolvers/requirement-id-resolver";

describe("RequirementIdResolver", () => {
  let mockApiClient: any;
  let resolver: RequirementIdResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient = { get: vi.fn() };
    mockApiClient.skipAnalytics = vi.fn().mockReturnValue(mockApiClient);
    resolver = new RequirementIdResolver(mockApiClient);
  });

  describe("fieldKeys", () => {
    it("should include requirement key-to-id field key", () => {
      expect(resolver.fieldKeys).toEqual([
        ResolverKeys.SearchableField.REQUIREMENT_KEY_TO_ID,
      ]);
    });
  });

  describe("resolveAndReturn", () => {
    it("should return empty object when keys array is empty", async () => {
      const result = await resolver.resolveAndReturn(10000, []);
      expect(result).toEqual({});
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it("should call resolve-requirement-ids endpoint with joined keys", async () => {
      const mockResponse = {
        "SCRUM-145": { id: "10001" },
        "SCRUM-146": { id: "10002" },
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(10000, [
        "SCRUM-145",
        "SCRUM-146",
      ]);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.RESOLVE_REQUIREMENT_IDS(10000),
        { keys: "SCRUM-145,SCRUM-146" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle a single key", async () => {
      const mockResponse = {
        "SCRUM-200": { id: "10003" },
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(10000, ["SCRUM-200"]);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.RESOLVE_REQUIREMENT_IDS(10000),
        { keys: "SCRUM-200" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should use provided projectId in endpoint", async () => {
      mockApiClient.get.mockResolvedValueOnce({});

      await resolver.resolveAndReturn(99999, ["SCRUM-1"]);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.RESOLVE_REQUIREMENT_IDS(99999),
        expect.any(Object),
      );
    });

    it("should return API response as-is", async () => {
      const mockResponse = {
        "AD-10": { id: "20010" },
        "AD-11": { id: "20011" },
        "AD-12": { id: "20012" },
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(20000, [
        "AD-10",
        "AD-11",
        "AD-12",
      ]);

      expect(result).toEqual(mockResponse);
    });

    it("should propagate API errors", async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error("Network Error"));

      await expect(
        resolver.resolveAndReturn(10000, ["SCRUM-1"]),
      ).rejects.toThrow("Network Error");
    });
  });

  describe("resolve", () => {
    it("should be a no-op and not throw", async () => {
      const body: Record<string, unknown> = {};
      await expect(
        resolver.resolve("someField", "someKey", body, {} as any, []),
      ).resolves.toBeUndefined();
      expect(body).toEqual({});
    });
  });

  describe("clearCache", () => {
    it("should not throw when called without projectKey", () => {
      expect(() => resolver.clearCache()).not.toThrow();
    });

    it("should not throw when called with a projectKey", () => {
      expect(() => resolver.clearCache("SCRUM")).not.toThrow();
    });
  });
});
