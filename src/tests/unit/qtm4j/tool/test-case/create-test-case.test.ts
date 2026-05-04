import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../../../../qtm4j/config/constants";
import { withResolution } from "../../../../../qtm4j/resolver/resolution-helper";
import { CreateTestCase } from "../../../../../qtm4j/tool/test-case/create-test-case";

// Mock the resolution helper
vi.mock("../../../../../qtm4j/resolver/resolution-helper");

describe("CreateTestCase", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockFieldResolver: any;
  let instance: CreateTestCase;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFieldResolver = {
      requireProjectContext: vi.fn().mockReturnValue({
        projectKey: "PROJ",
        projectId: 10000,
        projectName: "Project Name",
      }),
    };

    mockApiClient = {
      post: vi.fn(),
    };

    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getFieldResolver: vi.fn().mockReturnValue(mockFieldResolver),
    };

    instance = new CreateTestCase(mockClient as any);
  });

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe("Create Test Case");
      expect(instance.specification.summary).toContain(
        "Create a new test case",
      );
      expect(instance.specification.readOnly).toBe(false);
      expect(instance.specification.idempotent).toBe(false);
    });

    it("should have use cases", () => {
      expect(instance.specification.useCases).toBeDefined();
      expect(instance.specification.useCases.length).toBeGreaterThan(0);
    });

    it("should have examples", () => {
      expect(instance.specification.examples).toBeDefined();
      expect(instance.specification.examples.length).toBeGreaterThan(0);
    });

    it("should have hints", () => {
      expect(instance.specification.hints).toBeDefined();
      expect(instance.specification.hints.length).toBeGreaterThan(0);
    });
  });

  describe("handle", () => {
    it("should create a simple test case without field resolution", async () => {
      const rawArgs = {
        summary: "Search Functionality",
      };

      const resolvedBody = {
        summary: "Search Functionality",
        projectId: "10000",
      };

      vi.mocked(withResolution).mockResolvedValueOnce({
        body: resolvedBody,
        context: {
          projectKey: "PROJ",
          projectId: 10000,
          projectName: "Project Name",
        },
        warnings: [],
      });

      const mockResponse = {
        id: "12345",
        key: "PROJ-TC-1",
        versionNo: 1,
        summary: "Search Functionality",
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await instance.handle(rawArgs);

      expect(mockFieldResolver.requireProjectContext).toHaveBeenCalled();
      expect(withResolution).toHaveBeenCalled();
      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.CREATE_TEST_CASE,
        resolvedBody,
      );
      expect(result.structuredContent).toEqual(mockResponse);
      expect(result.content).toEqual([]);
    });

    it("should create test case with resolved fields", async () => {
      const rawArgs = {
        summary: "Search Functionality",
        priority: "High",
        status: "To Do",
      };

      const resolvedBody = {
        summary: "Search Functionality",
        priority: 1,
        status: 10,
        projectId: "10000",
      };

      vi.mocked(withResolution).mockResolvedValueOnce({
        body: resolvedBody,
        context: {
          projectKey: "PROJ",
          projectId: 10000,
          projectName: "Project Name",
        },
        warnings: [],
      });

      const mockResponse = {
        id: "12345",
        key: "PROJ-TC-1",
        versionNo: 1,
        summary: "Search Functionality",
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await instance.handle(rawArgs);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.CREATE_TEST_CASE,
        resolvedBody,
      );
      expect(result.structuredContent).toEqual(mockResponse);
      expect(result.content).toEqual([]);
    });

    it("should create test case with labels and components", async () => {
      const rawArgs = {
        summary: "Search Functionality",
        labels: ["Release_1", "Sprint 1"],
        components: ["UI", "Cloud"],
      };

      const resolvedBody = {
        summary: "Search Functionality",
        labels: [100, 101],
        components: [200, 201],
        projectId: "10000",
      };

      vi.mocked(withResolution).mockResolvedValueOnce({
        body: resolvedBody,
        context: {
          projectKey: "PROJ",
          projectId: 10000,
          projectName: "Project Name",
        },
        warnings: [],
      });

      const mockResponse = {
        id: "12345",
        key: "PROJ-TC-1",
        versionNo: 1,
        summary: "Search Functionality",
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await instance.handle(rawArgs);

      expect(result.structuredContent).toEqual(mockResponse);
    });

    it("should create test case with steps", async () => {
      const rawArgs = {
        summary: "Search Functionality",
        steps: [
          {
            stepDetails: "Enter keyword",
            testData: "keyword = Test",
            expectedResult: "Keyword visible",
          },
          {
            stepDetails: "Click search",
            testData: "Click button",
            expectedResult: "Results displayed",
          },
        ],
      };

      const resolvedBody = {
        summary: "Search Functionality",
        steps: rawArgs.steps,
        projectId: "10000",
      };

      vi.mocked(withResolution).mockResolvedValueOnce({
        body: resolvedBody,
        context: {
          projectKey: "PROJ",
          projectId: 10000,
          projectName: "Project Name",
        },
        warnings: [],
      });

      const mockResponse = {
        id: "12345",
        key: "PROJ-TC-1",
        versionNo: 1,
        summary: "Search Functionality",
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await instance.handle(rawArgs);

      expect(result.structuredContent).toEqual(mockResponse);
    });

    it("should return warnings when field resolution fails", async () => {
      const rawArgs = {
        summary: "Search Functionality",
        priority: "NonExistent",
      };

      const resolvedBody = {
        summary: "Search Functionality",
        priority: "NonExistent",
        projectId: "10000",
      };

      vi.mocked(withResolution).mockResolvedValueOnce({
        body: resolvedBody,
        context: {
          projectKey: "PROJ",
          projectId: 10000,
          projectName: "Project Name",
        },
        warnings: [
          "Skipped priority 'NonExistent' — not available in the current project.",
        ],
      });

      const mockResponse = {
        id: "12345",
        key: "PROJ-TC-1",
        versionNo: 1,
        summary: "Search Functionality",
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await instance.handle(rawArgs);

      expect(result.structuredContent).toEqual(mockResponse);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({
        type: "text",
        text: expect.stringContaining("Note:"),
      });
      expect(result.content[0]).toMatchObject({
        type: "text",
        text: expect.stringContaining("Skipped priority"),
      });
    });

    it("should handle multiple warnings", async () => {
      const rawArgs = {
        summary: "Search Functionality",
        priority: "NonExistent",
        labels: ["Invalid1", "Invalid2"],
      };

      const resolvedBody = {
        summary: "Search Functionality",
        projectId: "10000",
      };

      vi.mocked(withResolution).mockResolvedValueOnce({
        body: resolvedBody,
        context: {
          projectKey: "PROJ",
          projectId: 10000,
          projectName: "Project Name",
        },
        warnings: [
          "Skipped priority 'NonExistent' — not available in the current project.",
          "Skipped labels 'Invalid1' — not available in the current project.",
          "Skipped labels 'Invalid2' — not available in the current project.",
        ],
      });

      const mockResponse = {
        id: "12345",
        key: "PROJ-TC-1",
        versionNo: 1,
        summary: "Search Functionality",
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await instance.handle(rawArgs);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("Invalid1");
      expect(result.content[0].text).toContain("Invalid2");
    });

    it("should throw error when project context is not set", async () => {
      mockFieldResolver.requireProjectContext.mockImplementation(() => {
        throw new Error("No active project set");
      });

      const rawArgs = {
        summary: "Search Functionality",
      };

      await expect(instance.handle(rawArgs)).rejects.toThrow(
        "No active project set",
      );
    });

    it("should propagate API errors", async () => {
      const rawArgs = {
        summary: "Search Functionality",
      };

      vi.mocked(withResolution).mockResolvedValueOnce({
        body: { summary: "Search Functionality", projectId: "10000" },
        context: {
          projectKey: "PROJ",
          projectId: 10000,
          projectName: "Project Name",
        },
        warnings: [],
      });

      mockApiClient.post.mockRejectedValueOnce(new Error("API Error"));

      await expect(instance.handle(rawArgs)).rejects.toThrow("API Error");
    });

    it("should validate API response against schema", async () => {
      const rawArgs = {
        summary: "Search Functionality",
      };

      vi.mocked(withResolution).mockResolvedValueOnce({
        body: { summary: "Search Functionality", projectId: "10000" },
        context: {
          projectKey: "PROJ",
          projectId: 10000,
          projectName: "Project Name",
        },
        warnings: [],
      });

      // Invalid response missing required fields
      mockApiClient.post.mockResolvedValueOnce({
        invalid: "response",
      });

      await expect(instance.handle(rawArgs)).rejects.toThrow();
    });

    it("should create test case with all optional fields", async () => {
      const rawArgs = {
        summary: "Search Functionality",
        description: "Test description",
        priority: "High",
        status: "To Do",
        labels: ["Release_1"],
        components: ["UI"],
        assignee: "user123",
        reporter: "user456",
        folderId: 5000,
        steps: [
          {
            stepDetails: "Enter keyword",
            testData: "keyword = Test",
            expectedResult: "Keyword visible",
          },
        ],
      };

      const resolvedBody = {
        ...rawArgs,
        priority: 1,
        status: 10,
        labels: [100],
        components: [200],
        projectId: "10000",
      };

      vi.mocked(withResolution).mockResolvedValueOnce({
        body: resolvedBody,
        context: {
          projectKey: "PROJ",
          projectId: 10000,
          projectName: "Project Name",
        },
        warnings: [],
      });

      const mockResponse = {
        id: "12345",
        key: "PROJ-TC-1",
        versionNo: 1,
        summary: "Search Functionality",
      };

      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await instance.handle(rawArgs);

      expect(result.structuredContent).toEqual(mockResponse);
      expect(result.content).toEqual([]);
    });
  });
});
