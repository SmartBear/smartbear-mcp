/**
 * Unit tests for List Builds in Release Tool
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ListBuildsInReleaseTool, ListBuildsInReleaseArgs } from "../../../bugsnag/tools/list-builds-in-release-tool.js";
import { ToolExecutionContext, SharedServices } from "../../../bugsnag/types.js";
import { BuildResponse } from "../../../bugsnag/client/api/Project.js";

// Mock data
const mockBuilds: BuildResponse[] = [
  {
    id: "build-123",
    version: "1.0.0",
    bundle_version: "100",
    release_stage: "production",
    created_at: "2023-01-01T00:00:00Z",
    accumulative_daily_users_seen: 1000,
    accumulative_daily_users_with_unhandled: 50,
    total_sessions_count: 5000,
    unhandled_sessions_count: 100,
    app_version: "1.0.0",
    app_bundle_version: "100",
    metadata: {},
    errors_introduced_count: 2,
    errors_resolved_count: 5
  },
  {
    id: "build-456",
    version: "1.0.1",
    bundle_version: "101",
    release_stage: "production",
    created_at: "2023-01-02T00:00:00Z",
    accumulative_daily_users_seen: 1200,
    accumulative_daily_users_with_unhandled: 30,
    total_sessions_count: 6000,
    unhandled_sessions_count: 80,
    app_version: "1.0.1",
    app_bundle_version: "101",
    metadata: {},
    errors_introduced_count: 1,
    errors_resolved_count: 3
  }
];

describe("ListBuildsInReleaseTool", () => {
  let tool: ListBuildsInReleaseTool;
  let mockServices: jest.Mocked<SharedServices>;
  let context: ToolExecutionContext;

  beforeEach(() => {
    tool = new ListBuildsInReleaseTool();

    mockServices = {
      listBuildsInRelease: vi.fn(),
      getProjects: vi.fn(),
      getProject: vi.fn(),
      getCurrentProject: vi.fn(),
      getInputProject: vi.fn(),
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
      getBuild: vi.fn(),
      listReleases: vi.fn(),
      getRelease: vi.fn(),
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
      expect(tool.name).toBe("list_builds_in_release");
    });

    it("should have proper tool definition", () => {
      expect(tool.definition.title).toBe("List Builds in Release");
      expect(tool.definition.summary).toContain("List builds associated with a specific release");
      expect(tool.definition.purpose).toContain("Retrieve a list of builds for a given release");
      expect(tool.definition.useCases).toHaveLength(4);
      expect(tool.definition.examples).toHaveLength(1);
      expect(tool.definition.hints).toHaveLength(4);
    });

    it("should have correct parameters", () => {
      const paramNames = tool.definition.parameters.map(p => p.name);
      expect(paramNames).toContain("releaseId");
      expect(paramNames).toHaveLength(1);
    });
  });

  describe("execute", () => {
    it("should list builds in release successfully", async () => {
      const args: ListBuildsInReleaseArgs = {
        releaseId: "release-123"
      };

      mockServices.listBuildsInRelease.mockResolvedValue(mockBuilds);

      const result = await tool.execute(args, context);

      expect(mockServices.listBuildsInRelease).toHaveBeenCalledWith("release-123");

      const outerResult = JSON.parse(result.content[0].text);
      const parsedResult = JSON.parse(outerResult.content[0].text);
      expect(parsedResult.data).toHaveLength(2);
      expect(parsedResult.count).toBe(2);
      expect(parsedResult.data[0].id).toBe("build-123");
      expect(parsedResult.data[1].id).toBe("build-456");
    });

    it("should handle empty builds list", async () => {
      const args: ListBuildsInReleaseArgs = {
        releaseId: "release-empty"
      };

      mockServices.listBuildsInRelease.mockResolvedValue([]);

      const result = await tool.execute(args, context);

      const outerResult = JSON.parse(result.content[0].text);
      const parsedResult = JSON.parse(outerResult.content[0].text);
      expect(parsedResult.data).toHaveLength(0);
      expect(parsedResult.count).toBe(0);
    });

    it("should handle missing releaseId parameter", async () => {
      const args: ListBuildsInReleaseArgs = {
        releaseId: ""
      };

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Release ID cannot be empty");
    });

    it("should handle release not found error (404)", async () => {
      const args: ListBuildsInReleaseArgs = {
        releaseId: "invalid-release"
      };

      mockServices.listBuildsInRelease.mockRejectedValue(new Error("404 Not Found"));

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Release with ID invalid-release not found");
    });

    it("should handle release not found error (not found message)", async () => {
      const args: ListBuildsInReleaseArgs = {
        releaseId: "invalid-release"
      };

      mockServices.listBuildsInRelease.mockRejectedValue(new Error("Release not found"));

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Release with ID invalid-release not found");
    });

    it("should handle access denied error (403)", async () => {
      const args: ListBuildsInReleaseArgs = {
        releaseId: "restricted-release"
      };

      mockServices.listBuildsInRelease.mockRejectedValue(new Error("403 Forbidden"));

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Access denied to release restricted-release");
    });

    it("should handle unauthorized error", async () => {
      const args: ListBuildsInReleaseArgs = {
        releaseId: "restricted-release"
      };

      mockServices.listBuildsInRelease.mockRejectedValue(new Error("unauthorized access"));

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Access denied to release restricted-release");
    });

    it("should handle other API errors", async () => {
      const args: ListBuildsInReleaseArgs = {
        releaseId: "release-123"
      };

      mockServices.listBuildsInRelease.mockRejectedValue(new Error("500 Internal Server Error"));

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("500 Internal Server Error");
    });

    it("should validate required parameters", async () => {
      const args = {}; // Missing releaseId

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Required parameter");
    });

    it("should handle network errors", async () => {
      const args: ListBuildsInReleaseArgs = {
        releaseId: "release-123"
      };

      mockServices.listBuildsInRelease.mockRejectedValue(new Error("Network error"));

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Network error");
    });
  });

  describe("Caching Behavior", () => {
    it("should leverage caching through services", async () => {
      const args: ListBuildsInReleaseArgs = {
        releaseId: "release-123"
      };

      mockServices.listBuildsInRelease.mockResolvedValue(mockBuilds);

      // Call twice to test caching behavior
      await tool.execute(args, context);
      await tool.execute(args, context);

      // The service should handle caching internally
      expect(mockServices.listBuildsInRelease).toHaveBeenCalledTimes(2);
      expect(mockServices.listBuildsInRelease).toHaveBeenCalledWith("release-123");
    });
  });

  describe("Error Message Specificity", () => {
    it("should provide specific error message for 404 errors", async () => {
      const args: ListBuildsInReleaseArgs = {
        releaseId: "missing-release"
      };

      mockServices.listBuildsInRelease.mockRejectedValue(new Error("404"));

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Release with ID missing-release not found");
      expect(result.content[0].text).toContain("Please verify the release ID is correct");
    });

    it("should provide specific error message for 403 errors", async () => {
      const args: ListBuildsInReleaseArgs = {
        releaseId: "forbidden-release"
      };

      mockServices.listBuildsInRelease.mockRejectedValue(new Error("403"));

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Access denied to release forbidden-release");
      expect(result.content[0].text).toContain("Please check your permissions");
    });
  });

  describe("Data Format", () => {
    it("should return builds with all expected fields", async () => {
      const args: ListBuildsInReleaseArgs = {
        releaseId: "release-123"
      };

      mockServices.listBuildsInRelease.mockResolvedValue(mockBuilds);

      const result = await tool.execute(args, context);
      const outerResult = JSON.parse(result.content[0].text);
      const parsedResult = JSON.parse(outerResult.content[0].text);

      const firstBuild = parsedResult.data[0];
      expect(firstBuild).toHaveProperty("id");
      expect(firstBuild).toHaveProperty("version");
      expect(firstBuild).toHaveProperty("bundle_version");
      expect(firstBuild).toHaveProperty("release_stage");
      expect(firstBuild).toHaveProperty("created_at");
      expect(firstBuild).toHaveProperty("accumulative_daily_users_seen");
      expect(firstBuild).toHaveProperty("total_sessions_count");
    });

    it("should maintain build order from API response", async () => {
      const args: ListBuildsInReleaseArgs = {
        releaseId: "release-123"
      };

      mockServices.listBuildsInRelease.mockResolvedValue(mockBuilds);

      const result = await tool.execute(args, context);
      const outerResult = JSON.parse(result.content[0].text);
      const parsedResult = JSON.parse(outerResult.content[0].text);

      expect(parsedResult.data[0].id).toBe("build-123");
      expect(parsedResult.data[1].id).toBe("build-456");
    });
  });
});
