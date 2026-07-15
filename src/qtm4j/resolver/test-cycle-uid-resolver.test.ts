import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../config/constants.ts";
import type { ProjectContext } from "../config/field-resolution.types.ts";
import { ResolverKeys } from "../config/field-resolution.types.ts";
import type { ApiClient } from "../http/api-client.ts";
import { TestCycleUidResolver } from "./resolvers/test-cycle-uid-resolver.ts";

describe("TestCycleUidResolver", () => {
  let mockApiClient: { get: ReturnType<typeof vi.fn> };
  let resolver: TestCycleUidResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient = { get: vi.fn() };
    resolver = new TestCycleUidResolver(mockApiClient as unknown as ApiClient);
  });

  describe("fieldKeys", () => {
    it("should include test cycle key-to-uid field key", () => {
      expect(resolver.fieldKeys).toEqual([
        ResolverKeys.SearchableField.TEST_CYCLE_KEY_TO_UID,
      ]);
    });
  });

  describe("resolveAndReturn", () => {
    it("should return empty object when keys array is empty", async () => {
      const result = await resolver.resolveAndReturn(10_000, []);
      expect(result).toEqual({});
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it("should call resolve-test-cycle-ids endpoint with joined keys", async () => {
      const mockResponse = {
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
        "SCRUM-TR-2": { uid: "cycle-uid-def" },
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(10_000, [
        "SCRUM-TR-1",
        "SCRUM-TR-2",
      ]);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.RESOLVE_TEST_CYCLE_IDS(10_000),
        { keys: "SCRUM-TR-1,SCRUM-TR-2" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should handle a single key", async () => {
      const mockResponse = {
        "SCRUM-TR-10": { uid: "cycle-uid-xyz" },
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(10_000, ["SCRUM-TR-10"]);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.RESOLVE_TEST_CYCLE_IDS(10_000),
        { keys: "SCRUM-TR-10" },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should use provided projectId in endpoint", async () => {
      mockApiClient.get.mockResolvedValueOnce({});

      await resolver.resolveAndReturn(99_999, ["SCRUM-TR-1"]);

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.RESOLVE_TEST_CYCLE_IDS(99_999),
        expect.any(Object),
      );
    });

    it("should return API response as-is", async () => {
      const mockResponse = {
        "AD-CY-1": { uid: "uid-001" },
        "AD-CY-2": { uid: "uid-002" },
        "AD-CY-3": { uid: "uid-003" },
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(20_000, [
        "AD-CY-1",
        "AD-CY-2",
        "AD-CY-3",
      ]);

      expect(result).toEqual(mockResponse);
    });

    it("should propagate API errors", async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error("Network Error"));

      await expect(
        resolver.resolveAndReturn(10_000, ["SCRUM-TR-1"]),
      ).rejects.toThrow("Network Error");
    });
  });

  describe("resolve", () => {
    it("should be a no-op and not throw", async () => {
      const body: Record<string, unknown> = {};
      await expect(
        resolver.resolve(
          "someField",
          "someKey",
          body,
          {} as ProjectContext,
          [],
        ),
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
