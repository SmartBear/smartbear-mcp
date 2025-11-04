import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProjectType } from "../../../bugsnag/client/api/api.js";
import type { Project } from "../../../bugsnag/client/api/index.js";
import { BugsnagClient } from "../../../bugsnag/client.js";

// Mock the API modules
vi.mock("../../../bugsnag/client/api/index.js", () => ({
  CurrentUserAPI: vi.fn().mockImplementation(() => ({
    listUserOrganizations: vi.fn(),
    getOrganizationProjects: vi.fn(),
  })),
  ErrorAPI: vi.fn().mockImplementation(() => ({})),
  ProjectAPI: vi.fn().mockImplementation(() => ({
    getProjectPerformanceScoreOverview: vi.fn(),
    listProjectSpanGroups: vi.fn(),
    getProjectSpanGroup: vi.fn(),
    listProjectSpanGroupSummaries: vi.fn(),
    getProjectSpanGroupTimeline: vi.fn(),
    getProjectSpanGroupDistribution: vi.fn(),
    listProjectStarredSpanGroups: vi.fn(),
    listProjectSpanGroupPerformanceTargets: vi.fn(),
    getSpansByCategoryAndName: vi.fn(),
    listSpansBySpanGroupId: vi.fn(),
    listSpansByTraceId: vi.fn(),
    listProjectPageLoadSpanGroups: vi.fn(),
    getProjectPageLoadSpanGroupById: vi.fn(),
    listProjectTraceFields: vi.fn(),
    getProjectNetworkGroupingRuleset: vi.fn(),
  })),
  Configuration: vi.fn().mockImplementation((config) => config),
}));

vi.mock("node-cache", () => ({
  default: vi.fn().mockImplementation(() => ({
    set: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  })),
}));

