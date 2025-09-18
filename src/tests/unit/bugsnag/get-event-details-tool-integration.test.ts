/**
 * Integration tests for GetEventDetailsTool with ToolRegistry
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GetEventDetailsTool } from "../../../bugsnag/tools/get-event-details-tool.js";
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
    events_url: "https://api.bugsnag.com/projects/project1/events",
    html_url: "https://app.bugsnag.com/my-org/test-project-1",
    release_stages: ["development", "production"],
    collaborators_count: 5,
    global_grouping: {
      message: true,
      stacktrace: true
    },
    location_grouping: {
      enabled: true,
      nearest_code: true
    },
    discarded_app_versions: [],
    discarded_errors: [],
    resolved_app_versions: [],
    custom_event_fields_used: false,
    open_error_count: 10,
    for_review_error_count: 2
  }
];

// Mock event details
const mockEventDetails = {
  id: "event-123",
  project_id: "project1",
  error_id: "error-456",
  received_at: "2023-01-01T12:00:00Z",
  exceptions: [
    {
      errorClass: "TypeError",
      message: "Cannot read property of undefined",
      stacktrace: [
        {
          file: "app.js",
          lineNumber: 42,
          columnNumber: 10,
          method: "processData"
        }
      ]
    }
  ],
  user: {
    id: "user-789",
    email: "user@example.com"
  },
  context: "HomePage",
  breadcrumbs: [
    {
      timestamp: "2023-01-01T11:59:00Z",
      message: "User clicked button",
      type: "user"
    }
  ]
};

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
    getEvent: vi.fn().mockResolvedValue(mockEventDetails),
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

describe("GetEventDetailsTool Integration", () => {
  let tool: GetEventDetailsTool;
  let registry: BugsnagToolRegistry;
  let mockServices: jest.Mocked<SharedServices>;
  let mockContext: ToolExecutionContext;

  beforeEach(() => {
    tool = new GetEventDetailsTool();
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
      expect(registry.hasTool("get_event_details")).toBe(true);
      expect(registry.getToolCount()).toBe(1);
    });

    it("should retrieve registered tool", () => {
      registry.registerTool(tool);
      const retrievedTool = registry.getTool("get_event_details");

      expect(retrievedTool).toBeDefined();
      expect(retrievedTool?.name).toBe("get_event_details");
      expect(retrievedTool?.definition.title).toBe("Get Event Details");
    });

    it("should prevent duplicate registration", () => {
      registry.registerTool(tool);

      expect(() => registry.registerTool(tool)).toThrow(
        "Tool with name 'get_event_details' is already registered"
      );
    });

    it("should include tool in discovered tools", () => {
      registry.registerTool(tool);
      const discoveredTools = registry.discoverTools();

      // Auto-discovery finds all tools, so we should have multiple tools
      expect(discoveredTools.length).toBeGreaterThan(0);
      const getEventDetailsTool = discoveredTools.find(t => t.name === "get_event_details");
      expect(getEventDetailsTool).toBeDefined();
    });
  });

  describe("tool execution through registry", () => {
    beforeEach(() => {
      registry.registerTool(tool);
    });

    it("should execute tool through registry with valid URL", async () => {
      const registeredTool = registry.getTool("get_event_details");
      expect(registeredTool).toBeDefined();

      const validUrl = "https://app.bugsnag.com/my-org/test-project-1/errors/error-456?event_id=event-123";
      const result = await registeredTool!.execute({ link: validUrl }, mockContext);

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data).toEqual(mockEventDetails);
      expect(mockServices.getProjects).toHaveBeenCalledTimes(1);
      expect(mockServices.getEvent).toHaveBeenCalledWith("event-123", "project1");
    });

    it("should handle invalid URL through registry", async () => {
      const registeredTool = registry.getTool("get_event_details");
      expect(registeredTool).toBeDefined();

      const result = await registeredTool!.execute({ link: "invalid-url" }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid value for parameter");
    });

    it("should handle missing project through registry", async () => {
      const registeredTool = registry.getTool("get_event_details");
      expect(registeredTool).toBeDefined();

      const urlWithUnknownProject = "https://app.bugsnag.com/my-org/unknown-project/errors/error-456?event_id=event-123";
      const result = await registeredTool!.execute({ link: urlWithUnknownProject }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Project with the specified slug not found");
    });

    it("should handle API errors through registry", async () => {
      mockServices.getEvent.mockRejectedValue(new Error("API Error"));

      const registeredTool = registry.getTool("get_event_details");
      expect(registeredTool).toBeDefined();

      const validUrl = "https://app.bugsnag.com/my-org/test-project-1/errors/error-456?event_id=event-123";
      const result = await registeredTool!.execute({ link: validUrl }, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Tool execution failed");
    });
  });

  describe("MCP server registration", () => {
    it("should register with MCP server format", () => {
      registry.registerTool(tool);

      const mockRegister = vi.fn();
      registry.registerAllTools(mockRegister, mockContext);

      // Auto-discovery registers all tools, so we should have multiple registrations
      expect(mockRegister).toHaveBeenCalled();

      // Find the get_event_details tool registration
      const getEventDetailsCall = mockRegister.mock.calls.find(call =>
        call[0].title === 'Get Event Details'
      );
      expect(getEventDetailsCall).toBeDefined();

      const [toolDefinition, executionFunction] = getEventDetailsCall;

      // Verify tool definition structure
      expect(toolDefinition.title).toBe("Get Event Details");
      expect(toolDefinition.summary).toBe("Get detailed information about a specific event using its dashboard URL");
      expect(toolDefinition.purpose).toBe("Retrieve event details directly from a dashboard URL for quick debugging");
      expect(toolDefinition.useCases).toHaveLength(3);
      expect(toolDefinition.parameters).toHaveLength(1);
      expect(toolDefinition.examples).toHaveLength(1);
      expect(toolDefinition.hints).toHaveLength(2);

      // Verify parameters
      const paramNames = toolDefinition.parameters.map((p: any) => p.name);
      expect(paramNames).toContain("link");

      // Verify the link parameter is required
      const linkParam = toolDefinition.parameters.find((p: any) => p.name === "link");
      expect(linkParam.required).toBe(true);
      expect(linkParam.description).toContain("dashboard");

      // Verify execution function is provided
      expect(typeof executionFunction).toBe("function");
    });

    it("should execute through MCP server registration", async () => {
      registry.registerTool(tool);

      const mockRegister = vi.fn();
      registry.registerAllTools(mockRegister, mockContext);

      // Find the get_event_details tool registration
      const getEventDetailsCall = mockRegister.mock.calls.find(call =>
        call[0].title === 'Get Event Details'
      );
      const [, executionFunction] = getEventDetailsCall;

      const validUrl = "https://app.bugsnag.com/my-org/test-project-1/errors/error-456?event_id=event-123";
      const result = await executionFunction({ link: validUrl });

      expect(result.content).toHaveLength(1);
      expect(result.isError).toBeUndefined();
      const data = JSON.parse(result.content[0].text);
      expect(data).toEqual(mockEventDetails);
    });

    it("should handle errors in MCP server execution", async () => {
      mockServices.getEvent.mockRejectedValue(new Error("Service Error"));
      registry.registerTool(tool);

      const mockRegister = vi.fn();
      registry.registerAllTools(mockRegister, mockContext);

      // Find the get_event_details tool registration
      const getEventDetailsCall = mockRegister.mock.calls.find(call =>
        call[0].title === 'Get Event Details'
      );
      const [, executionFunction] = getEventDetailsCall;

      const validUrl = "https://app.bugsnag.com/my-org/test-project-1/errors/error-456?event_id=event-123";
      const result = await executionFunction({ link: validUrl });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Service Error");
    });

    it("should handle parameter validation errors in MCP server execution", async () => {
      registry.registerTool(tool);

      const mockRegister = vi.fn();
      registry.registerAllTools(mockRegister, mockContext);

      // Find the get_event_details tool registration
      const getEventDetailsCall = mockRegister.mock.calls.find(call =>
        call[0].title === 'Get Event Details'
      );
      const [, executionFunction] = getEventDetailsCall;

      const result = await executionFunction({}); // Missing required link parameter

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Required parameter 'link' is missing");
    });
  });

  describe("registry management with multiple tools", () => {
    it("should work alongside other tools", () => {
      // This would be expanded when other tools are available
      registry.registerTool(tool);
      expect(registry.getToolCount()).toBe(1);

      const allTools = registry.getAllTools();
      expect(allTools).toHaveLength(1);
      expect(allTools[0].name).toBe("get_event_details");
    });

    it("should clear tool from registry", () => {
      registry.registerTool(tool);
      expect(registry.hasTool("get_event_details")).toBe(true);

      registry.clear();
      expect(registry.hasTool("get_event_details")).toBe(false);
      expect(registry.getToolCount()).toBe(0);
    });
  });

  describe("URL parsing integration", () => {
    beforeEach(() => {
      registry.registerTool(tool);
    });

    it("should handle different URL formats through registry", async () => {
      const registeredTool = registry.getTool("get_event_details");
      expect(registeredTool).toBeDefined();

      // Test with SmartBear Hub URL
      const hubUrl = "https://app.bugsnag.smartbear.com/my-org/test-project-1/errors/error-456?event_id=event-123";
      const result = await registeredTool!.execute({ link: hubUrl }, mockContext);

      expect(result.isError).toBeUndefined();
      expect(mockServices.getEvent).toHaveBeenCalledWith("event-123", "project1");
    });

    it("should handle URLs with additional parameters through registry", async () => {
      const registeredTool = registry.getTool("get_event_details");
      expect(registeredTool).toBeDefined();

      const urlWithExtraParams = "https://app.bugsnag.com/my-org/test-project-1/errors/error-456?event_id=event-123&tab=timeline&filter=user";
      const result = await registeredTool!.execute({ link: urlWithExtraParams }, mockContext);

      expect(result.isError).toBeUndefined();
      expect(mockServices.getEvent).toHaveBeenCalledWith("event-123", "project1");
    });

    it("should handle encoded URLs through registry", async () => {
      const registeredTool = registry.getTool("get_event_details");
      expect(registeredTool).toBeDefined();

      const encodedUrl = "https://app.bugsnag.com/my-org/test-project-1/errors/error-456?event_id=event%2D123";
      const result = await registeredTool!.execute({ link: encodedUrl }, mockContext);

      expect(result.isError).toBeUndefined();
      expect(mockServices.getEvent).toHaveBeenCalledWith("event-123", "project1");
    });
  });
});
