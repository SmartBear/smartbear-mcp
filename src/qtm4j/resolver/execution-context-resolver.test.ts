import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../config/constants";
import { ResolverKeys } from "../config/field-resolution.types";
import { ExecutionContextResolver } from "./resolvers/execution-context-resolver";

describe("ExecutionContextResolver", () => {
  let mockApiClient: any;
  let mockCacheService: any;
  let resolver: ExecutionContextResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    const store = new Map<string, unknown>();
    mockCacheService = {
      get: vi.fn((key: string) => store.get(key)),
      set: vi.fn((key: string, value: unknown) => {
        store.set(key, value);
        return true;
      }),
      del: vi.fn((key: string) => {
        store.delete(key);
        return 1;
      }),
    };
    mockApiClient = { get: vi.fn() };
    mockApiClient.skipAnalytics = vi.fn().mockReturnValue(mockApiClient);
    resolver = new ExecutionContextResolver(mockApiClient, mockCacheService);
  });

  describe("fieldKeys", () => {
    it("should include execution context field key", () => {
      expect(resolver.fieldKeys).toEqual([
        ResolverKeys.SearchableField.EXECUTION_CONTEXT,
      ]);
    });
  });

  describe("resolveAndReturn", () => {
    it("should resolve a test case within a cycle (flat response keyed by testCaseKey)", async () => {
      const mockResponse = {
        "PROJ-TC-42": {
          testCycleTestCaseMapId: 614823,
          testCaseExecutionId: 725982,
        },
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        ["PROJ-TC-42"],
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.EXECUTION_CONTEXT(10007),
        {
          testCycleKey: "PROJ-TR-101",
          testCaseKeys: "PROJ-TC-42",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should resolve multiple test cases in one call (CSV)", async () => {
      const mockResponse = {
        "PROJ-TC-42": {
          testCycleTestCaseMapId: 614823,
          testCaseExecutionId: 725982,
        },
        "PROJ-TC-43": {
          testCycleTestCaseMapId: 614824,
          testCaseExecutionId: null,
        },
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        ["PROJ-TC-42", "PROJ-TC-43"],
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.EXECUTION_CONTEXT(10007),
        {
          testCycleKey: "PROJ-TR-101",
          testCaseKeys: "PROJ-TC-42,PROJ-TC-43",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should resolve a test case with null testCaseExecutionId", async () => {
      const mockResponse = {
        "PROJ-TC-42": {
          testCycleTestCaseMapId: 614823,
          testCaseExecutionId: null,
        },
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        ["PROJ-TC-42"],
      );

      expect(result).toEqual(mockResponse);
    });

    it("should return empty object when the cycle or test case is not found", async () => {
      mockApiClient.get.mockResolvedValueOnce({});

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-999",
        ["PROJ-TC-42"],
      );

      expect(result).toEqual({});
    });

    it("should propagate API errors", async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error("Network Error"));

      await expect(
        resolver.resolveAndReturn("PROJ", 10007, "PROJ-TR-101", ["PROJ-TC-42"]),
      ).rejects.toThrow("Network Error");
    });

    it("should store resolved entries in the cache using static resolverKey and combination name", async () => {
      const mockResponse = {
        "PROJ-TC-42": {
          testCycleTestCaseMapId: 614823,
          testCaseExecutionId: 725982,
        },
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      await resolver.resolveAndReturn("PROJ", 10007, "PROJ-TR-101", [
        "PROJ-TC-42",
      ]);

      // Cache.set merges into the bucket at qtm4j:{projectKey}:{resolverKey}
      expect(mockCacheService.set).toHaveBeenCalledWith(
        "qtm4j:PROJ:executionContext",
        {
          "testcycle:proj-tr-101.testcase:proj-tc-42":
            mockResponse["PROJ-TC-42"],
        },
      );
    });

    it("should return cached entries without calling the API again", async () => {
      const mockResponse = {
        "PROJ-TC-42": {
          testCycleTestCaseMapId: 614823,
          testCaseExecutionId: 725982,
        },
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      await resolver.resolveAndReturn("PROJ", 10007, "PROJ-TR-101", [
        "PROJ-TC-42",
      ]);
      const result = await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        ["PROJ-TC-42"],
      );

      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it("should only fetch uncached keys from the API on a mixed request", async () => {
      const firstResponse = {
        "PROJ-TC-42": {
          testCycleTestCaseMapId: 614823,
          testCaseExecutionId: 725982,
        },
      };
      const secondResponse = {
        "PROJ-TC-43": {
          testCycleTestCaseMapId: 614824,
          testCaseExecutionId: null,
        },
      };
      mockApiClient.get
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      await resolver.resolveAndReturn("PROJ", 10007, "PROJ-TR-101", [
        "PROJ-TC-42",
      ]);
      const result = await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        ["PROJ-TC-42", "PROJ-TC-43"],
      );

      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        2,
        ENDPOINTS.EXECUTION_CONTEXT(10007),
        { testCycleKey: "PROJ-TR-101", testCaseKeys: "PROJ-TC-43" },
      );
      expect(result).toEqual({ ...firstResponse, ...secondResponse });
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
    it("should not throw when called without argument and nothing is cached", () => {
      expect(() => resolver.clearCache()).not.toThrow();
    });

    it("should not throw when called with a projectKey that has no cached entries", () => {
      expect(() => resolver.clearCache("PROJ")).not.toThrow();
    });

    it("should evict entries for a specific projectKey", async () => {
      const mockResponse = {
        "PROJ-TC-42": {
          testCycleTestCaseMapId: 614823,
          testCaseExecutionId: 725982,
        },
      };
      mockApiClient.get.mockResolvedValue(mockResponse);

      await resolver.resolveAndReturn("PROJ", 10007, "PROJ-TR-101", [
        "PROJ-TC-42",
      ]);
      resolver.clearCache("PROJ");

      // Cache.clear evicts the bucket key
      expect(mockCacheService.del).toHaveBeenCalledWith(
        "qtm4j:PROJ:executionContext",
      );

      // After clearing, the next call should hit the API again
      await resolver.resolveAndReturn("PROJ", 10007, "PROJ-TR-101", [
        "PROJ-TC-42",
      ]);
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
    });

    it("should evict all tracked entries when called without argument", async () => {
      const responseA = {
        "PROJ-TC-42": { testCycleTestCaseMapId: 1, testCaseExecutionId: 10 },
      };
      const responseB = {
        "OTHER-TC-55": {
          testCycleTestCaseMapId: 2,
          testCaseExecutionId: 20,
        },
      };
      mockApiClient.get
        .mockResolvedValueOnce(responseA)
        .mockResolvedValueOnce(responseB);

      await resolver.resolveAndReturn("PROJ", 10007, "PROJ-TR-101", [
        "PROJ-TC-42",
      ]);
      await resolver.resolveAndReturn("OTHER", 20001, "OTHER-TR-202", [
        "OTHER-TC-55",
      ]);
      resolver.clearCache();

      expect(mockCacheService.del).toHaveBeenCalledWith(
        "qtm4j:PROJ:executionContext",
      );
      expect(mockCacheService.del).toHaveBeenCalledWith(
        "qtm4j:OTHER:executionContext",
      );
    });
  });
});