describe("BugsnagClient Performance Methods", () => {
  let client: BugsnagClient;
  const mockProject: Project = {
    id: "project-123",
    name: "Test Project",
    apiKey: "test-api-key",
    slug: "test-project",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
    errorsUrl: "https://api.bugsnag.com/projects/project-123/errors",
    eventsUrl: "https://api.bugsnag.com/projects/project-123/events",
    url: "https://api.bugsnag.com/projects/project-123",
    htmlUrl: "https://app.bugsnag.com/test-org/test-project",
    openErrorCount: 0,
    collaboratorsCount: 1,
    isFullView: true,
    releaseStages: ["production"],
    language: "javascript",
    type: ProjectType.Js,
    stabilityTargetType: "user",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new BugsnagClient("test-token", "test-api-key");
  });

  describe("getProjectPerformanceScore", () => {
    it("should delegate to ProjectAPI method", async () => {
      const mockResponse = {
        body: { performanceScore: 0.95, spanCount: 1000 },
        nextUrl: null,
        totalCount: null,
      };

      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);
      vi.spyOn(
        (client as any).projectApi,
        "getProjectPerformanceScoreOverview",
      ).mockResolvedValue(mockResponse);

      const result = await client.getProjectPerformanceScore();

      expect(
        (client as any).projectApi.getProjectPerformanceScoreOverview,
      ).toHaveBeenCalledWith("project-123", undefined);
      expect(result).toEqual(mockResponse.body);
    });

    it("should pass releaseStageName parameter", async () => {
      const mockResponse = { body: {}, nextUrl: null, totalCount: null };

      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);
      vi.spyOn(
        (client as any).projectApi,
        "getProjectPerformanceScoreOverview",
      ).mockResolvedValue(mockResponse);

      await client.getProjectPerformanceScore(undefined, "production");

      expect(
        (client as any).projectApi.getProjectPerformanceScoreOverview,
      ).toHaveBeenCalledWith("project-123", "production");
    });
  });

  describe("listSpanGroups", () => {
    it("should delegate to ProjectAPI method with all parameters", async () => {
      const mockResponse = {
        body: [{ id: "span1" }],
        nextUrl: "/next",
        totalCount: 10,
      };

      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);
      vi.spyOn(
        (client as any).projectApi,
        "listProjectSpanGroups",
      ).mockResolvedValue(mockResponse);

      const result = await client.listSpanGroups(
        undefined,
        "p95",
        "desc",
        20,
        0,
        [],
        true,
        "/next",
      );

      expect(
        (client as any).projectApi.listProjectSpanGroups,
      ).toHaveBeenCalledWith(
        "project-123",
        "p95",
        "desc",
        20,
        0,
        [],
        true,
        "/next",
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getSpanGroup", () => {
    it("should throw error if spanGroupId is missing", async () => {
      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);

      await expect(client.getSpanGroup(undefined, undefined)).rejects.toThrow(
        "spanGroupId is required",
      );
    });

    it("should delegate to ProjectAPI when spanGroupId provided", async () => {
      const mockResponse = {
        body: { id: "span1", displayName: "Test Span" },
        nextUrl: null,
        totalCount: null,
      };

      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);
      vi.spyOn(
        (client as any).projectApi,
        "getProjectSpanGroup",
      ).mockResolvedValue(mockResponse);

      await client.getSpanGroup(undefined, "span-1");

      expect(
        (client as any).projectApi.getProjectSpanGroup,
      ).toHaveBeenCalledWith("project-123", "span-1", undefined);
    });
  });

  describe("listSpanGroupSummaries", () => {
    it("should delegate to ProjectAPI method", async () => {
      const mockResponse = {
        body: [{ id: "summary1" }],
        nextUrl: null,
        totalCount: null,
      };

      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);
      vi.spyOn(
        (client as any).projectApi,
        "listProjectSpanGroupSummaries",
      ).mockResolvedValue(mockResponse);

      await client.listSpanGroupSummaries(undefined, 50);

      expect(
        (client as any).projectApi.listProjectSpanGroupSummaries,
      ).toHaveBeenCalledWith(
        "project-123",
        50,
        undefined,
        undefined,
        undefined,
      );
    });
  });

  describe("getSpanGroupTimeline", () => {
    it("should throw error if spanGroupId is missing", async () => {
      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);

      await expect(
        client.getSpanGroupTimeline(undefined, undefined),
      ).rejects.toThrow("spanGroupId is required");
    });

    it("should delegate to ProjectAPI when spanGroupId provided", async () => {
      const mockResponse = {
        body: { timeline: [] },
        nextUrl: null,
        totalCount: null,
      };

      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);
      vi.spyOn(
        (client as any).projectApi,
        "getProjectSpanGroupTimeline",
      ).mockResolvedValue(mockResponse);

      await client.getSpanGroupTimeline(undefined, "span-1");

      expect(
        (client as any).projectApi.getProjectSpanGroupTimeline,
      ).toHaveBeenCalledWith("project-123", "span-1", undefined);
    });
  });

  describe("getSpanGroupDistribution", () => {
    it("should throw error if spanGroupId is missing", async () => {
      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);

      await expect(
        client.getSpanGroupDistribution(undefined, undefined),
      ).rejects.toThrow("spanGroupId is required");
    });

    it("should delegate to ProjectAPI when spanGroupId provided", async () => {
      const mockResponse = {
        body: { buckets: [] },
        nextUrl: null,
        totalCount: null,
      };

      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);
      vi.spyOn(
        (client as any).projectApi,
        "getProjectSpanGroupDistribution",
      ).mockResolvedValue(mockResponse);

      await client.getSpanGroupDistribution(undefined, "span-1");

      expect(
        (client as any).projectApi.getProjectSpanGroupDistribution,
      ).toHaveBeenCalledWith("project-123", "span-1", undefined);
    });
  });

  describe("listStarredSpanGroups", () => {
    it("should delegate to ProjectAPI method", async () => {
      const mockResponse = {
        body: [{ id: "starred1" }],
        nextUrl: null,
        totalCount: null,
      };

      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);
      vi.spyOn(
        (client as any).projectApi,
        "listProjectStarredSpanGroups",
      ).mockResolvedValue(mockResponse);

      await client.listStarredSpanGroups(
        undefined,
        ["HttpClient"],
        10,
        0,
        "/next",
      );

      expect(
        (client as any).projectApi.listProjectStarredSpanGroups,
      ).toHaveBeenCalledWith("project-123", ["HttpClient"], 10, 0, "/next");
    });
  });

  describe("listSpanGroupPerformanceTargets", () => {
    it("should throw error if spanGroupId is missing", async () => {
      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);

      await expect(
        client.listSpanGroupPerformanceTargets(undefined, undefined),
      ).rejects.toThrow("spanGroupId is required");
    });

    it("should delegate to ProjectAPI when spanGroupId provided", async () => {
      const mockResponse = {
        body: [{ id: "target1" }],
        nextUrl: null,
        totalCount: null,
      };

      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);
      vi.spyOn(
        (client as any).projectApi,
        "listProjectSpanGroupPerformanceTargets",
      ).mockResolvedValue(mockResponse);

      await client.listSpanGroupPerformanceTargets(undefined, "span-1");

      expect(
        (client as any).projectApi.listProjectSpanGroupPerformanceTargets,
      ).toHaveBeenCalledWith("project-123", "span-1");
    });
  });

  describe("getSpansByCategoryAndName", () => {
    it("should throw error if category or name is missing", async () => {
      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);

      await expect(
        client.getSpansByCategoryAndName(undefined, undefined, "name"),
      ).rejects.toThrow("category and name are required");

      await expect(
        client.getSpansByCategoryAndName(undefined, "category", undefined),
      ).rejects.toThrow("category and name are required");
    });

    it("should delegate to ProjectAPI when parameters provided", async () => {
      const mockResponse = {
        body: { spans: [] },
        nextUrl: null,
        totalCount: null,
      };

      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);
      vi.spyOn(
        (client as any).projectApi,
        "getSpansByCategoryAndName",
      ).mockResolvedValue(mockResponse);

      await client.getSpansByCategoryAndName(
        undefined,
        "HttpClient",
        "GET-api",
      );

      expect(
        (client as any).projectApi.getSpansByCategoryAndName,
      ).toHaveBeenCalledWith("project-123", "HttpClient", "GET-api");
    });
  });

  describe("listSpansBySpanGroupId", () => {
    it("should throw error if spanGroupId is missing", async () => {
      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);

      await expect(
        client.listSpansBySpanGroupId(undefined, undefined),
      ).rejects.toThrow("spanGroupId is required");
    });

    it("should delegate to ProjectAPI with all parameters", async () => {
      const mockResponse = {
        body: [{ id: "span1" }],
        nextUrl: "/next",
        totalCount: 10,
      };

      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);
      vi.spyOn(
        (client as any).projectApi,
        "listSpansBySpanGroupId",
      ).mockResolvedValue(mockResponse);

      await client.listSpansBySpanGroupId(
        undefined,
        "span-group-1",
        [],
        "duration",
        "desc",
        20,
        "/next",
      );

      expect(
        (client as any).projectApi.listSpansBySpanGroupId,
      ).toHaveBeenCalledWith(
        "project-123",
        "span-group-1",
        [],
        "duration",
        "desc",
        20,
        "/next",
      );
    });
  });

  describe("listSpansByTraceId", () => {
    it("should throw error if required parameters are missing", async () => {
      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);

      await expect(
        client.listSpansByTraceId(
          undefined,
          undefined,
          "2024-01-01",
          "2024-01-02",
        ),
      ).rejects.toThrow("traceId, from, and to are required");

      await expect(
        client.listSpansByTraceId(
          undefined,
          "trace123",
          undefined,
          "2024-01-02",
        ),
      ).rejects.toThrow("traceId, from, and to are required");

      await expect(
        client.listSpansByTraceId(
          undefined,
          "trace123",
          "2024-01-01",
          undefined,
        ),
      ).rejects.toThrow("traceId, from, and to are required");
    });

    it("should delegate to ProjectAPI when all parameters provided", async () => {
      const mockResponse = {
        body: [{ id: "span1" }],
        nextUrl: null,
        totalCount: null,
      };

      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);
      vi.spyOn(
        (client as any).projectApi,
        "listSpansByTraceId",
      ).mockResolvedValue(mockResponse);

      await client.listSpansByTraceId(
        undefined,
        "trace-abc",
        "2024-01-01T00:00:00Z",
        "2024-01-01T23:59:59Z",
        "target-span",
        50,
        "/next",
      );

      expect(
        (client as any).projectApi.listSpansByTraceId,
      ).toHaveBeenCalledWith(
        "project-123",
        "trace-abc",
        "2024-01-01T00:00:00Z",
        "2024-01-01T23:59:59Z",
        "target-span",
        50,
        "/next",
      );
    });
  });

  describe("listPageLoadSpanGroups", () => {
    it("should delegate to ProjectAPI method", async () => {
      const mockResponse = {
        body: [{ id: "page1" }],
        nextUrl: null,
        totalCount: null,
      };

      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);
      vi.spyOn(
        (client as any).projectApi,
        "listProjectPageLoadSpanGroups",
      ).mockResolvedValue(mockResponse);

      await client.listPageLoadSpanGroups(
        undefined,
        "p95",
        "desc",
        10,
        0,
        [],
        false,
        "/next",
      );

      expect(
        (client as any).projectApi.listProjectPageLoadSpanGroups,
      ).toHaveBeenCalledWith(
        "project-123",
        "p95",
        "desc",
        10,
        0,
        [],
        false,
        "/next",
      );
    });
  });

  describe("getPageLoadSpanGroupById", () => {
    it("should throw error if pageLoadSpanGroupId is missing", async () => {
      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);

      await expect(
        client.getPageLoadSpanGroupById(undefined, undefined),
      ).rejects.toThrow("pageLoadSpanGroupId is required");
    });

    it("should delegate to ProjectAPI when pageLoadSpanGroupId provided", async () => {
      const mockResponse = {
        body: { id: "page1", displayName: "/home" },
        nextUrl: null,
        totalCount: null,
      };

      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);
      vi.spyOn(
        (client as any).projectApi,
        "getProjectPageLoadSpanGroupById",
      ).mockResolvedValue(mockResponse);

      await client.getPageLoadSpanGroupById(undefined, "[FullPageLoad]/home");

      expect(
        (client as any).projectApi.getProjectPageLoadSpanGroupById,
      ).toHaveBeenCalledWith("project-123", "[FullPageLoad]/home", undefined);
    });
  });

  describe("listTraceFields", () => {
    it("should delegate to ProjectAPI method", async () => {
      const mockResponse = {
        body: [{ name: "field1" }, { name: "field2" }],
        nextUrl: null,
        totalCount: null,
      };

      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);
      vi.spyOn(
        (client as any).projectApi,
        "listProjectTraceFields",
      ).mockResolvedValue(mockResponse);

      await client.listTraceFields();

      expect(
        (client as any).projectApi.listProjectTraceFields,
      ).toHaveBeenCalledWith("project-123");
    });
  });

  describe("getNetworkGroupingRuleset", () => {
    it("should delegate to ProjectAPI method", async () => {
      const mockResponse = {
        body: { rules: [] },
        nextUrl: null,
        totalCount: null,
      };

      vi.spyOn(client as any, "getInputProject").mockResolvedValue(mockProject);
      vi.spyOn(
        (client as any).projectApi,
        "getProjectNetworkGroupingRuleset",
      ).mockResolvedValue(mockResponse);

      await client.getNetworkGroupingRuleset();

      expect(
        (client as any).projectApi.getProjectNetworkGroupingRuleset,
      ).toHaveBeenCalledWith("project-123");
    });
  });
});
