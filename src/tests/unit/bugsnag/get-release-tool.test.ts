/**
 * Unit tests for Get Release Tool
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GetReleaseTool, GetReleaseArgs } from "../../../bugsnag/tools/get-release-tool.js";
import { ToolExecutionContext, SharedServices } from "../../../bugsnag/types.js";


// Mock data
const mockProject = {
  id: "proj-123",
  name: "Test Project",
  slug: "test-project"
};

const mockRelease = {
  id: "release-123",
  version: "1.2.0",
  release_stage: "production",
  created_at: "2023-01-01T00:00:00Z",
  source_control: {
    provider: "github",
    repository: "test/repo",
    revision: "abc123"
  },
  stability: {
    user_stability: 0.95,
    session_stability: 0.98,
    meets_targets: true
  },
  error_count: 42,
  build_count: 3
};

describe("GetReleaseTool", () => {
  let tool: GetReleaseTool;
  let mockServices: jest.Mocked<SharedServices>;
  let context: ToolExecutionContext;

  beforeEach(() => {
    // Create mock services
    mockServices = {
      getInputProject: vi.fn(),
      getRelease: vi.fn(),
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
      listProjectErrors: vi.fn(),
      getError: vi.fn(),
      updateError: vi.fn(),
      getEventDetails: vi.fn(),
      listProjectEventFilters: vi.fn(),
      listBuilds: vi.fn(),
      getBuild: vi.fn(),
      listReleases: vi.fn(),
      listBuildsInRelease: vi.fn(),
      getProjectStabilityTargets: vi.fn(),
      addStabilityData: vi.fn(),
    } as any;

    context = {
      services: mockServices,
      getInput: vi.fn()
    };

    tool = new GetReleaseTool();
  });

  describe("execute", () => {
    it("should get release details successfully", async () => {
      // Setup mocks
      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.getRelease.mockResolvedValue(mockRelease);

      const args: GetReleaseArgs = {
        projectId: "proj-123",
        releaseId: "release-123"
      };

      // Execute
      const result = await tool.execute(args, context);

      // Verify
      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const outerResult = JSON.parse(result.content[0].text);
      const responseData = JSON.parse(outerResult.content[0].text);
      expect(responseData).toEqual(mockRelease);

      // Verify service calls
      expect(mockServices.getInputProject).toHaveBeenCalledWith("proj-123");
      expect(mockServices.getRelease).toHaveBeenCalledWith("proj-123", "release-123");
    });

    it("should handle missing release gracefully", async () => {
      // Setup mocks
      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.getRelease.mockRejectedValue(new Error("Release not found"));

      const args: GetReleaseArgs = {
        projectId: "proj-123",
        releaseId: "invalid-release"
      };

      // Execute
      const result = await tool.execute(args, context);

      // Verify
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Release not found");
    });

    it("should handle project not found error", async () => {
      // Setup mocks
      mockServices.getInputProject.mockRejectedValue(new Error("Project not found"));

      const args: GetReleaseArgs = {
        projectId: "invalid-project",
        releaseId: "release-123"
      };

      // Execute
      const result = await tool.execute(args, context);

      // Verify
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Project not found");
    });

    it("should handle API errors gracefully", async () => {
      // Setup mocks
      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.getRelease.mockRejectedValue(new Error("API Error"));

      const args: GetReleaseArgs = {
        projectId: "proj-123",
        releaseId: "release-123"
      };

      // Execute
      const result = await tool.execute(args, context);

      // Verify
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("API Error");
    });

    it("should validate required parameters", async () => {
      const args: GetReleaseArgs = {
        projectId: "proj-123",
        releaseId: "" // Invalid empty release ID
      };

      // Execute
      const result = await tool.execute(args, context);

      // Verify
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Release ID cannot be empty");
    });

    it("should validate missing releaseId parameter", async () => {
      const args: any = {
        projectId: "proj-123"
        // Missing releaseId
      };

      // Execute
      const result = await tool.execute(args, context);

      // Verify
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Required parameter");
    });

    it("should validate missing projectId parameter", async () => {
      const args: any = {
        releaseId: "release-123"
        // Missing projectId
      };

      // Execute
      const result = await tool.execute(args, context);

      // Verify
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Required parameter");
    });
  });

  describe("updateParametersForProjectApiKey", () => {
    it("should include projectId parameter when no project API key", () => {
      tool.updateParametersForProjectApiKey(false);

      const projectIdParam = tool.definition.parameters.find(p => p.name === "projectId");
      expect(projectIdParam).toBeDefined();
      expect(projectIdParam?.required).toBe(true);
    });

    it("should exclude projectId parameter when project API key is configured", () => {
      tool.updateParametersForProjectApiKey(true);

      const projectIdParam = tool.definition.parameters.find(p => p.name === "projectId");
      expect(projectIdParam).toBeUndefined();
    });

    it("should always include releaseId parameter", () => {
      tool.updateParametersForProjectApiKey(false);
      let releaseIdParam = tool.definition.parameters.find(p => p.name === "releaseId");
      expect(releaseIdParam).toBeDefined();
      expect(releaseIdParam?.required).toBe(true);

      tool.updateParametersForProjectApiKey(true);
      releaseIdParam = tool.definition.parameters.find(p => p.name === "releaseId");
      expect(releaseIdParam).toBeDefined();
      expect(releaseIdParam?.required).toBe(true);
    });
  });

  describe("tool definition", () => {
    it("should have correct tool name", () => {
      expect(tool.name).toBe("get_release");
    });

    it("should have proper definition structure", () => {
      expect(tool.definition.title).toBe("Get Release");
      expect(tool.definition.summary).toContain("Get more details for a specific release");
      expect(tool.definition.purpose).toContain("Retrieve detailed information about a release");
      expect(tool.definition.useCases).toHaveLength(4);
      expect(tool.definition.examples).toHaveLength(1);
      expect(tool.definition.hints).toHaveLength(4);
      expect(tool.definition.outputFormat).toContain("JSON object containing release details");
    });

    it("should have required parameters defined", () => {
      const paramNames = tool.definition.parameters.map(p => p.name);
      expect(paramNames).toContain("releaseId");
    });

    it("should have proper example structure", () => {
      const example = tool.definition.examples[0];
      expect(example.description).toBe("Get details for a specific release");
      expect(example.parameters).toHaveProperty("projectId");
      expect(example.parameters).toHaveProperty("releaseId");
      expect(example.expectedOutput).toContain("JSON object with release details");
    });
  });
});
