/**
 * Unit tests for GetErrorTool
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { GetErrorTool } from "../../../bugsnag/tools/get-error-tool.js";
import { ToolExecutionContext, SharedServices } from "../../../bugsnag/types.js";
import { Project } from "../../../bugsnag/client/api/CurrentUser.js";
import { ErrorAPI } from "../../../bugsnag/client/index.js";

// Mock the shared services
function createMockServices(): jest.Mocked<SharedServices> {
  return {
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
    listBuildsInRelease: vi.fn(),
    getProjectStabilityTargets: vi.fn(),
    addStabilityData: vi.fn(),
  } as jest.Mocked<SharedServices>;
}

// Mock the ErrorAPI
function createMockErrorsApi(): jest.Mocked<ErrorAPI> {
  return {
    viewErrorOnProject: vi.fn(),
    listEventsOnProject: vi.fn(),
    listErrorPivots: vi.fn(),
    updateErrorOnProject: vi.fn(),
    listErrorsOnProject: vi.fn(),
  } as jest.Mocked<ErrorAPI>;
}

describe("GetErrorTool", () => {
  let tool: GetErrorTool;
  let mockServices: jest.Mocked<SharedServices>;
  let mockErrorsApi: jest.Mocked<ErrorAPI>;
  let context: ToolExecutionContext;

  const mockProject: Project = {
    id: "proj-123",
    name: "Test Project",
    slug: "test-project",
    api_key: "api-key-123",
    type: "project",
    url: "https://api.bugsnag.com/projects/proj-123",
    html_url: "https://app.bugsnag.com/test-org/test-project",
    created_at: "2023-01-01T00:00:00Z",
    updated_at: "2023-01-01T00:00:00Z"
  };

  const mockErrorDetails = {
    id: "error-123",
    message: "Test error message",
    status: "open",
    first_seen: "2023-01-01T00:00:00Z",
    last_seen: "2023-01-02T00:00:00Z",
    events_count: 5,
    users_count: 3
  };

  const mockLatestEvent = {
    id: "event-456",
    timestamp: "2023-01-02T00:00:00Z",
    message: "Test error message",
    stacktrace: [
      {
        file: "test.js",
        line: 10,
        method: "testFunction"
      }
    ],
    user: {
      id: "user-789",
      email: "test@example.com"
    }
  };

  const mockPivots = [
    {
      field: "user.email",
      values: [
        { value: "test@example.com", count: 3 },
        { value: "other@example.com", count: 2 }
      ]
    }
  ];

  beforeEach(() => {
    mockServices = createMockServices();
    mockErrorsApi = createMockErrorsApi();

    mockServices.getErrorsApi.mockReturnValue(mockErrorsApi);
    mockServices.getInputProject.mockResolvedValue(mockProject);
    mockServices.getErrorUrl.mockResolvedValue("https://app.bugsnag.com/test-org/test-project/errors/error-123");

    context = {
      services: mockServices,
      getInput: vi.fn()
    };

    tool = new GetErrorTool(false); // No project API key
  });

  describe("constructor", () => {
    it("should create tool with projectId parameter when no project API key", () => {
      const toolWithoutApiKey = new GetErrorTool(false);
      expect(toolWithoutApiKey.definition.parameters).toHaveLength(3);
      expect(toolWithoutApiKey.definition.parameters[0].name).toBe("projectId");
      expect(toolWithoutApiKey.definition.parameters[0].required).toBe(true);
    });

    it("should create tool without projectId parameter when project API key exists", () => {
      const toolWithApiKey = new GetErrorTool(true);
      expect(toolWithApiKey.definition.parameters).toHaveLength(2);
      expect(toolWithApiKey.definition.parameters.find(p => p.name === "projectId")).toBeUndefined();
    });
  });

  describe("execute", () => {
    it("should retrieve error details successfully", async () => {
      // Setup mocks
      mockErrorsApi.viewErrorOnProject.mockResolvedValue({
        body: mockErrorDetails,
        status: 200,
        headers: {}
      });
      mockErrorsApi.listEventsOnProject.mockResolvedValue({
        body: [mockLatestEvent],
        status: 200,
        headers: {}
      });
      mockErrorsApi.listErrorPivots.mockResolvedValue({
        body: mockPivots,
        status: 200,
        headers: {}
      });

      const args = {
        projectId: "proj-123",
        errorId: "error-123"
      };

      const result = await tool.execute(args, context);

      expect(result.isError).toBeFalsy();
      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.error_details).toEqual(mockErrorDetails);
      expect(responseData.latest_event).toEqual(mockLatestEvent);
      expect(responseData.pivots).toEqual(mockPivots);
      expect(responseData.url).toBe("https://app.bugsnag.com/test-org/test-project/errors/error-123");

      // Verify API calls
      expect(mockServices.getInputProject).toHaveBeenCalledWith("proj-123");
      expect(mockErrorsApi.viewErrorOnProject).toHaveBeenCalledWith("proj-123", "error-123");
      expect(mockErrorsApi.listEventsOnProject).toHaveBeenCalledWith(
        "proj-123",
        expect.stringContaining("sort=timestamp&direction=desc&per_page=1&full_reports=true")
      );
      expect(mockErrorsApi.listErrorPivots).toHaveBeenCalledWith("proj-123", "error-123");
      expect(mockServices.getErrorUrl).toHaveBeenCalledWith(
        mockProject,
        "error-123",
        expect.stringContaining("filters%5Berror%5D%5B%5D%5Btype%5D=eq")
      );
    });

    it("should handle missing errorId", async () => {
      const args = {
        projectId: "proj-123"
        // errorId is missing
      };

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Required parameter 'errorId' is missing");
    });

    it("should handle missing projectId when required", async () => {
      const args = {
        errorId: "error-123"
        // projectId is missing
      };

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Required parameter 'projectId' is missing");
    });

    it("should handle error not found", async () => {
      mockErrorsApi.viewErrorOnProject.mockResolvedValue({
        body: null,
        status: 404,
        headers: {}
      });

      const args = {
        projectId: "proj-123",
        errorId: "nonexistent-error"
      };

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Error with ID nonexistent-error not found in project proj-123");
    });

    it("should handle project not found", async () => {
      mockServices.getInputProject.mockRejectedValue(new Error("Project with ID invalid-proj not found."));

      const args = {
        projectId: "invalid-proj",
        errorId: "error-123"
      };

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Project with ID invalid-proj not found");
    });

    it("should apply filters correctly", async () => {
      mockErrorsApi.viewErrorOnProject.mockResolvedValue({
        body: mockErrorDetails,
        status: 200,
        headers: {}
      });
      mockErrorsApi.listEventsOnProject.mockResolvedValue({
        body: [mockLatestEvent],
        status: 200,
        headers: {}
      });
      mockErrorsApi.listErrorPivots.mockResolvedValue({
        body: mockPivots,
        status: 200,
        headers: {}
      });

      const args = {
        projectId: "proj-123",
        errorId: "error-123",
        filters: {
          "event.since": [{ type: "eq" as const, value: "7d" }],
          "user.email": [{ type: "eq" as const, value: "test@example.com" }]
        }
      };

      const result = await tool.execute(args, context);

      expect(result.isError).toBeFalsy();

      // Verify that filters were applied to the events query
      expect(mockErrorsApi.listEventsOnProject).toHaveBeenCalledWith(
        "proj-123",
        expect.stringContaining("filters%5Bevent.since%5D%5B%5D%5Btype%5D=eq")
      );
      expect(mockErrorsApi.listEventsOnProject).toHaveBeenCalledWith(
        "proj-123",
        expect.stringContaining("filters%5Buser.email%5D%5B%5D%5Bvalue%5D=test%40example.com")
      );

      // Verify that filters were applied to the error URL
      expect(mockServices.getErrorUrl).toHaveBeenCalledWith(
        mockProject,
        "error-123",
        expect.stringContaining("filters%5Bevent.since%5D%5B%5D%5Btype%5D=eq")
      );
    });

    it("should handle latest event fetch failure gracefully", async () => {
      mockErrorsApi.viewErrorOnProject.mockResolvedValue({
        body: mockErrorDetails,
        status: 200,
        headers: {}
      });
      mockErrorsApi.listEventsOnProject.mockRejectedValue(new Error("API error"));
      mockErrorsApi.listErrorPivots.mockResolvedValue({
        body: mockPivots,
        status: 200,
        headers: {}
      });

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => { });

      const args = {
        projectId: "proj-123",
        errorId: "error-123"
      };

      const result = await tool.execute(args, context);

      expect(result.isError).toBeFalsy();

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.error_details).toEqual(mockErrorDetails);
      expect(responseData.latest_event).toBeNull();
      expect(responseData.pivots).toEqual(mockPivots);

      expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch latest event:", expect.any(Error));

      consoleSpy.mockRestore();
    });

    it("should handle pivots fetch failure gracefully", async () => {
      mockErrorsApi.viewErrorOnProject.mockResolvedValue({
        body: mockErrorDetails,
        status: 200,
        headers: {}
      });
      mockErrorsApi.listEventsOnProject.mockResolvedValue({
        body: [mockLatestEvent],
        status: 200,
        headers: {}
      });
      mockErrorsApi.listErrorPivots.mockRejectedValue(new Error("API error"));

      const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => { });

      const args = {
        projectId: "proj-123",
        errorId: "error-123"
      };

      const result = await tool.execute(args, context);

      expect(result.isError).toBeFalsy();

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.error_details).toEqual(mockErrorDetails);
      expect(responseData.latest_event).toEqual(mockLatestEvent);
      expect(responseData.pivots).toEqual([]);

      expect(consoleSpy).toHaveBeenCalledWith("Failed to fetch error pivots:", expect.any(Error));

      consoleSpy.mockRestore();
    });

    it("should work without projectId when project API key is configured", async () => {
      const toolWithApiKey = new GetErrorTool(true);

      mockErrorsApi.viewErrorOnProject.mockResolvedValue({
        body: mockErrorDetails,
        status: 200,
        headers: {}
      });
      mockErrorsApi.listEventsOnProject.mockResolvedValue({
        body: [mockLatestEvent],
        status: 200,
        headers: {}
      });
      mockErrorsApi.listErrorPivots.mockResolvedValue({
        body: mockPivots,
        status: 200,
        headers: {}
      });

      const args = {
        errorId: "error-123"
        // No projectId needed when API key is configured
      };

      const result = await toolWithApiKey.execute(args, context);

      expect(result.isError).toBeFalsy();
      expect(mockServices.getInputProject).toHaveBeenCalledWith(undefined);
    });

    it("should validate invalid filter format", async () => {
      const args = {
        projectId: "proj-123",
        errorId: "error-123",
        filters: {
          "invalid.filter": [{ type: "invalid" as any, value: "test" }]
        }
      };

      const result = await tool.execute(args, context);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Invalid value for parameter 'filters'");
    });

    it("should handle empty events response", async () => {
      mockErrorsApi.viewErrorOnProject.mockResolvedValue({
        body: mockErrorDetails,
        status: 200,
        headers: {}
      });
      mockErrorsApi.listEventsOnProject.mockResolvedValue({
        body: [],
        status: 200,
        headers: {}
      });
      mockErrorsApi.listErrorPivots.mockResolvedValue({
        body: mockPivots,
        status: 200,
        headers: {}
      });

      const args = {
        projectId: "proj-123",
        errorId: "error-123"
      };

      const result = await tool.execute(args, context);

      expect(result.isError).toBeFalsy();

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.latest_event).toBeNull();
    });

    it("should handle null events response body", async () => {
      mockErrorsApi.viewErrorOnProject.mockResolvedValue({
        body: mockErrorDetails,
        status: 200,
        headers: {}
      });
      mockErrorsApi.listEventsOnProject.mockResolvedValue({
        body: null,
        status: 200,
        headers: {}
      });
      mockErrorsApi.listErrorPivots.mockResolvedValue({
        body: mockPivots,
        status: 200,
        headers: {}
      });

      const args = {
        projectId: "proj-123",
        errorId: "error-123"
      };

      const result = await tool.execute(args, context);

      expect(result.isError).toBeFalsy();

      const responseData = JSON.parse(result.content[0].text);
      expect(responseData.latest_event).toBeNull();
    });
  });

  describe("tool definition", () => {
    it("should have correct tool name", () => {
      expect(tool.name).toBe("get_error");
    });

    it("should have correct title", () => {
      expect(tool.definition.title).toBe("Get Error");
    });

    it("should have appropriate use cases", () => {
      expect(tool.definition.useCases).toContain("Investigate a specific error found through the List Project Errors tool");
      expect(tool.definition.useCases).toContain("Get error details for debugging and root cause analysis");
    });

    it("should have examples", () => {
      expect(tool.definition.examples).toHaveLength(2);
      expect(tool.definition.examples[0].description).toContain("Get details for a specific error");
      expect(tool.definition.examples[1].description).toContain("Get error details with filters applied");
    });

    it("should have helpful hints", () => {
      expect(tool.definition.hints).toContain("Error IDs can be found using the List Project Errors tool");
      expect(tool.definition.hints).toContain("The URL provided in the response should be shown to the user in all cases as it allows them to view the error in the dashboard and perform further analysis");
    });

    it("should have output format description", () => {
      expect(tool.definition.outputFormat).toContain("error_details");
      expect(tool.definition.outputFormat).toContain("latest_event");
      expect(tool.definition.outputFormat).toContain("pivots");
      expect(tool.definition.outputFormat).toContain("url");
    });
  });
});
