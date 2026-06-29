import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../../../qtm4j/config/constants";
import { ResolverKeys } from "../../../../qtm4j/config/field-resolution.types";
import { TestCaseUidResolver } from "../../../../qtm4j/resolver/resolvers/test-case-uid-resolver";

describe("TestCaseUidResolver", () => {
  let mockApiClient: any;
  let resolver: TestCaseUidResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient = { get: vi.fn() };
    mockApiClient.skipAnalytics = vi.fn().mockReturnValue(mockApiClient);
    resolver = new TestCaseUidResolver(mockApiClient);
  });

  describe("fieldKeys", () => {
    it("should include test case UID field key", () => {
      expect(resolver.fieldKeys).toEqual([
        ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID,
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
        "SCRUM-TC-1": { uid: "uid-abc-123", latestVersion: 1 },
        "SCRUM-TC-2": { uid: "uid-def-456", latestVersion: 3 },
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(10000, [
        "SCRUM-TC-1",
        "SCRUM-TC-2",
      ]);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.RESOLVE_TEST_CASE_IDS(10000),
        { keys: "SCRUM-TC-1,SCRUM-TC-2" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle a single key", async () => {
      const mockResponse = {
        "SCRUM-TC-145": { uid: "uid-xyz-789", latestVersion: 2 },
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(10000, ["SCRUM-TC-145"]);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.RESOLVE_TEST_CASE_IDS(10000),
        { keys: "SCRUM-TC-145" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should propagate API errors", async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error("Network Error"));

      await expect(
        resolver.resolveAndReturn(10000, ["SCRUM-TC-1"]),
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
      expect(() => resolver.clearCache("PROJ")).not.toThrow();
    });
  });
});
