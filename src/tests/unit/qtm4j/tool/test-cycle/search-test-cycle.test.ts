import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../../../../qtm4j/config/constants";
import { SearchTestCycles } from "../../../../../qtm4j/tool/test-cycle/search-test-cycle";

describe("SearchTestCycles", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockRegistry: any;
  let instance: SearchTestCycles;

  const mockContext = {
    projectKey: "PROJ",
    projectId: 10066,
    projectName: "Test Project",
  };

  const mockResponse = {
    startAt: 0,
    maxResults: 20,
    total: 2,
    data: [
      {
        id: "PrCE68uGK8m",
        key: "PROJ-TR-26",
        status: {},
        priority: {},
        projectId: 10066,
        archived: false,
      },
      {
        id: "LVCw97cxr1Q",
        key: "PROJ-TR-25",
        status: {},
        priority: {},
        projectId: 10066,
        archived: false,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRegistry = {
      requireProjectContext: vi.fn().mockReturnValue(mockContext),
    };
    mockApiClient = { post: vi.fn() };
    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockRegistry),
    };

    instance = new SearchTestCycles(mockClient as any);
  });

  // ---------------------------------------------------------------------------
  // specification
  // ---------------------------------------------------------------------------

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe("Search Test Cycles");
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
  });

  // ---------------------------------------------------------------------------
  // handle — validation
  // ---------------------------------------------------------------------------

  describe("handle — validation", () => {
    it("should throw when project context is not set", async () => {
      mockRegistry.requireProjectContext.mockImplementation(() => {
        throw new Error("No active project set");
      });

      await expect(
        instance.handle({ filter: { status: ["To Do"] } }),
      ).rejects.toThrow("No active project set");
    });
  });

  // ---------------------------------------------------------------------------
  // handle — request construction
  // ---------------------------------------------------------------------------

  describe("handle — request construction", () => {
    it("should auto-inject projectId from context into the filter body", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({ filter: { status: ["To Do"] } });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining(ENDPOINTS.SEARCH_TEST_CYCLES),
        { filter: expect.objectContaining({ projectId: 10066 }) },
      );
    });

    it("should call the search endpoint as POST", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({ filter: { searchText: "regression" } });

      expect(mockApiClient.post).toHaveBeenCalledTimes(1);
      expect(mockApiClient.post.mock.calls[0][0]).toContain(
        ENDPOINTS.SEARCH_TEST_CYCLES,
      );
    });

    it("should always send default sort 'key:asc' when sort is not provided", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({ filter: { status: ["To Do"] } });

      const url: string = mockApiClient.post.mock.calls[0][0];
      expect(url).toContain("sort=key%3Aasc");
    });

    it("should use the provided sort value when supplied", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({
        filter: { status: ["In Progress"] },
        sort: "plannedStartDate:desc",
      });

      const url: string = mockApiClient.post.mock.calls[0][0];
      expect(url).toContain("sort=plannedStartDate%3Adesc");
    });

    it("should accept defectCount as a sort field", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({
        filter: { status: ["To Do"] },
        sort: "defectCount:asc",
      });

      const url: string = mockApiClient.post.mock.calls[0][0];
      expect(url).toContain("sort=defectCount%3Aasc");
    });

    it("should send default startAt=0 and maxResults=20", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({ filter: { status: ["To Do"] } });

      const url: string = mockApiClient.post.mock.calls[0][0];
      expect(url).toContain("startAt=0");
      expect(url).toContain("maxResults=20");
    });

    it("should send custom startAt and maxResults when provided", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({
        filter: { status: ["To Do"] },
        startAt: 20,
        maxResults: 50,
      });

      const url: string = mockApiClient.post.mock.calls[0][0];
      expect(url).toContain("startAt=20");
      expect(url).toContain("maxResults=50");
    });

    it("should include fields query param when fields are provided", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({
        filter: { status: ["To Do"] },
        fields: ["key", "summary", "status"],
      });

      const url: string = mockApiClient.post.mock.calls[0][0];
      expect(url).toContain("fields=key%2Csummary%2Cstatus");
    });

    it("should NOT include fields query param when fields are not provided", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({ filter: { status: ["To Do"] } });

      const url: string = mockApiClient.post.mock.calls[0][0];
      expect(url).not.toContain("fields=");
    });

    it("should include all provided filter fields in the body", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({
        filter: {
          status: ["In Progress"],
          assignee: ["user-123"],
          folderId: 109987,
          searchText: "regression",
        },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {
        filter: expect.objectContaining({
          status: ["In Progress"],
          assignee: ["user-123"],
          folderId: 109987,
          searchText: "regression",
          projectId: 10066,
        }),
      });
    });

    it("should send createdOn date range in the filter body", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({
        filter: { createdOn: "01/May/2026,20/May/2026" },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {
        filter: expect.objectContaining({
          createdOn: "01/May/2026,20/May/2026",
          projectId: 10066,
        }),
      });
    });

    it("should send updatedOn date range in the filter body", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({
        filter: { updatedOn: "01/May/2026,21/May/2026" },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {
        filter: expect.objectContaining({
          updatedOn: "01/May/2026,21/May/2026",
          projectId: 10066,
        }),
      });
    });

    it("should send priority array in the filter body", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({
        filter: { priority: ["High", "Medium"] },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {
        filter: expect.objectContaining({
          priority: ["High", "Medium"],
          projectId: 10066,
        }),
      });
    });

    it("should send reporter array in the filter body", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({
        filter: { reporter: ["5b10a2844c20165700ede21f"] },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {
        filter: expect.objectContaining({
          reporter: ["5b10a2844c20165700ede21f"],
          projectId: 10066,
        }),
      });
    });

    it("should send labels array in the filter body", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({
        filter: { labels: ["Release_1", "Sprint 1"] },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {
        filter: expect.objectContaining({
          labels: ["Release_1", "Sprint 1"],
          projectId: 10066,
        }),
      });
    });

    it("should send components array in the filter body", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({
        filter: { components: ["UI", "Cloud"] },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {
        filter: expect.objectContaining({
          components: ["UI", "Cloud"],
          projectId: 10066,
        }),
      });
    });

    it("should send isAutomated boolean in the filter body", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({ filter: { isAutomated: true } });

      expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {
        filter: expect.objectContaining({
          isAutomated: true,
          projectId: 10066,
        }),
      });
    });

    it("should send aiGenerated boolean in the filter body", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({ filter: { aiGenerated: false } });

      expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {
        filter: expect.objectContaining({
          aiGenerated: false,
          projectId: 10066,
        }),
      });
    });

    it("should accept call with no filter at all", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await expect(instance.handle({})).resolves.toBeDefined();
    });

    it("should send plannedStartDate date range in the filter body", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({
        filter: { plannedStartDate: "01/Apr/2026,30/Apr/2026" },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {
        filter: expect.objectContaining({
          plannedStartDate: "01/Apr/2026,30/Apr/2026",
          projectId: 10066,
        }),
      });
    });

    it("should throw when plannedStartDate has invalid format", async () => {
      await expect(
        instance.handle({ filter: { plannedStartDate: "2026-04-01" } }),
      ).rejects.toThrow();
    });

    it("should throw when createdOn has invalid format", async () => {
      await expect(
        instance.handle({ filter: { createdOn: "2026-05-01" } }),
      ).rejects.toThrow();
    });

    it("should throw when updatedOn has invalid format", async () => {
      await expect(
        instance.handle({ filter: { updatedOn: "2026-05-01" } }),
      ).rejects.toThrow();
    });
  });

  // ---------------------------------------------------------------------------
  // handle — each filter field is accepted individually
  // ---------------------------------------------------------------------------

  describe("handle — filter field acceptance", () => {
    const filtersToTest = [
      { label: "status", filter: { status: ["To Do"] } },
      { label: "assignee", filter: { assignee: ["user-abc"] } },
      { label: "folderId", filter: { folderId: 100 } },
      { label: "labels", filter: { labels: ["Release_1"] } },
      { label: "components", filter: { components: ["UI"] } },
      {
        label: "plannedStartDate",
        filter: { plannedStartDate: "01/Apr/2026,30/Apr/2026" },
      },
      {
        label: "plannedEndDate",
        filter: { plannedEndDate: "01/Apr/2026,30/Apr/2026" },
      },
      { label: "searchText", filter: { searchText: "smoke" } },
      { label: "createdOn", filter: { createdOn: "01/May/2026,20/May/2026" } },
      { label: "updatedOn", filter: { updatedOn: "01/May/2026,21/May/2026" } },
      { label: "priority", filter: { priority: ["High"] } },
      { label: "reporter", filter: { reporter: ["user-reporter-abc"] } },
      { label: "isAutomated", filter: { isAutomated: true } },
      { label: "aiGenerated", filter: { aiGenerated: false } },
    ] as const;

    for (const { label, filter } of filtersToTest) {
      it(`should accept filter with only '${label}'`, async () => {
        mockApiClient.post.mockResolvedValueOnce(mockResponse);
        await expect(instance.handle({ filter })).resolves.toBeDefined();
      });
    }
  });

  // ---------------------------------------------------------------------------
  // handle — response
  // ---------------------------------------------------------------------------

  describe("handle — response", () => {
    it("should return structured content from the API response", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await instance.handle({ filter: { status: ["To Do"] } });

      expect(result.structuredContent).toEqual(mockResponse);
      expect(result.content).toEqual([]);
    });

    it("should parse response with empty status and priority objects", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await instance.handle({ filter: { status: ["To Do"] } });

      expect(result.structuredContent.data[0].status).toEqual({});
      expect(result.structuredContent.data[0].priority).toEqual({});
    });

    it("should return an empty data array when total is 0", async () => {
      mockApiClient.post.mockResolvedValueOnce({
        startAt: 0,
        maxResults: 20,
        total: 0,
        data: [],
      });

      const result = await instance.handle({
        filter: { searchText: "nonexistent" },
      });

      expect(result.structuredContent.total).toBe(0);
      expect(result.structuredContent.data).toEqual([]);
    });

    it("should parse response items with enriched optional fields", async () => {
      const richResponse = {
        startAt: 0,
        maxResults: 20,
        total: 1,
        data: [
          {
            id: "PrCE68uGK8m",
            key: "PROJ-TR-26",
            projectId: 10066,
            summary: "Smoke Test",
            description: "Cycle description",
            status: { id: 31, name: "To Do", color: "#75b7bc" },
            priority: { id: 14, name: "High", color: null },
            assignee: "5b10a2844c20165700ede21f",
            reporter: "6a20b3955d31276811fef32g",
            isAutomated: false,
            labels: [{ id: 1, name: "Release_1" }],
            components: [{ id: 2, name: "UI" }],
            plannedStartDate: "10/May/2026 00:00",
            plannedEndDate: "15/May/2026 00:00",
            archived: false,
          },
        ],
      };
      mockApiClient.post.mockResolvedValueOnce(richResponse);

      const result = await instance.handle({
        filter: { status: ["To Do"] },
        fields: [
          "key",
          "summary",
          "description",
          "status",
          "priority",
          "reporter",
          "labels",
          "components",
          "plannedStartDate",
          "plannedEndDate",
        ],
      });

      const item = result.structuredContent.data[0];
      expect(item.summary).toBe("Smoke Test");
      expect(item.description).toBe("Cycle description");
      expect(item.reporter).toBe("6a20b3955d31276811fef32g");
      expect(item.isAutomated).toBe(false);
      expect(item.labels).toEqual([{ id: 1, name: "Release_1" }]);
      expect(item.components).toEqual([{ id: 2, name: "UI" }]);
      expect(item.plannedStartDate).toBe("10/May/2026 00:00");
    });

    it("should throw when API response does not match schema", async () => {
      mockApiClient.post.mockResolvedValueOnce({ invalid: "response" });

      await expect(
        instance.handle({ filter: { status: ["To Do"] } }),
      ).rejects.toThrow();
    });

    it("should propagate API errors", async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error("Network Error"));

      await expect(
        instance.handle({ filter: { status: ["To Do"] } }),
      ).rejects.toThrow("Network Error");
    });
  });
});
