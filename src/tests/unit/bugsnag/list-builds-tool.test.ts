/**
 * Unit tests for List Builds Tool
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ListBuildsTool, ListBuildsArgs } from "../../../bugsnag/tools/list-builds-tool.js";
import { ToolExecutionContext, SharedServices } from "../../../bugsnag/types.js";
import { Project } from "../../../bugsnag/client/api/CurrentUser.js";
import { BuildSummaryResponse, StabilityData } from "../../../bugsnag/client/api/Project.js";

// Mock data
const mockProject: Project = {
  id: "project-123",
  name: "Test Project",
  slug: "test-project",
  api_key: "api-key-123",
  type: "web",
  url: "https://example.com",
  language: "javascript",
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
  errors_url: "https://api.bugsnag.com/projects/project-123/errors",
  events_url: "https://api.bugsnag.com/projects/project-123/events"
};

const mockBuildWithStability: BuildSummaryResponse & StabilityData = {
  id: "build-123",
  version: "1.0.0",
  bundle_version: "100",
  release_stage: "production",
  created_at: "2023-01-01T00:00:00Z",
  accumulative_daily_users_seen: 1000,
  accumulative_daily_users_with_unhandled: 50,
  total_sessions_count: 5000,
  unhandled_sessions_count: 100,
  user_stability: 0.95,
  session_stability: 0.98,
  stability_target_type: "user",
  target_stability: 0.95,
  critical_stability: 0.90,
  meets_target_stability: true,
  meets_critical_stability: true
};

const mockBuildsResponse = {
  builds: [mockBuildWithStability],
  nextUrl: "https://api.bugsnag.com/projects/project-123/builds?offset=30"
};

describe("ListBuildsTool", () => {
  let tool: ListBuildsTool;
  let mockServices: jest.Mocked<SharedServices>;
  let context: ToolExecutionContext;

  beforeEach(() => {
    tool = new ListBuildsTool();

    mockServices = {
      getInputProject: vi.fn(),
      listBuilds: vi.fn(),
      getProjects: vi.fn(),
      getProject: vi.fn(),
      getCurrentProject: vi.fn(),
      getCurrentUserApi: vi.fn(),
      getErrorsApi: vi.fn(),
      getProjectApi: vi.fn(),
      getCache: vi.fn(),
      getDashboardUrl: vi.fn(),
      getErrorUrl: vi.fn(),
      getProjectApiKey: vi.fn(),
      hasProjectApiKey: vi.fn(),
      getOrganization: vi.fn(),
      getProjectEventFilters: vi.fn(),
      getEvent: vi.fn(),
      updateError: vi.fn(),
      getBuild: vi.fn(),
      listReleases: vi.fn(),
      getRelease: vi.fn(),
      listBuildsInRelease: vi.fn(),
      getProjectStabilityTargets: vi.fn(),
      addStabilityData: vi.fn()
    } as any;

    context = {
      services: mockServices,
      getInput: vi.fn()
    };
  });

  describe("Tool Definition", () => {
    it("should have correct name", () => {
      expect(tool.name).toBe("list_builds");
    });

    it("should have proper tool definition", () => {
      expect(tool.definition.title).toBe("List Builds");
      expect(tool.definition.summary).toContain("List builds for a project");
      expect(tool.definition.purpose).toContain("Retrieve a list of build summaries");
      expect(tool.definition.useCases).toHaveLength(4);
      expect(tool.definition.examples).toHaveLength(3);
      expect(tool.definition.hints).toHaveLength(4);
    });

    it("should have correct parameters", () => {
      const paramNames = tool.definition.parameters.map(p => p.name);
      expect(paramNames).toContain("releaseStage");
      expect(paramNames).toContain("per_page");
      expect(paramNames).toContain("next");
    });
  });

  describe("execute", () => {
    it("should list builds successfully", async () => {
      const args: ListBuildsArgs = {
        projectId: "project-123"
      };

      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.listBuilds.mockResolvedValue(mockBuildsResponse);

      const result = await tool.execute(args, context);

      expect(mockServices.getInputProject).toHaveBeenCalledWith("project-123");
      expect(mockServices.listBuilds).toHaveBeenCalledWith("project-123", {});
      const outerResult = JSON.parse(result.content[0].text);
      const parsedResult = JSON.parse(outerResult.content[0].text);
      expect(parsedResult).toHaveProperty("data");
      expect(parsedResult).toHaveProperty("count", 1);
      expect(parsedResult).toHaveProperty("next");
    });

    it("should filter builds by release stage", async () => {
      const args: ListBuildsArgs = {
        projectId: "project-123",
        releaseStage: "production"
      };

      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.listBuilds.mockResolvedValue(mockBuildsResponse);

      await tool.execute(args, context);

      expect(mockServices.listBuilds).toHaveBeenCalledWith("project-123", {
        release_stage: "production"
      });
    });

    it("should handle pagination parameters", async () => {
      const args: ListBuildsArgs = {
        projectId: "project-123",
        per_page: 50,
        nextUrl: "https://api.bugsnag.com/projects/project-123/builds?offset=30"
      };

      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.listBuilds.mockResolvedValue(mockBuildsResponse);

      await tool.execute(args, context);

      expect(mockServices.listBuilds).toHaveBeenCalledWith("project-123", {
        per_page: 50,
        next_url: "https://api.bugsnag.com/projects/project-123/builds?offset=30"
      });
    });

    it("should handle empty builds list", async () => {
      const args: ListBuildsArgs = {
        projectId: "project-123"
      };

      const emptyResponse = { builds: [], nextUrl: null };

      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.listBuilds.mockResolvedValue(emptyResponse);

      const result = await tool.execute(args, context);

      const outerResult = JSON.parse(result.content[0].text);
      const parsedResult = JSON.parse(outerResult.content[0].text);
      expect(parsedResult).toHaveProperty("data", []);
      expect(parsedResult).toHaveProperty("count", 0);
    });

    it("should handle project not found error", async () => {
      const args: ListBuildsArgs = {
        projectId: "invalid-project"
      };

      mockServices.getInputProject.mockRejectedValue(new Error("Project with ID invalid-project not found."));

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Project with ID invalid-project not found");
    });

    it("should handle API errors gracefully", async () => {
      const args: ListBuildsArgs = {
        projectId: "project-123"
      };

      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.listBuilds.mockRejectedValue(new Error("API Error: 500 Internal Server Error"));

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Tool execution failed");
    });

    it("should validate required parameters", async () => {
      const args = {}; // Missing projectId when required

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Required parameter");
    });
  });

  describe("updateParametersForProjectApiKey", () => {
    it("should include projectId parameter when no API key is configured", () => {
      tool.updateParametersForProjectApiKey(false);

      const paramNames = tool.definition.parameters.map(p => p.name);
      expect(paramNames).toContain("projectId");
    });

    it("should exclude projectId parameter when API key is configured", () => {
      tool.updateParametersForProjectApiKey(true);

      const paramNames = tool.definition.parameters.map(p => p.name);
      expect(paramNames).not.toContain("projectId");
    });
  });

  describe("Stability Data Integration", () => {
    it("should return builds with stability metrics", async () => {
      const args: ListBuildsArgs = {
        projectId: "project-123"
      };

      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.listBuilds.mockResolvedValue(mockBuildsResponse);

      const result = await tool.execute(args, context);
      const outerResult = JSON.parse(result.content[0].text);
      const parsedResult = JSON.parse(outerResult.content[0].text);

      expect(parsedResult.data[0]).toHaveProperty("user_stability");
      expect(parsedResult.data[0]).toHaveProperty("session_stability");
      expect(parsedResult.data[0]).toHaveProperty("meets_target_stability");
      expect(parsedResult.data[0]).toHaveProperty("meets_critical_stability");
    });

    it("should include stability target information", async () => {
      const args: ListBuildsArgs = {
        projectId: "project-123"
      };

      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.listBuilds.mockResolvedValue(mockBuildsResponse);

      const result = await tool.execute(args, context);
      const outerResult = JSON.parse(result.content[0].text);
      const parsedResult = JSON.parse(outerResult.content[0].text);

      expect(parsedResult.data[0]).toHaveProperty("stability_target_type", "user");
      expect(parsedResult.data[0]).toHaveProperty("target_stability", 0.95);
      expect(parsedResult.data[0]).toHaveProperty("critical_stability", 0.90);
    });
  });
});
