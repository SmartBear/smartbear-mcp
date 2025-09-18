/**
 * Unit tests for List Releases Tool
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ListReleasesTool, ListReleasesArgs } from "../../../bugsnag/tools/list-releases-tool.js";
import { ToolExecutionContext, SharedServices } from "../../../bugsnag/types.js";


// Mock data
const mockProject = {
  id: "proj-123",
  name: "Test Project",
  slug: "test-project"
};

const mockReleases = [
  {
    id: "release-1",
    version: "1.0.0",
    release_stage: "production",
    created_at: "2023-01-01T00:00:00Z",
    stability: {
      user_stability: 0.95,
      session_stability: 0.98,
      meets_targets: true
    }
  },
  {
    id: "release-2",
    version: "1.1.0",
    release_stage: "production",
    created_at: "2023-01-15T00:00:00Z",
    stability: {
      user_stability: 0.97,
      session_stability: 0.99,
      meets_targets: true
    }
  }
];

describe("ListReleasesTool", () => {
  let tool: ListReleasesTool;
  let mockServices: jest.Mocked<SharedServices>;
  let context: ToolExecutionContext;

  beforeEach(() => {
    // Create mock services
    mockServices = {
      getInputProject: vi.fn(),
      listReleases: vi.fn(),
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
      getRelease: vi.fn(),
      listBuildsInRelease: vi.fn(),
      getProjectStabilityTargets: vi.fn(),
      addStabilityData: vi.fn(),
    } as any;

    context = {
      services: mockServices,
      getInput: vi.fn()
    };

    tool = new ListReleasesTool();
  });

  describe("execute", () => {
    it("should list releases successfully", async () => {
      // Setup mocks
      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.listReleases.mockResolvedValue({
        releases: mockReleases,
        nextUrl: null
      });

      const args: ListReleasesArgs = {
        projectId: "proj-123"
      };

      // Execute
      const result = await tool.execute(args, context);

      // Verify
      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const outerResult = JSON.parse(result.content[0].text);
      const responseData = JSON.parse(outerResult.content[0].text);
      expect(responseData.releases).toEqual(mockReleases);
      expect(responseData.next).toBeNull();

      // Verify service calls
      expect(mockServices.getInputProject).toHaveBeenCalledWith("proj-123");
      expect(mockServices.listReleases).toHaveBeenCalledWith("proj-123", {
        release_stage_name: "production",
        visible_only: true,
        next_url: null
      });
    });

    it("should handle custom release stage filtering", async () => {
      // Setup mocks
      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.listReleases.mockResolvedValue({
        releases: mockReleases.filter(r => r.release_stage === "staging"),
        nextUrl: null
      });

      const args: ListReleasesArgs = {
        projectId: "proj-123",
        releaseStage: "staging"
      };

      // Execute
      const result = await tool.execute(args, context);

      // Verify
      expect(result.isError).toBeFalsy();
      expect(mockServices.listReleases).toHaveBeenCalledWith("proj-123", {
        release_stage_name: "staging",
        visible_only: true,
        next_url: null
      });
    });

    it("should handle visibleOnly parameter", async () => {
      // Setup mocks
      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.listReleases.mockResolvedValue({
        releases: mockReleases,
        nextUrl: null
      });

      const args: ListReleasesArgs = {
        projectId: "proj-123",
        visibleOnly: false
      };

      // Execute
      const result = await tool.execute(args, context);

      // Verify
      expect(result.isError).toBeFalsy();
      expect(mockServices.listReleases).toHaveBeenCalledWith("proj-123", {
        release_stage_name: "production",
        visible_only: false,
        next_url: null
      });
    });

    it("should handle pagination with nextUrl", async () => {
      // Setup mocks
      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.listReleases.mockResolvedValue({
        releases: mockReleases,
        nextUrl: "/projects/proj-123/releases?offset=30&per_page=30"
      });

      const args: ListReleasesArgs = {
        projectId: "proj-123",
        nextUrl: "/projects/proj-123/releases?offset=0&per_page=30"
      };

      // Execute
      const result = await tool.execute(args, context);

      // Verify
      expect(result.isError).toBeFalsy();

      const outerResult = JSON.parse(result.content[0].text);
      const responseData = JSON.parse(outerResult.content[0].text);
      expect(responseData.next).toBe("/projects/proj-123/releases?offset=30&per_page=30");

      expect(mockServices.listReleases).toHaveBeenCalledWith("proj-123", {
        release_stage_name: "production",
        visible_only: true,
        next_url: "/projects/proj-123/releases?offset=0&per_page=30"
      });
    });

    it("should handle empty results", async () => {
      // Setup mocks
      mockServices.getInputProject.mockResolvedValue(mockProject);
      mockServices.listReleases.mockResolvedValue({
        releases: [],
        nextUrl: null
      });

      const args: ListReleasesArgs = {
        projectId: "proj-123"
      };

      // Execute
      const result = await tool.execute(args, context);

      // Verify
      expect(result.isError).toBeFalsy();

      const outerResult = JSON.parse(result.content[0].text);
      const responseData = JSON.parse(outerResult.content[0].text);
      expect(responseData.releases).toEqual([]);
      expect(responseData.next).toBeNull();
    });

    it("should handle project not found error", async () => {
      // Setup mocks
      mockServices.getInputProject.mockRejectedValue(new Error("Project not found"));

      const args: ListReleasesArgs = {
        projectId: "invalid-project"
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
      mockServices.listReleases.mockRejectedValue(new Error("API Error"));

      const args: ListReleasesArgs = {
        projectId: "proj-123"
      };

      // Execute
      const result = await tool.execute(args, context);

      // Verify
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("API Error");
    });

    it("should validate required parameters", async () => {
      const args: ListReleasesArgs = {
        projectId: "" // Invalid empty project ID
      };

      // Execute
      const result = await tool.execute(args, context);

      // Verify
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Project ID cannot be empty");
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
  });

  describe("tool definition", () => {
    it("should have correct tool name", () => {
      expect(tool.name).toBe("list_releases");
    });

    it("should have proper definition structure", () => {
      expect(tool.definition.title).toBe("List Releases");
      expect(tool.definition.summary).toContain("List releases for a project");
      expect(tool.definition.purpose).toContain("Retrieve a list of release summaries");
      expect(tool.definition.useCases).toHaveLength(4);
      expect(tool.definition.examples).toHaveLength(3);
      expect(tool.definition.hints).toHaveLength(4);
    });

    it("should have required parameters defined", () => {
      const paramNames = tool.definition.parameters.map(p => p.name);
      expect(paramNames).toContain("releaseStage");
      expect(paramNames).toContain("visibleOnly");
      expect(paramNames).toContain("next");
    });
  });
});
