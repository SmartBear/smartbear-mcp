import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../../common/tools.ts";
import { ENDPOINTS } from "../../config/constants.ts";
import { ResolverKeys } from "../../config/field-resolution.types.ts";
import { SearchLinkedTestCasesInCycle } from "./search-linked-testcases.ts";

describe("SearchLinkedTestCasesInCycle", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockRegistry: any;
  let mockCycleResolver: any;
  let instance: SearchLinkedTestCasesInCycle;

  const mockContext = {
    projectKey: "SCRUM",
    projectId: 10_000,
    projectName: "Scrum Project",
  };

  const mockApiResponse = {
    total: 2,
    startAt: 0,
    maxResults: 50,
    data: [
      {
        id: "tc-exec-1",
        key: "SCRUM-TC-10",
        summary: "Login test",
        executionResult: "Pass",
      },
      {
        id: "tc-exec-2",
        key: "SCRUM-TC-11",
        summary: "Logout test",
        executionResult: "Fail",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCycleResolver = { resolveAndReturn: vi.fn() };

    mockRegistry = {
      requireProjectContext: vi.fn().mockReturnValue(mockContext),
      getResolver: vi.fn().mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.TEST_CYCLE_KEY_TO_UID)
          return mockCycleResolver;
        throw new Error(`Unexpected resolver key: ${key}`);
      }),
    };

    mockApiClient = { post: vi.fn().mockResolvedValue(mockApiResponse) };
    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockRegistry),
    };

    instance = new SearchLinkedTestCasesInCycle(mockClient as any);
  });

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe(
        "Search Linked Test Cases in Test Cycle",
      );
      expect(instance.specification.readOnly).toBe(true);
      expect(instance.specification.idempotent).toBe(true);
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

    it("should have the prerequisite hint", () => {
      expect(instance.specification.hints?.[0]).toContain(
        "set_project_context must be called before this tool",
      );
    });
  });

  describe("handle", () => {
    it("should resolve cycle key and search with default pagination", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });

      const result = await instance.handle({ cycleKey: "SCRUM-TR-1" });

      expect(mockCycleResolver.resolveAndReturn).toHaveBeenCalledWith(10_000, [
        "SCRUM-TR-1",
      ]);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining(
          ENDPOINTS.SEARCH_LINKED_TESTCASES_IN_CYCLE("cycle-uid-abc"),
        ),
        expect.objectContaining({
          filter: { projectId: [10_000] },
        }),
      );
      expect(result.structuredContent).toEqual(mockApiResponse);
      expect(result.content).toEqual([]);
    });

    it("should auto-inject projectId into filter", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });

      await instance.handle({
        cycleKey: "SCRUM-TR-1",
        filter: { executionResult: ["Fail"], priority: ["High"] },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          filter: {
            executionResult: ["Fail"],
            priority: ["High"],
            projectId: [10_000],
          },
        }),
      );
    });

    it("should pass fields as a comma-separated query param", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });

      await instance.handle({
        cycleKey: "SCRUM-TR-1",
        fields: ["key", "summary", "executionResult"],
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("fields=key%2Csummary%2CexecutionResult"),
        expect.any(Object),
      );
    });

    it("should pass sort as a query param", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });

      await instance.handle({
        cycleKey: "SCRUM-TR-1",
        sort: "key:desc",
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("sort=key%3Adesc"),
        expect.any(Object),
      );
    });

    it("should pass maxResults and startAt as query params", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });

      await instance.handle({
        cycleKey: "SCRUM-TR-1",
        maxResults: 25,
        startAt: 50,
      });

      const callArgs = mockApiClient.post.mock.calls[0][0] as string;
      expect(callArgs).toContain("maxResults=25");
      expect(callArgs).toContain("startAt=50");
    });

    it("should throw ToolError when cycle key not found", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({});

      await expect(
        instance.handle({ cycleKey: "SCRUM-TR-999" }),
      ).rejects.toThrow(ToolError);

      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({});
      await expect(
        instance.handle({ cycleKey: "SCRUM-TR-999" }),
      ).rejects.toThrow("SCRUM-TR-999");
    });

    it("should include cycle project key in ToolError message", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({});

      await expect(
        instance.handle({ cycleKey: "SCRUM-TR-999" }),
      ).rejects.toThrow("SCRUM");
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

      await expect(instance.handle({ cycleKey: "SCRUM-TR-1" })).rejects.toThrow(
        "Resolver Error",
      );
    });

    it("should propagate API errors from post", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });
      mockApiClient.post.mockRejectedValueOnce(new Error("API Error"));

      await expect(instance.handle({ cycleKey: "SCRUM-TR-1" })).rejects.toThrow(
        "API Error",
      );
    });

    it("should throw on missing required cycleKey", async () => {
      await expect(instance.handle({})).rejects.toThrow();
    });

    it("should handle filter with all supported fields", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });

      await instance.handle({
        cycleKey: "SCRUM-TR-1",
        filter: {
          key: "SCRUM-1",
          summary: "login",
          executionResult: ["Pass", "Fail"],
          status: ["To Do"],
          priority: ["High"],
          environment: ["Staging"],
          tcWithDefects: true,
          isAutomated: false,
          folderId: 42,
          executionAssignee: ["user-uuid-1"],
          executionPlannedDate: "01/Jan/2024,31/Mar/2024",
          createdOn: "01/Jan/2024,31/Jan/2024",
          updatedOn: "01/Feb/2024,28/Feb/2024",
          createdBy: ["user-uuid-2"],
          updatedBy: ["user-uuid-3"],
          aiGenerated: false,
          filterId: 100,
        },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          filter: expect.objectContaining({
            projectId: [10_000],
            executionResult: ["Pass", "Fail"],
            tcWithDefects: true,
          }),
        }),
      );
    });

    it("should return structured content matching the response schema", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });

      const result = await instance.handle({ cycleKey: "SCRUM-TR-1" });

      expect(result.structuredContent).toHaveProperty("total", 2);
      expect(result.structuredContent).toHaveProperty("startAt", 0);
      expect(result.structuredContent).toHaveProperty("maxResults", 50);
      expect(result.structuredContent).toHaveProperty("data");
      expect(result.structuredContent.data).toHaveLength(2);
    });
  });
});
