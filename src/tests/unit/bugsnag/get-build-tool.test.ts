/**
 * Unit tests for Get Build Tool
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GetBuildTool, GetBuildArgs } from "../../../bugsnag/tools/get-build-tool.js";
import { ToolExecutionContext, SharedServices } from "../../../bugsnag/types.js";
import { Project } from "../../../bugsnag/client/api/CurrentUser.js";
import { BuildResponse, StabilityData } from "../../../bugsnag/client/api/Project.js";

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

const mockBuildWithStability: BuildResponse & StabilityData = {
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
  meets_critical_stability: true,
  // Additional BuildResponse fields
  app_version: "1.0.0",
  app_bundle_version: "100",
  metadata: {},
  errors_introduced_count: 2,
  errors_resolved_count: 5
};

describe("GetBuildTool", () => {
  let tool: GetBuildTool;
  let mockServices: jest.Mocked<SharedServices>;
  let context: ToolExecutionContext;

  beforeEach(() => {
    tool = new GetBuildTool();

    mockServices = {
      getInputProject: vi.fn(),
      getBuild: vi.fn(),
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
      listBuilds: vi.fn(),
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
      expect(tool.name).toBe("get_build");
    });

    it("should have proper tool definition", () => {
      expect(tool.definition.title).toBe("Get Build");
      expect(tool.definition.summary).toContain("Get more details for a specific build");
      expect(tool.definition.purpose).toContain("Retrieve detailed information about a build");
      expect(tool.definition.useCases).toHaveLength(4);
      expect(tool.definition.examples).toHaveLength(1);
      expect(tool.definition.hints).toHaveLength(4);
    });

    it("should have correct parameters", () => {
      const paramNames = tool.definition.parameters.map(p => p.name);
      expect(paramNames).toContain("buildId");
    });
  });

  describe("execute", () => {
    it("should get build details successfully", async () => {
      const args: GetBuildArgs = {
        projectId: "project-123",
        buildId: "build-123"
      };

      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.getBuild.mockResolvedValue(mockBuildWithStability);

      const result = await tool.execute(args, context);

      expect(mockServices.getInputProject).toHaveBeenCalledWith("project-123");
      expect(mockServices.getBuild).toHaveBeenCalledWith("project-123", "build-123");

      const outerResult = JSON.parse(result.content[0].text);
      const parsedResult = JSON.parse(outerResult.content[0].text);
      expect(parsedResult.id).toBe("build-123");
      expect(parsedResult.version).toBe("1.0.0");
      expect(parsedResult.release_stage).toBe("production");
    });

    it("should include stability data in response", async () => {
      const args: GetBuildArgs = {
        projectId: "project-123",
        buildId: "build-123"
      };

      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.getBuild.mockResolvedValue(mockBuildWithStability);

      const result = await tool.execute(args, context);
      const outerResult = JSON.parse(result.content[0].text);
      const parsedResult = JSON.parse(outerResult.content[0].text);

      expect(parsedResult).toHaveProperty("user_stability", 0.95);
      expect(parsedResult).toHaveProperty("session_stability", 0.98);
      expect(parsedResult).toHaveProperty("stability_target_type", "user");
      expect(parsedResult).toHaveProperty("target_stability", 0.95);
      expect(parsedResult).toHaveProperty("critical_stability", 0.90);
      expect(parsedResult).toHaveProperty("meets_target_stability", true);
      expect(parsedResult).toHaveProperty("meets_critical_stability", true);
    });

    it("should handle missing buildId parameter", async () => {
      const args: GetBuildArgs = {
        projectId: "project-123",
        buildId: ""
      };

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Build ID cannot be empty");
    });

    it("should handle project not found error", async () => {
      const args: GetBuildArgs = {
        projectId: "invalid-project",
        buildId: "build-123"
      };

      mockServices.getInputProject.mockRejectedValue(new Error("Project with ID invalid-project not found."));

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Project with ID invalid-project not found");
    });

    it("should handle build not found error", async () => {
      const args: GetBuildArgs = {
        projectId: "project-123",
        buildId: "invalid-build"
      };

      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.getBuild.mockRejectedValue(new Error("No build for invalid-build found."));

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("No build for invalid-build found");
    });

    it("should handle API errors gracefully", async () => {
      const args: GetBuildArgs = {
        projectId: "project-123",
        buildId: "build-123"
      };

      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.getBuild.mockRejectedValue(new Error("API Error: 500 Internal Server Error"));

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Tool execution failed");
    });

    it("should validate required parameters", async () => {
      const args = {}; // Missing required parameters

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Required parameter");
    });

    it("should work without projectId when project API key is configured", async () => {
      // First update the tool to not require projectId
      tool.updateParametersForProjectApiKey(true);

      const args: GetBuildArgs = {
        buildId: "build-123"
      };

      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.getBuild.mockResolvedValue(mockBuildWithStability);

      const result = await tool.execute(args, context);

      expect(mockServices.getInputProject).toHaveBeenCalledWith(undefined);
      expect(mockServices.getBuild).toHaveBeenCalledWith("project-123", "build-123");
      expect(result.isError).toBeFalsy();
    });
  });

  describe("updateParametersForProjectApiKey", () => {
    it("should include projectId parameter when no API key is configured", () => {
      tool.updateParametersForProjectApiKey(false);

      const paramNames = tool.definition.parameters.map(p => p.name);
      expect(paramNames).toContain("projectId");
      expect(paramNames).toContain("buildId");
    });

    it("should exclude projectId parameter when API key is configured", () => {
      tool.updateParametersForProjectApiKey(true);

      const paramNames = tool.definition.parameters.map(p => p.name);
      expect(paramNames).not.toContain("projectId");
      expect(paramNames).toContain("buildId");
    });
  });

  describe("Caching Behavior", () => {
    it("should leverage caching through services", async () => {
      const args: GetBuildArgs = {
        projectId: "project-123",
        buildId: "build-123"
      };

      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.getBuild.mockResolvedValue(mockBuildWithStability);

      // Call twice to test caching behavior
      await tool.execute(args, context);
      await tool.execute(args, context);

      // The service should handle caching internally
      expect(mockServices.getBuild).toHaveBeenCalledTimes(2);
      expect(mockServices.getBuild).toHaveBeenCalledWith("project-123", "build-123");
    });
  });

  describe("Error Handling", () => {
    it("should handle network errors", async () => {
      const args: GetBuildArgs = {
        projectId: "project-123",
        buildId: "build-123"
      };

      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.getBuild.mockRejectedValue(new Error("Network error"));

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Tool execution failed");
    });

    it("should handle timeout errors", async () => {
      const args: GetBuildArgs = {
        projectId: "project-123",
        buildId: "build-123"
      };

      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.getBuild.mockRejectedValue(new Error("Request timeout"));

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Request timeout");
    });
  });
});
