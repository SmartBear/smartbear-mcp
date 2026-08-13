import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../../common/tools";
import { ENDPOINTS } from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types";
import { LinkTestCasesToCycle } from "./link-testcases";

describe("LinkTestCasesToCycle", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockRegistry: any;
  let mockCycleResolver: any;
  let mockTcResolver: any;
  let instance: LinkTestCasesToCycle;

  const mockContext = {
    projectKey: "SCRUM",
    projectId: 10000,
    projectName: "Scrum Project",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCycleResolver = { resolveAndReturn: vi.fn() };
    mockTcResolver = { resolveAndReturn: vi.fn() };

    mockRegistry = {
      requireProjectContext: vi.fn().mockReturnValue(mockContext),
      getResolver: vi.fn().mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.TEST_CYCLE_KEY_TO_UID)
          return mockCycleResolver;
        if (key === ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID)
          return mockTcResolver;
        throw new Error(`Unexpected resolver key: ${key}`);
      }),
    };

    mockApiClient = { post: vi.fn().mockResolvedValue({}) };
    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockRegistry),
    };

    instance = new LinkTestCasesToCycle(mockClient as any);
  });

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe(
        "Link Test Cases to Test Cycle",
      );
      expect(instance.specification.readOnly).toBe(false);
      expect(instance.specification.idempotent).toBe(false);
    });

    it("should have use cases", () => {
      expect(instance.specification.useCases?.length).toBeGreaterThan(0);
    });

    it("should have examples", () => {
      expect(instance.specification.examples?.length).toBeGreaterThan(0);
    });

    it("should have hints", () => {
      expect(instance.specification.hints?.length).toBeGreaterThan(0);
    });
  });

  describe("handle", () => {
    it("should resolve cycle key and link test cases by key", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });
      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-10": { uid: "uid-tc-10", latestVersion: 1 },
        "SCRUM-TC-11": { uid: "uid-tc-11", latestVersion: 2 },
      });

      const result = await instance.handle({
        cycleKey: "SCRUM-TR-1",
        testCaseKeys: ["SCRUM-TC-10", "SCRUM-TC-11"],
      });

      expect(mockCycleResolver.resolveAndReturn).toHaveBeenCalledWith(10000, [
        "SCRUM-TR-1",
      ]);
      expect(mockTcResolver.resolveAndReturn).toHaveBeenCalledWith(10000, [
        "SCRUM-TC-10",
        "SCRUM-TC-11",
      ]);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.LINK_TESTCASES_TO_CYCLE("cycle-uid-abc"),
        expect.objectContaining({
          testCases: [
            { id: "uid-tc-10", versionNo: 1 },
            { id: "uid-tc-11", versionNo: 2 },
          ],
        }),
      );
      expect(result.structuredContent).toEqual({
        cycleKey: "SCRUM-TR-1",
        linked: true,
      });
      expect(result.content).toEqual([]);
    });

    it("should link test cases via filter with auto-injected projectId", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });

      await instance.handle({
        cycleKey: "SCRUM-TR-1",
        filter: { priority: ["High"], status: ["To Do"] },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.LINK_TESTCASES_TO_CYCLE("cycle-uid-abc"),
        expect.objectContaining({
          filter: { priority: ["High"], status: ["To Do"], projectId: 10000 },
        }),
      );
    });

    it("should pass optional top-level params into body", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });
      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-10": { uid: "uid-tc-10", latestVersion: 1 },
      });

      await instance.handle({
        cycleKey: "SCRUM-TR-1",
        testCaseKeys: ["SCRUM-TC-10"],
        assignee: "5b10a2844c20165700ede21f",
        startNewExecution: true,
        executionPlannedDate: "2024-03-31",
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          assignee: "5b10a2844c20165700ede21f",
          startNewExecution: true,
          executionPlannedDate: "2024-03-31",
        }),
      );
    });

    it("should warn and skip unresolvable test case keys", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });
      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-10": { uid: "uid-tc-10", latestVersion: 1 },
      });

      const result = await instance.handle({
        cycleKey: "SCRUM-TR-1",
        testCaseKeys: ["SCRUM-TC-10", "SCRUM-TC-999"],
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({
        type: "text",
        text: expect.stringContaining("SCRUM-TC-999"),
      });
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          testCases: [{ id: "uid-tc-10", versionNo: 1 }],
        }),
      );
    });

    it("should throw ToolError when cycle key not found", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({});

      await expect(
        instance.handle({
          cycleKey: "SCRUM-TR-999",
          testCaseKeys: ["SCRUM-TC-10"],
        }),
      ).rejects.toThrow(ToolError);

      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({});
      await expect(
        instance.handle({
          cycleKey: "SCRUM-TR-999",
          testCaseKeys: ["SCRUM-TC-10"],
        }),
      ).rejects.toThrow("SCRUM-TR-999");
    });

    it("should throw when project context not set", async () => {
      mockRegistry.requireProjectContext.mockImplementation(() => {
        throw new Error("No active project set");
      });

      await expect(instance.handle({ cycleKey: "SCRUM-TR-1" })).rejects.toThrow(
        "No active project set",
      );
    });

    it("should propagate resolver errors", async () => {
      mockCycleResolver.resolveAndReturn.mockRejectedValueOnce(
        new Error("Resolver Error"),
      );

      await expect(
        instance.handle({
          cycleKey: "SCRUM-TR-1",
          testCaseKeys: ["SCRUM-TC-10"],
        }),
      ).rejects.toThrow("Resolver Error");
    });

    it("should propagate API errors from post", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });
      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-10": { uid: "uid-tc-10", latestVersion: 1 },
      });
      mockApiClient.post.mockRejectedValueOnce(new Error("API Error"));

      await expect(
        instance.handle({
          cycleKey: "SCRUM-TR-1",
          testCaseKeys: ["SCRUM-TC-10"],
        }),
      ).rejects.toThrow("API Error");
    });

    it("should throw on missing required cycleKey", async () => {
      await expect(
        instance.handle({ testCaseKeys: ["SCRUM-TC-10"] }),
      ).rejects.toThrow();
    });
  });
});
