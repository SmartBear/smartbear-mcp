import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../config/constants";
import { CreateTestCase } from "./create-test-case";

describe("CreateTestCase", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockFieldResolver: any;
  let instance: CreateTestCase;

  beforeEach(() => {
    vi.clearAllMocks();

    const mockResolve = vi.fn().mockResolvedValue(undefined);
    mockFieldResolver = {
      requireProjectContext: vi.fn().mockReturnValue({
        projectKey: "PROJ",
        projectId: 10000,
        projectName: "Project Name",
      }),
      getResolver: vi.fn().mockReturnValue({ resolve: mockResolve }),
    };

    mockApiClient = {
      post: vi.fn(),
    };

    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockFieldResolver),
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
      expect(instance.specification.useCases?.length).toBeGreaterThan(0);
    });

    it("should have examples", () => {
      expect(instance.specification.examples?.length).toBeGreaterThan(0);
    });

    it("should have hints", () => {
      expect(instance.specification.hints?.length).toBeGreaterThan(0);
    });
  });

  describe("handle", () => {
    it("should resolve all configured fields and call the create endpoint", async () => {
      const rawArgs = { summary: "Search Functionality" };
      const mockResponse = {
        id: "12345",
        key: "PROJ-TC-1",
        versionNo: 1,
        summary: "Search Functionality",
      };
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await instance.handle(rawArgs);

      // FIELD_CONFIG has 4 entries: PRIORITY, STATUS, COMPONENTS, LABELS, FOLDER
      expect(mockFieldResolver.getResolver).toHaveBeenCalledTimes(5);
      expect(mockFieldResolver.getResolver().resolve).toHaveBeenCalledTimes(5);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.CREATE_TEST_CASE,
        expect.objectContaining({
          summary: "Search Functionality",
          projectId: "10000",
        }),
      );
      expect(result.structuredContent).toEqual(mockResponse);
      expect(result.content).toEqual([]);
    });

    it("should include projectId from context in the body", async () => {
      const rawArgs = { summary: "Test" };
      mockApiClient.post.mockResolvedValueOnce({
        id: "1",
        key: "PROJ-TC-1",
        versionNo: 1,
        summary: "Test",
      });

      await instance.handle(rawArgs);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.CREATE_TEST_CASE,
        expect.objectContaining({ projectId: "10000" }),
      );
    });

    it("should return warnings when resolve pushes them", async () => {
      const rawArgs = { summary: "Test", priority: "NonExistent" };
      mockFieldResolver.getResolver.mockReturnValue({
        resolve: vi
          .fn()
          .mockImplementation(
            (
              _field: string,
              _key: string,
              _body: Record<string, unknown>,
              _context: unknown,
              warnings: string[],
            ) => {
              warnings.push(
                "Skipped priority 'NonExistent' — not available in the current project.",
              );
              return Promise.resolve();
            },
          ),
      });
      mockApiClient.post.mockResolvedValueOnce({
        id: "1",
        key: "PROJ-TC-1",
        versionNo: 1,
        summary: "Test",
      });

      const result = await instance.handle(rawArgs);

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({
        type: "text",
        text: expect.stringContaining("NonExistent"),
      });
    });

    it("should throw when project context is not set", async () => {
      mockFieldResolver.requireProjectContext.mockImplementation(() => {
        throw new Error("No active project set");
      });

      await expect(instance.handle({ summary: "Test" })).rejects.toThrow(
        "No active project set",
      );
    });

    it("should propagate API errors", async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error("API Error"));

      await expect(instance.handle({ summary: "Test" })).rejects.toThrow(
        "API Error",
      );
    });

    it("should validate API response against schema", async () => {
      mockApiClient.post.mockResolvedValueOnce({ invalid: "response" });

      await expect(instance.handle({ summary: "Test" })).rejects.toThrow();
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
            expectedResult: "Visible",
          },
        ],
      };
      mockApiClient.post.mockResolvedValueOnce({
        id: "1",
        key: "PROJ-TC-1",
        versionNo: 1,
        summary: "Search Functionality",
      });

      const result = await instance.handle(rawArgs);

      expect(result.structuredContent).toBeDefined();
      expect(result.content).toEqual([]);
    });
  });
});
