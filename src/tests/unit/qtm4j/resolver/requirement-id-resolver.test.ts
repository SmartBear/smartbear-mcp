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
    resolver = new RequirementIdResolver(mockApiClient);
  });

  describe("fieldKeys", () => {
    it("should include requirement key-to-ID field key", () => {
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

    it("should call the resolve-requirement-ids endpoint with joined keys", async () => {
      const mockResponse = {
        "SCRUM-1": { id: "10001" },
        "SCRUM-2": { id: "10002" },
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(10000, [
        "SCRUM-1",
        "SCRUM-2",
      ]);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.RESOLVE_REQUIREMENT_IDS(10000),
        { keys: "SCRUM-1,SCRUM-2" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle a single key", async () => {
      const mockResponse = { "SCRUM-145": { id: "10145" } };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(10000, ["SCRUM-145"]);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.RESOLVE_REQUIREMENT_IDS(10000),
        { keys: "SCRUM-145" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should use the provided projectId in the endpoint", async () => {
      mockApiClient.get.mockResolvedValueOnce({ "SCRUM-1": { id: "10001" } });

      await resolver.resolveAndReturn(99999, ["SCRUM-1"]);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.RESOLVE_REQUIREMENT_IDS(99999),
        expect.any(Object),
      );
    });

    it("should return empty map when API returns no matches", async () => {
      mockApiClient.get.mockResolvedValueOnce({});

      const result = await resolver.resolveAndReturn(10000, ["SCRUM-999"]);

      expect(result).toEqual({});
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

    it("should not modify body when called", async () => {
      const body: Record<string, unknown> = { existingField: "value" };
      await resolver.resolve("someField", "someKey", body, {} as any, []);
      expect(body).toEqual({ existingField: "value" });
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
