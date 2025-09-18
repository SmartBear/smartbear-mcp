/**
 * Unit tests for ListProjectsTool
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ListProjectsTool } from "../../../bugsnag/tools/list-projects-tool.js";
import { SharedServices, ToolExecutionContext, BugsnagToolError } from "../../../bugsnag/types.js";
import { Project } from "../../../bugsnag/client/api/CurrentUser.js";

// Mock projects data
const mockProjects: Project[] = [
  {
    id: "project1",
    name: "Test Project 1",
    slug: "test-project-1",
    api_key: "api-key-1",
    type: "web",
    url: "https://example.com",
    language: "javascript",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z",
    errors_url: "https://api.bugsnag.com/projects/project1/errors",
    events_url: "https://api.bugsnag.com/projects/project1/events"
  },
  {
    id: "project2",
    name: "Test Project 2",
    slug: "test-project-2",
    api_key: "api-key-2",
    type: "mobile",
    url: "https://example2.com",
    language: "swift",
    created_at: "2023-01-02T00:00:00Z",
    updated_at: "2023-01-02T00:00:00Z",
    errors_url: "https://api.bugsnag.com/projects/project2/errors",
    events_url: "https://api.bugsnag.com/projects/project2/events"
  },
  {
    id: "project3",
    name: "Test Project 3",
    slug: "test-project-3",
    api_key: "api-key-3",
    type: "web",
    url: "https://example3.com",
    language: "python",
    created_at: "2023-01-03T00:00:00Z",
    updated_at: "2023-01-03T00:00:00Z",
    errors_url: "https://api.bugsnag.com/projects/project3/errors",
    events_url: "https://api.bugsnag.com/projects/project3/events"
  }
];

// Mock SharedServices
function createMockServices(projects: Project[] = mockProjects): jest.Mocked<SharedServices> {
  return {
    getProjects: vi.fn().mockResolvedValue(projects),
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
    listBuildsInRelease: vi.fn(),
    getProjectStabilityTargets: vi.fn(),
    addStabilityData: vi.fn()
  } as jest.Mocked<SharedServices>;
}

// Mock ToolExecutionContext
function createMockContext(services: SharedServices): ToolExecutionContext {
  return {
    services,
    getInput: vi.fn()
  };
}

describe("ListProjectsTool", () => {
  let tool: ListProjectsTool;
  let mockServices: jest.Mocked<SharedServices>;
  let mockContext: ToolExecutionContext;

  beforeEach(() => {
    tool = new ListProjectsTool();
    mockServices = createMockServices();
    mockContext = createMockContext(mockServices);
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(tool.name).toBe("list_projects");
    });

    it("should have correct title", () => {
      expect(tool.definition.title).toBe("List Projects");
    });

    it("should have appropriate use cases", () => {
      expect(tool.definition.useCases).toContain(
        "Browse available projects when no specific project API key is configured"
      );
      expect(tool.definition.useCases).toContain(
        "Find project IDs needed for other tools"
      );
      expect(tool.definition.useCases).toContain(
        "Get an overview of all projects in the organization"
      );
    });

    it("should have pagination parameters", () => {
      const paramNames = tool.definition.parameters.map(p => p.name);
      expect(paramNames).toContain("page_size");
      expect(paramNames).toContain("page");
    });

    it("should have examples", () => {
      expect(tool.definition.examples).toHaveLength(2);
      expect(tool.definition.examples[0].description).toBe("Get first 10 projects");
      expect(tool.definition.examples[1].description).toBe("Get all projects (no pagination)");
    });
  });

  describe("execute", () => {
    it("should return all projects when no pagination is specified", async () => {
      const result = await tool.execute({}, mockContext);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const data = JSON.parse(result.content[0].text);
      expect(data.data).toHaveLength(3);
      expect(data.count).toBe(3);
      expect(data.data).toEqual(mockProjects);
    });

    it("should apply pagination when page_size is specified", async () => {
      const result = await tool.execute({ page_size: 2 }, mockContext);

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text);
      expect(data.data).toHaveLength(2);
      expect(data.count).toBe(2);
      expect(data.data[0]).toEqual(mockProjects[0]);
      expect(data.data[1]).toEqual(mockProjects[1]);
    });

    it("should apply pagination when both page_size and page are specified", async () => {
      const result = await tool.execute({ page_size: 2, page: 2 }, mockContext);

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text);
      expect(data.data).toHaveLength(1);
      expect(data.count).toBe(1);
      expect(data.data[0]).toEqual(mockProjects[2]);
    });

    it("should handle page parameter without page_size (defaults to 10)", async () => {
      const result = await tool.execute({ page: 1 }, mockContext);

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text);
      expect(data.data).toHaveLength(3); // All 3 projects fit in default page size of 10
      expect(data.count).toBe(3);
    });

    it("should handle empty project list", async () => {
      mockServices.getProjects.mockResolvedValue([]);

      const result = await tool.execute({}, mockContext);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toBe("No projects found.");
    });

    it("should handle null project list", async () => {
      mockServices.getProjects.mockResolvedValue(null as any);

      const result = await tool.execute({}, mockContext);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toBe("No projects found.");
    });

    it("should handle pagination beyond available projects", async () => {
      const result = await tool.execute({ page_size: 2, page: 3 }, mockContext);

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text);
      expect(data.data).toHaveLength(0);
      expect(data.count).toBe(0);
    });

    it("should handle API errors gracefully", async () => {
      const apiError = new Error("API connection failed");
      mockServices.getProjects.mockRejectedValue(apiError);

      const result = await tool.execute({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Tool execution failed");
      expect(result.content[0].text).toContain("API connection failed");
    });

    it("should call getProjects exactly once", async () => {
      await tool.execute({}, mockContext);

      expect(mockServices.getProjects).toHaveBeenCalledTimes(1);
    });
  });

  describe("parameter validation", () => {
    it("should accept valid page_size parameter", async () => {
      const result = await tool.execute({ page_size: 25 }, mockContext);

      expect(result.isError).toBeFalsy();
      expect(mockServices.getProjects).toHaveBeenCalled();
    });

    it("should accept valid page parameter", async () => {
      const result = await tool.execute({ page: 2 }, mockContext);

      expect(result.isError).toBeFalsy();
      expect(mockServices.getProjects).toHaveBeenCalled();
    });

    it("should reject invalid page_size (too large)", async () => {
      const result = await tool.execute({ page_size: 150 }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid value for parameter 'page_size'");
    });

    it("should reject invalid page_size (zero)", async () => {
      const result = await tool.execute({ page_size: 0 }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid value for parameter 'page_size'");
    });

    it("should reject invalid page_size (negative)", async () => {
      const result = await tool.execute({ page_size: -1 }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid value for parameter 'page_size'");
    });

    it("should reject invalid page (zero)", async () => {
      const result = await tool.execute({ page: 0 }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid value for parameter 'page'");
    });

    it("should reject invalid page (negative)", async () => {
      const result = await tool.execute({ page: -1 }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid value for parameter 'page'");
    });

    it("should reject non-integer page_size", async () => {
      const result = await tool.execute({ page_size: 10.5 }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid value for parameter 'page_size'");
    });

    it("should reject non-integer page", async () => {
      const result = await tool.execute({ page: 1.5 }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid value for parameter 'page'");
    });
  });

  describe("edge cases", () => {
    it("should handle large page numbers gracefully", async () => {
      const result = await tool.execute({ page: 1000 }, mockContext);

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text);
      expect(data.data).toHaveLength(0);
      expect(data.count).toBe(0);
    });

    it("should handle maximum allowed page_size", async () => {
      const result = await tool.execute({ page_size: 100 }, mockContext);

      expect(result.isError).toBeFalsy();
      const data = JSON.parse(result.content[0].text);
      expect(data.data).toHaveLength(3); // All projects returned
      expect(data.count).toBe(3);
    });

    it("should handle single project in organization", async () => {
      mockServices.getProjects.mockResolvedValue([mockProjects[0]]);

      const result = await tool.execute({}, mockContext);

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text);
      expect(data.data).toHaveLength(1);
      expect(data.count).toBe(1);
      expect(data.data[0]).toEqual(mockProjects[0]);
    });

    it("should preserve all project properties", async () => {
      const result = await tool.execute({ page_size: 1 }, mockContext);

      const data = JSON.parse(result.content[0].text);
      const project = data.data[0];

      expect(project).toHaveProperty("id");
      expect(project).toHaveProperty("name");
      expect(project).toHaveProperty("slug");
      expect(project).toHaveProperty("api_key");
      expect(project).toHaveProperty("type");
      expect(project).toHaveProperty("url");
      expect(project).toHaveProperty("language");
      expect(project).toHaveProperty("created_at");
      expect(project).toHaveProperty("updated_at");
      expect(project).toHaveProperty("errors_url");
      expect(project).toHaveProperty("events_url");
    });
  });

  describe("error handling", () => {
    it("should handle BugsnagToolError appropriately", async () => {
      const toolError = new BugsnagToolError("Custom tool error", "test-tool");
      mockServices.getProjects.mockRejectedValue(toolError);

      const result = await tool.execute({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe("Custom tool error");
    });

    it("should handle generic errors", async () => {
      const genericError = new Error("Generic error");
      mockServices.getProjects.mockRejectedValue(genericError);

      const result = await tool.execute({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Tool execution failed: Generic error");
    });

    it("should handle non-Error exceptions", async () => {
      mockServices.getProjects.mockRejectedValue("String error");

      const result = await tool.execute({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Tool execution failed with unknown error: String error");
    });
  });
});
