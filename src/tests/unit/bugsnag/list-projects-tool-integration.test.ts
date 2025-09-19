/**
 * Integration tests for ListProjectsTool with ToolRegistry
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ListProjectsTool } from "../../../bugsnag/tools/list-projects-tool.js";
import { BugsnagToolRegistry } from "../../../bugsnag/tool-registry.js";
import { SharedServices, ToolExecutionContext } from "../../../bugsnag/types.js";
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
  }
];

// Mock SharedServices
function createMockServices(): jest.Mocked<SharedServices> {
  return {
    getProjects: vi.fn().mockResolvedValue(mockProjects),
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

describe("ListProjectsTool Integration", () => {
  let tool: ListProjectsTool;
  let registry: BugsnagToolRegistry;
  let mockServices: jest.Mocked<SharedServices>;
  let mockContext: ToolExecutionContext;

  beforeEach(() => {
    tool = new ListProjectsTool();
    registry = new BugsnagToolRegistry();
    mockServices = createMockServices();
    mockContext = {
      services: mockServices,
      getInput: vi.fn()
    };
  });

  describe("tool registration", () => {
    it("should register tool successfully", () => {
      expect(() => registry.registerTool(tool)).not.toThrow();
      expect(registry.hasTool("list_projects")).toBe(true);
      expect(registry.getToolCount()).toBe(1);
    });

    it("should retrieve registered tool", () => {
      registry.registerTool(tool);
      const retrievedTool = registry.getTool("list_projects");

      expect(retrievedTool).toBeDefined();
      expect(retrievedTool?.name).toBe("list_projects");
      expect(retrievedTool?.definition.title).toBe("List Projects");
    });

    it("should prevent duplicate registration", () => {
      registry.registerTool(tool);

      expect(() => registry.registerTool(tool)).toThrow(
        "Tool with name 'list_projects' is already registered"
      );
    });

    it("should include tool in discovered tools", () => {
      registry.registerTool(tool);
      // Use configuration that includes List Projects tool
      const config = { includeListProjects: true };
      const discoveredTools = registry.discoverTools(config);

      // Auto-discovery finds all tools, so we should have multiple tools
      expect(discoveredTools.length).toBeGreaterThan(0);
      const listProjectsTool = discoveredTools.find(t => t.name === "list_projects");
      expect(listProjectsTool).toBeDefined();
    });
  });

  describe("tool execution through registry", () => {
    beforeEach(() => {
      registry.registerTool(tool);
    });

    it("should execute tool through registry", async () => {
      const registeredTool = registry.getTool("list_projects");
      expect(registeredTool).toBeDefined();

      const result = await registeredTool!.execute({}, mockContext);

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text);
      expect(data.data).toHaveLength(2);
      expect(data.count).toBe(2);
      expect(mockServices.getProjects).toHaveBeenCalledTimes(1);
    });

    it("should execute tool with pagination through registry", async () => {
      const registeredTool = registry.getTool("list_projects");
      expect(registeredTool).toBeDefined();

      const result = await registeredTool!.execute({ page_size: 1 }, mockContext);

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text);
      expect(data.data).toHaveLength(1);
      expect(data.count).toBe(1);
      expect(data.data[0]).toEqual(mockProjects[0]);
    });

    it("should handle errors through registry", async () => {
      mockServices.getProjects.mockRejectedValue(new Error("API Error"));

      const registeredTool = registry.getTool("list_projects");
      expect(registeredTool).toBeDefined();

      const result = await registeredTool!.execute({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Tool execution failed");
    });
  });

  describe("MCP server registration", () => {
    it("should register with MCP server format", () => {
      registry.registerTool(tool);

      const mockRegister = vi.fn();
      // Use configuration that includes List Projects tool
      const config = { includeListProjects: true };
      registry.registerAllTools(mockRegister, mockContext, config);

      // Auto-discovery registers all tools, so we should have multiple registrations
      expect(mockRegister).toHaveBeenCalled();

      // Find the list_projects tool registration
      const listProjectsCall = mockRegister.mock.calls.find(call =>
        call[0].title === 'List Projects'
      );
      expect(listProjectsCall).toBeDefined();

      const [toolDefinition, executionFunction] = listProjectsCall;

      // Verify tool definition structure
      expect(toolDefinition.title).toBe("List Projects");
      expect(toolDefinition.summary).toBe("List all projects in the organization with optional pagination");
      expect(toolDefinition.purpose).toBe("Retrieve available projects for browsing and selecting which project to analyze");
      expect(toolDefinition.useCases).toHaveLength(3);
      expect(toolDefinition.parameters).toHaveLength(2);
      expect(toolDefinition.examples).toHaveLength(2);
      expect(toolDefinition.hints).toHaveLength(2);

      // Verify parameters
      const paramNames = toolDefinition.parameters.map((p: any) => p.name);
      expect(paramNames).toContain("page_size");
      expect(paramNames).toContain("page");

      // Verify execution function is provided
      expect(typeof executionFunction).toBe("function");
    });

    it("should execute through MCP server registration", async () => {
      registry.registerTool(tool);

      const mockRegister = vi.fn();
      // Use configuration that includes List Projects tool
      const config = { includeListProjects: true };
      registry.registerAllTools(mockRegister, mockContext, config);

      // Find the list_projects tool registration
      const listProjectsCall = mockRegister.mock.calls.find(call =>
        call[0].title === 'List Projects'
      );
      const [, executionFunction] = listProjectsCall;

      const result = await executionFunction({});

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text);
      expect(data.data).toHaveLength(2);
      expect(data.count).toBe(2);
    });

    it("should handle errors in MCP server execution", async () => {
      mockServices.getProjects.mockRejectedValue(new Error("Service Error"));
      registry.registerTool(tool);

      const mockRegister = vi.fn();
      // Use configuration that includes List Projects tool
      const config = { includeListProjects: true };
      registry.registerAllTools(mockRegister, mockContext, config);

      // Find the list_projects tool registration
      const listProjectsCall = mockRegister.mock.calls.find(call =>
        call[0].title === 'List Projects'
      );
      const [, executionFunction] = listProjectsCall;

      const result = await executionFunction({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Service Error");
    });
  });

  describe("registry management", () => {
    it("should clear all tools", () => {
      registry.registerTool(tool);
      expect(registry.getToolCount()).toBe(1);

      registry.clear();
      expect(registry.getToolCount()).toBe(0);
      expect(registry.hasTool("list_projects")).toBe(false);
    });

    it("should get all tools", () => {
      registry.registerTool(tool);
      const allTools = registry.getAllTools();

      expect(allTools).toHaveLength(1);
      expect(allTools[0].name).toBe("list_projects");
    });
  });
});
