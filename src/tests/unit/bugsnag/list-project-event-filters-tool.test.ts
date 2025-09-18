/**
 * Unit tests for ListProjectEventFiltersTool
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { ListProjectEventFiltersTool } from "../../../bugsnag/tools/list-project-event-filters-tool.js";
import { SharedServices, ToolExecutionContext, BugsnagToolError } from "../../../bugsnag/types.js";
import { Project } from "../../../bugsnag/client/api/CurrentUser.js";
import { EventField } from "../../../bugsnag/client/api/Project.js";
import * as NodeCache from "node-cache";

// Mock event fields data
const mockEventFields: EventField[] = [
  {
    display_id: "error.status",
    custom: false,
    filter_options: {
      type: "enum",
      values: ["open", "fixed", "ignored"]
    },
    pivot_options: {
      type: "enum",
      values: ["open", "fixed", "ignored"]
    }
  },
  {
    display_id: "user.email",
    custom: false,
    filter_options: {
      type: "string"
    },
    pivot_options: {
      type: "string"
    }
  },
  {
    display_id: "app.version",
    custom: false,
    filter_options: {
      type: "string"
    },
    pivot_options: {
      type: "string"
    }
  },
  {
    display_id: "custom.environment",
    custom: true,
    filter_options: {
      type: "string"
    },
    pivot_options: {
      type: "string"
    }
  },
  {
    display_id: "event.since",
    custom: false,
    filter_options: {
      type: "datetime"
    },
    pivot_options: null
  }
];

// Mock project data
const mockProject: Project = {
  id: "project1",
  name: "Test Project",
  slug: "test-project",
  api_key: "api-key-1",
  type: "web",
  url: "https://example.com",
  language: "javascript",
  created_at: "2023-01-01T00:00:00Z",
  updated_at: "2023-01-01T00:00:00Z",
  errors_url: "https://api.bugsnag.com/projects/project1/errors",
  events_url: "https://api.bugsnag.com/projects/project1/events"
};

// Mock NodeCache
function createMockCache(cachedFilters?: EventField[]): jest.Mocked<NodeCache> {
  return {
    get: vi.fn().mockImplementation((key: string) => {
      if (key === "bugsnag_current_project_event_filters") {
        return cachedFilters;
      }
      return undefined;
    }),
    set: vi.fn(),
    del: vi.fn(),
    ttl: vi.fn(),
    keys: vi.fn(),
    has: vi.fn(),
    take: vi.fn(),
    mget: vi.fn(),
    mset: vi.fn(),
    mdel: vi.fn(),
    flush: vi.fn(),
    flushAll: vi.fn(),
    close: vi.fn(),
    getStats: vi.fn(),
    on: vi.fn(),
    once: vi.fn(),
    removeListener: vi.fn(),
    removeAllListeners: vi.fn(),
    setMaxListeners: vi.fn(),
    getMaxListeners: vi.fn(),
    listeners: vi.fn(),
    rawListeners: vi.fn(),
    emit: vi.fn(),
    eventNames: vi.fn(),
    listenerCount: vi.fn(),
    prependListener: vi.fn(),
    prependOnceListener: vi.fn(),
    off: vi.fn()
  } as jest.Mocked<NodeCache>;
}

// Mock SharedServices
function createMockServices(
  cachedFilters?: EventField[],
  currentProject: Project | null = mockProject
): jest.Mocked<SharedServices> {
  const mockCache = createMockCache(cachedFilters);

  return {
    getProjects: vi.fn(),
    getProject: vi.fn(),
    getCurrentProject: vi.fn().mockResolvedValue(currentProject),
    getInputProject: vi.fn(),
    getCurrentUserApi: vi.fn(),
    getErrorsApi: vi.fn(),
    getProjectApi: vi.fn(),
    getCache: vi.fn().mockReturnValue(mockCache),
    getDashboardUrl: vi.fn(),
    getErrorUrl: vi.fn(),
    getProjectApiKey: vi.fn(),
    hasProjectApiKey: vi.fn(),
    getOrganization: vi.fn(),
    getProjectEventFilters: vi.fn().mockResolvedValue(mockEventFields),
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

describe("ListProjectEventFiltersTool", () => {
  let tool: ListProjectEventFiltersTool;
  let mockServices: jest.Mocked<SharedServices>;
  let mockContext: ToolExecutionContext;

  beforeEach(() => {
    tool = new ListProjectEventFiltersTool();
    mockServices = createMockServices();
    mockContext = createMockContext(mockServices);
  });

  describe("tool definition", () => {
    it("should have correct name", () => {
      expect(tool.name).toBe("list_project_event_filters");
    });

    it("should have correct title", () => {
      expect(tool.definition.title).toBe("List Project Event Filters");
    });

    it("should have appropriate use cases", () => {
      expect(tool.definition.useCases).toContain(
        "Discover what filter fields are available before searching for errors"
      );
      expect(tool.definition.useCases).toContain(
        "Find the correct field names for filtering by user, environment, or custom metadata"
      );
      expect(tool.definition.useCases).toContain(
        "Understand filter options and data types for building complex queries"
      );
    });

    it("should have no parameters", () => {
      expect(tool.definition.parameters).toHaveLength(0);
    });

    it("should have examples", () => {
      expect(tool.definition.examples).toHaveLength(1);
      expect(tool.definition.examples[0].description).toBe("Get all available filter fields");
      expect(tool.definition.examples[0].parameters).toEqual({});
    });

    it("should have helpful hints", () => {
      expect(tool.definition.hints).toContain(
        "Use this tool before the List Errors or Get Error tools to understand available filters"
      );
      expect(tool.definition.hints).toContain(
        "Look for display_id field in the response - these are the field names to use in filters"
      );
    });
  });

  describe("execute", () => {
    it("should return cached event filters when available", async () => {
      // Setup cached filters
      mockServices = createMockServices(mockEventFields);
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const data = JSON.parse(result.content[0].text);

      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(mockEventFields.length);
      expect(data).toEqual(mockEventFields);

      // Should not call getCurrentProject or getProjectEventFilters when cached
      expect(mockServices.getCurrentProject).not.toHaveBeenCalled();
      expect(mockServices.getProjectEventFilters).not.toHaveBeenCalled();
    });

    it("should fetch and cache event filters when not cached", async () => {
      // Setup no cached filters
      mockServices = createMockServices(undefined);
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe("text");

      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(mockEventFields.length);
      expect(data).toEqual(mockEventFields);

      // Should call getCurrentProject and getProjectEventFilters
      expect(mockServices.getCurrentProject).toHaveBeenCalledTimes(1);
      expect(mockServices.getProjectEventFilters).toHaveBeenCalledTimes(1);
      expect(mockServices.getProjectEventFilters).toHaveBeenCalledWith(mockProject);

      // Should cache the result
      const mockCache = mockServices.getCache();
      expect(mockCache.set).toHaveBeenCalledWith("bugsnag_current_project_event_filters", mockEventFields);
    });

    it("should handle no current project error", async () => {
      // Setup no cached filters and no current project
      mockServices = createMockServices(undefined, null);
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("No current project found");
      expect(result.content[0].text).toContain("Please configure a project API key or specify a project ID");
    });

    it("should handle empty event filters from service", async () => {
      // Setup no cached filters and empty filters from service
      mockServices = createMockServices(undefined);
      mockServices.getProjectEventFilters.mockResolvedValue([]);
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("No event filters found for the current project");
    });

    it("should handle null event filters from service", async () => {
      // Setup no cached filters and null filters from service
      mockServices = createMockServices(undefined);
      mockServices.getProjectEventFilters.mockResolvedValue(null as any);
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("No event filters found for the current project");
    });

    it("should handle cached empty filters", async () => {
      // Setup cached empty filters
      mockServices = createMockServices([]);
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("No event filters found for the current project");
    });

    it("should handle API errors when fetching current project", async () => {
      // Setup no cached filters and API error
      mockServices = createMockServices(undefined);
      const apiError = new Error("API connection failed");
      mockServices.getCurrentProject.mockRejectedValue(apiError);
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Tool execution failed");
      expect(result.content[0].text).toContain("API connection failed");
    });

    it("should handle API errors when fetching event filters", async () => {
      // Setup no cached filters and API error when fetching filters
      mockServices = createMockServices(undefined);
      const apiError = new Error("Failed to fetch event filters");
      mockServices.getProjectEventFilters.mockRejectedValue(apiError);
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Tool execution failed");
      expect(result.content[0].text).toContain("Failed to fetch event filters");
    });

    it("should preserve all event field properties", async () => {
      mockServices = createMockServices(mockEventFields);
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);

      const eventField = data[0];
      expect(eventField).toHaveProperty("display_id");
      expect(eventField).toHaveProperty("custom");
      expect(eventField).toHaveProperty("filter_options");
      expect(eventField).toHaveProperty("pivot_options");
    });

    it("should return different types of event fields", async () => {
      mockServices = createMockServices(mockEventFields);
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data)).toBe(true);

      // Check for enum type field
      const statusField = data.find((f: EventField) => f.display_id === "error.status");
      expect(statusField).toBeDefined();
      expect(statusField.filter_options.type).toBe("enum");
      expect(statusField.filter_options.values).toContain("open");

      // Check for string type field
      const emailField = data.find((f: EventField) => f.display_id === "user.email");
      expect(emailField).toBeDefined();
      expect(emailField.filter_options.type).toBe("string");

      // Check for custom field
      const customField = data.find((f: EventField) => f.display_id === "custom.environment");
      expect(customField).toBeDefined();
      expect(customField.custom).toBe(true);

      // Check for datetime field
      const datetimeField = data.find((f: EventField) => f.display_id === "event.since");
      expect(datetimeField).toBeDefined();
      expect(datetimeField.filter_options.type).toBe("datetime");
    });

    it("should call cache.get with correct key", async () => {
      mockServices = createMockServices(mockEventFields);
      mockContext = createMockContext(mockServices);

      await tool.execute({}, mockContext);

      const mockCache = mockServices.getCache();
      expect(mockCache.get).toHaveBeenCalledWith("bugsnag_current_project_event_filters");
    });

    it("should not call getCurrentProject when filters are cached", async () => {
      mockServices = createMockServices(mockEventFields);
      mockContext = createMockContext(mockServices);

      await tool.execute({}, mockContext);

      expect(mockServices.getCurrentProject).not.toHaveBeenCalled();
    });
  });

  describe("error handling", () => {
    it("should handle BugsnagToolError appropriately", async () => {
      mockServices = createMockServices(undefined);
      const toolError = new BugsnagToolError("Custom tool error", "test-tool");
      mockServices.getCurrentProject.mockRejectedValue(toolError);
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toBe("Custom tool error");
    });

    it("should handle generic errors", async () => {
      mockServices = createMockServices(undefined);
      const genericError = new Error("Generic error");
      mockServices.getCurrentProject.mockRejectedValue(genericError);
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Tool execution failed: Generic error");
    });

    it("should handle non-Error exceptions", async () => {
      mockServices = createMockServices(undefined);
      mockServices.getCurrentProject.mockRejectedValue("String error");
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Tool execution failed with unknown error: String error");
    });

    it("should handle cache errors gracefully", async () => {
      mockServices = createMockServices(undefined);
      const mockCache = mockServices.getCache();
      mockCache.get.mockImplementation(() => {
        throw new Error("Cache error");
      });
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("Tool execution failed");
      expect(result.content[0].text).toContain("Cache error");
    });
  });

  describe("caching behavior", () => {
    it("should use cache when available and not fetch from API", async () => {
      mockServices = createMockServices(mockEventFields);
      mockContext = createMockContext(mockServices);

      await tool.execute({}, mockContext);

      // Should use cache
      const mockCache = mockServices.getCache();
      expect(mockCache.get).toHaveBeenCalledWith("bugsnag_current_project_event_filters");

      // Should not fetch from API
      expect(mockServices.getCurrentProject).not.toHaveBeenCalled();
      expect(mockServices.getProjectEventFilters).not.toHaveBeenCalled();
    });

    it("should fetch from API and cache when not in cache", async () => {
      mockServices = createMockServices(undefined);
      mockContext = createMockContext(mockServices);

      await tool.execute({}, mockContext);

      // Should try cache first
      const mockCache = mockServices.getCache();
      expect(mockCache.get).toHaveBeenCalledWith("bugsnag_current_project_event_filters");

      // Should fetch from API
      expect(mockServices.getCurrentProject).toHaveBeenCalledTimes(1);
      expect(mockServices.getProjectEventFilters).toHaveBeenCalledTimes(1);

      // Should cache the result
      expect(mockCache.set).toHaveBeenCalledWith("bugsnag_current_project_event_filters", mockEventFields);
    });

    it("should handle cache returning undefined", async () => {
      mockServices = createMockServices(undefined);
      const mockCache = mockServices.getCache();
      mockCache.get.mockReturnValue(undefined);
      mockContext = createMockContext(mockServices);

      await tool.execute({}, mockContext);

      // Should fetch from API when cache returns undefined
      expect(mockServices.getCurrentProject).toHaveBeenCalledTimes(1);
      expect(mockServices.getProjectEventFilters).toHaveBeenCalledTimes(1);
    });

    it("should handle cache returning null", async () => {
      mockServices = createMockServices(undefined);
      const mockCache = mockServices.getCache();
      mockCache.get.mockReturnValue(null);
      mockContext = createMockContext(mockServices);

      await tool.execute({}, mockContext);

      // Should fetch from API when cache returns null
      expect(mockServices.getCurrentProject).toHaveBeenCalledTimes(1);
      expect(mockServices.getProjectEventFilters).toHaveBeenCalledTimes(1);
    });
  });

  describe("edge cases", () => {
    it("should handle single event field", async () => {
      const singleField = [mockEventFields[0]];
      mockServices = createMockServices(singleField);
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data)).toBe(true);
      expect(data).toHaveLength(1);
      expect(data[0]).toEqual(mockEventFields[0]);
    });

    it("should handle event fields with null pivot_options", async () => {
      const fieldsWithNullPivot = [
        {
          display_id: "test.field",
          custom: false,
          filter_options: { type: "string" },
          pivot_options: null
        }
      ];
      mockServices = createMockServices(fieldsWithNullPivot);
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].pivot_options).toBeNull();
    });

    it("should handle event fields with complex filter options", async () => {
      const complexFields = [
        {
          display_id: "complex.field",
          custom: true,
          filter_options: {
            type: "enum",
            values: ["value1", "value2", "value3"],
            multiple: true
          },
          pivot_options: {
            type: "enum",
            values: ["value1", "value2"]
          }
        }
      ];
      mockServices = createMockServices(complexFields);
      mockContext = createMockContext(mockServices);

      const result = await tool.execute({}, mockContext);

      expect(result.content).toHaveLength(1);
      const data = JSON.parse(result.content[0].text);
      expect(Array.isArray(data)).toBe(true);
      expect(data.length).toBeGreaterThan(0);
      expect(data[0].filter_options.multiple).toBe(true);
      expect(data[0].filter_options.values).toHaveLength(3);
    });
  });
});
