import { beforeEach, describe, expect, it, vi } from "vitest";
import { Configuration } from "../../../bugsnag/client/api/configuration.js";
import { ProjectAPI } from "../../../bugsnag/client/api/Project.js";

describe("ProjectAPI Performance Methods", () => {
  let projectApi: ProjectAPI;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    const mockConfiguration = new Configuration({
      apiKey: "token test-api-key",
      basePath: "https://api.bugsnag.com",
      headers: {
        "Content-Type": "application/json",
      },
    });

    projectApi = new ProjectAPI(mockConfiguration);

    // Mock global fetch
    mockFetch = vi.fn();
    global.fetch = mockFetch;
  });

  describe("getProjectPerformanceScoreOverview", () => {
    it("should call the correct endpoint without releaseStageName", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          performanceScore: 0.95,
          spanCount: 1000,
          timeline: [],
        }),
      });

      const result =
        await projectApi.getProjectPerformanceScoreOverview("project-123");

      expect(mockFetch).toHaveBeenCalledWith(
        "https://api.bugsnag.com/projects/project-123/performance_overview",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
      expect(result.body?.performanceScore).toBe(0.95);
      expect(result.body?.spanCount).toBe(1000);
    });

    it("should include releaseStageName parameter when provided", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => ({}),
      });

      await projectApi.getProjectPerformanceScoreOverview(
        "project-123",
        "production",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("release_stage_name=production"),
        expect.any(Object),
      );
    });
  });

  describe("listProjectSpanGroups", () => {
    it("should call the correct endpoint with pagination", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers({
          Link: '</projects/project-123/span_groups?offset=10>; rel="next"',
        }),
        json: async () => [{ id: "span1" }, { id: "span2" }],
      });

      const result = await projectApi.listProjectSpanGroups(
        "project-123",
        "p95",
        "desc",
        10,
        0,
        undefined,
        false,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/projects/project-123/span_groups"),
        expect.any(Object),
      );
      expect(result.body).toHaveLength(2);
      expect(result.nextUrl).toBeDefined();
      expect(result.nextUrl).toContain("offset=10");
    });

    it("should handle starredOnly parameter", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [],
      });

      await projectApi.listProjectSpanGroups(
        "project-123",
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        true,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("starred_only=true"),
        expect.any(Object),
      );
    });
  });

  describe("getProjectSpanGroup", () => {
    it("should URL-encode span group ID", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => ({
          id: "[HttpClient]GET-api.example.com",
          displayName: "GET api.example.com",
        }),
      });

      await projectApi.getProjectSpanGroup(
        "project-123",
        "[HttpClient]GET-api.example.com",
      );

      // Check that the URL contains encoded brackets
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("%5BHttpClient%5D"),
        expect.any(Object),
      );
    });
  });

  describe("listProjectSpanGroupSummaries", () => {
    it("should call the correct endpoint", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [{ id: "summary1" }, { id: "summary2" }],
      });

      const result = await projectApi.listProjectSpanGroupSummaries(
        "project-123",
        20,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/projects/project-123/span_group_summaries"),
        expect.any(Object),
      );
      expect(result.body).toHaveLength(2);
    });
  });

  describe("getProjectSpanGroupTimeline", () => {
    it("should call the correct endpoint with span group ID", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => ({ timeline: [] }),
      });

      await projectApi.getProjectSpanGroupTimeline("project-123", "span-1");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/projects/project-123/span_groups/span-1/timeline",
        ),
        expect.any(Object),
      );
    });
  });

  describe("getProjectSpanGroupDistribution", () => {
    it("should call the correct endpoint", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => ({ buckets: [] }),
      });

      await projectApi.getProjectSpanGroupDistribution("project-123", "span-1");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/projects/project-123/span_groups/span-1/distribution",
        ),
        expect.any(Object),
      );
    });
  });

  describe("listProjectStarredSpanGroups", () => {
    it("should call the correct endpoint", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [{ id: "starred1" }],
      });

      const result = await projectApi.listProjectStarredSpanGroups(
        "project-123",
        ["HttpClient"],
        10,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/projects/project-123/starred_span_groups"),
        expect.any(Object),
      );
      expect(result.body).toHaveLength(1);
    });
  });

  describe("listProjectSpanGroupPerformanceTargets", () => {
    it("should call the correct endpoint", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [{ id: "target1" }],
      });

      await projectApi.listProjectSpanGroupPerformanceTargets(
        "project-123",
        "span-1",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/projects/project-123/span_groups/span-1/performance_targets",
        ),
        expect.any(Object),
      );
    });
  });

  describe("getSpansByCategoryAndName", () => {
    it("should call the correct endpoint with category and name", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => ({ spans: [] }),
      });

      await projectApi.getSpansByCategoryAndName(
        "project-123",
        "HttpClient",
        "GET-api.example.com",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/projects/project-123/span_group_categories/HttpClient/span_groups/GET-api.example.com/spans",
        ),
        expect.any(Object),
      );
    });
  });

  describe("listSpansBySpanGroupId", () => {
    it("should call the correct endpoint with sorting", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [{ id: "span1" }],
      });

      await projectApi.listSpansBySpanGroupId(
        "project-123",
        "span-group-1",
        undefined,
        "duration",
        "desc",
        20,
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/projects/project-123/span_groups/span-group-1/spans",
        ),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("sort=duration"),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("direction=desc"),
        expect.any(Object),
      );
    });
  });

  describe("listSpansByTraceId", () => {
    it("should call the correct endpoint with time window", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [{ id: "span1" }],
      });

      await projectApi.listSpansByTraceId(
        "project-123",
        "trace-abc123",
        "2024-01-01T00:00:00Z",
        "2024-01-01T23:59:59Z",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/projects/project-123/traces/trace-abc123/spans",
        ),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("from=2024-01-01T00%3A00%3A00Z"),
        expect.any(Object),
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("to=2024-01-01T23%3A59%3A59Z"),
        expect.any(Object),
      );
    });
  });

  describe("listProjectPageLoadSpanGroups", () => {
    it("should call the correct endpoint", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [{ id: "page1" }],
      });

      await projectApi.listProjectPageLoadSpanGroups("project-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/projects/project-123/page_load_span_groups"),
        expect.any(Object),
      );
    });
  });

  describe("getProjectPageLoadSpanGroupById", () => {
    it("should call the correct endpoint with page load ID", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => ({ id: "page1", displayName: "/home" }),
      });

      await projectApi.getProjectPageLoadSpanGroupById(
        "project-123",
        "[FullPageLoad]/home",
      );

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/projects/project-123/page_load_span_groups/"),
        expect.any(Object),
      );
    });
  });

  describe("listProjectTraceFields", () => {
    it("should call the correct endpoint", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => [
          { name: "field1", type: "string" },
          { name: "field2", type: "number" },
        ],
      });

      const result = await projectApi.listProjectTraceFields("project-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/projects/project-123/trace_fields"),
        expect.any(Object),
      );
      expect(result.body).toHaveLength(2);
    });
  });

  describe("getProjectNetworkGroupingRuleset", () => {
    it("should call the correct endpoint", async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        headers: new Headers(),
        json: async () => ({ rules: [] }),
      });

      await projectApi.getProjectNetworkGroupingRuleset("project-123");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(
          "/projects/project-123/network_endpoint_grouping",
        ),
        expect.any(Object),
      );
    });
  });
});
