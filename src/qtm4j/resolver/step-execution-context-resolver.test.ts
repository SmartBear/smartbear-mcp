import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../config/constants";
import { ResolverKeys } from "../config/field-resolution.types";
import { StepExecutionContextResolver } from "./resolvers/step-execution-context-resolver";

describe("StepExecutionContextResolver", () => {
  let mockApiClient: any;
  let mockCacheService: any;
  let resolver: StepExecutionContextResolver;

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
    resolver = new StepExecutionContextResolver(
      mockApiClient,
      mockCacheService,
    );
  });

  describe("fieldKeys", () => {
    it("should include step execution context field key", () => {
      expect(resolver.fieldKeys).toEqual([
        ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT,
      ]);
    });
  });

  describe("resolveAndReturn", () => {
    it("should resolve step sequence numbers to execution IDs", async () => {
      const mockResponse = {
        "PROJ-TC-42": {
          "1": 2548099,
          "2": 2548100,
        },
      };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        "PROJ-TC-42",
        [1, 2],
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.STEP_EXECUTION_CONTEXT(10007),
        {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          seqNos: "1,2",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should resolve a single step", async () => {
      const mockResponse = { "PROJ-TC-42": { "3": 2548101 } };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        "PROJ-TC-42",
        [3],
      );

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.STEP_EXECUTION_CONTEXT(10007),
        {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          seqNos: "3",
        },
      );
      expect(result).toEqual(mockResponse);
    });

    it("should return empty object when no steps resolve", async () => {
      mockApiClient.get.mockResolvedValueOnce({});

      const result = await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        "PROJ-TC-42",
        [99],
      );

      expect(result).toEqual({});
    });

    it("should return empty object immediately when seqNos is empty (no cache lookup, no API call)", async () => {
      const result = await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        "PROJ-TC-42",
        [],
      );

      expect(result).toEqual({});
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it("should propagate API errors", async () => {
      mockApiClient.get.mockRejectedValueOnce(new Error("Network Error"));

      await expect(
        resolver.resolveAndReturn(
          "PROJ",
          10007,
          "PROJ-TR-101",
          "PROJ-TC-42",
          [1],
        ),
      ).rejects.toThrow("Network Error");
    });

    it("should store resolved step IDs using static resolverKey and combination name", async () => {
      const mockResponse = { "PROJ-TC-42": { "1": 2548099, "2": 2548100 } };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        "PROJ-TC-42",
        [1, 2],
      );

      // Cache.set merges into the bucket at qtm4j:{projectKey}:{resolverKey}
      expect(mockCacheService.set).toHaveBeenCalledWith(
        "qtm4j:PROJ:stepExecutionContext",
        {
          "testcycle:proj-tr-101.testcase:proj-tc-42.step:1": "2548099",
          "testcycle:proj-tr-101.testcase:proj-tc-42.step:2": "2548100",
        },
      );
    });

    it("should return cached steps without calling the API again", async () => {
      const mockResponse = { "PROJ-TC-42": { "1": 2548099, "2": 2548100 } };
      mockApiClient.get.mockResolvedValueOnce(mockResponse);

      await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        "PROJ-TC-42",
        [1, 2],
      );
      const result = await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        "PROJ-TC-42",
        [1, 2],
      );

      expect(mockApiClient.get).toHaveBeenCalledTimes(1);
      expect(result).toEqual(mockResponse);
    });

    it("should only fetch uncached seqNos from the API on a mixed request", async () => {
      const firstResponse = { "PROJ-TC-42": { "1": 2548099 } };
      const secondResponse = { "PROJ-TC-42": { "2": 2548100 } };
      mockApiClient.get
        .mockResolvedValueOnce(firstResponse)
        .mockResolvedValueOnce(secondResponse);

      await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        "PROJ-TC-42",
        [1],
      );
      const result = await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        "PROJ-TC-42",
        [1, 2],
      );

      expect(mockApiClient.get).toHaveBeenNthCalledWith(
        2,
        ENDPOINTS.STEP_EXECUTION_CONTEXT(10007),
        {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          seqNos: "2",
        },
      );
      expect(result).toEqual({ "PROJ-TC-42": { "1": 2548099, "2": 2548100 } });
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
      const mockResponse = { "PROJ-TC-42": { "1": 2548099 } };
      mockApiClient.get.mockResolvedValue(mockResponse);

      await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        "PROJ-TC-42",
        [1],
      );
      resolver.clearCache("PROJ");

      expect(mockCacheService.del).toHaveBeenCalledWith(
        "qtm4j:PROJ:stepExecutionContext",
      );

      // After clearing, the next call should hit the API again
      await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        "PROJ-TC-42",
        [1],
      );
      expect(mockApiClient.get).toHaveBeenCalledTimes(2);
    });

    it("should evict all tracked entries when called without argument", async () => {
      const responseA = { "PROJ-TC-42": { "1": 2548099 } };
      const responseB = { "OTHER-TC-55": { "2": 2548200 } };
      mockApiClient.get
        .mockResolvedValueOnce(responseA)
        .mockResolvedValueOnce(responseB);

      await resolver.resolveAndReturn(
        "PROJ",
        10007,
        "PROJ-TR-101",
        "PROJ-TC-42",
        [1],
      );
      await resolver.resolveAndReturn(
        "OTHER",
        20001,
        "OTHER-TR-202",
        "OTHER-TC-55",
        [2],
      );
      resolver.clearCache();

      expect(mockCacheService.del).toHaveBeenCalledWith(
        "qtm4j:PROJ:stepExecutionContext",
      );
      expect(mockCacheService.del).toHaveBeenCalledWith(
        "qtm4j:OTHER:stepExecutionContext",
      );
    });
  });
});
