import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../../config/constants";
import { CreateTestCycle } from "../../../tool/test-cycle/create-test-cycle";

describe("CreateTestCycle", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockFieldResolver: any;
  let instance: CreateTestCycle;

  const PROJECT_CONTEXT = {
    projectId: 10000,
    projectKey: "PROJ",
    projectName: "Project Name",
  };

  const MINIMAL_RESPONSE = { id: "amKIREkhbN8", key: "PROJ-TR-1" };
  const MINIMAL_ARGS = { summary: "Smoke Test Cycle" };

  beforeEach(() => {
    vi.clearAllMocks();

    const mockResolve = vi.fn().mockResolvedValue(undefined);
    mockFieldResolver = {
      requireProjectContext: vi.fn().mockReturnValue(PROJECT_CONTEXT),
      getResolver: vi.fn().mockReturnValue({ resolve: mockResolve }),
    };

    mockApiClient = { post: vi.fn() };

    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockFieldResolver),
    };

    instance = new CreateTestCycle(mockClient as any);
  });

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe("Create Test Cycle");
      expect(instance.specification.summary).toContain(
        "Create a new test cycle",
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
      mockApiClient.post.mockResolvedValueOnce(MINIMAL_RESPONSE);

      const result = await instance.handle(MINIMAL_ARGS);

      // FIELD_CONFIG has 5 entries: PRIORITY, STATUS, FOLDER, LABELS, COMPONENTS
      expect(mockFieldResolver.getResolver).toHaveBeenCalledTimes(5);
      expect(mockFieldResolver.getResolver().resolve).toHaveBeenCalledTimes(5);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.CREATE_TEST_CYCLE,
        expect.objectContaining({
          summary: "Smoke Test Cycle",
          projectId: 10000,
        }),
      );
      expect(result.structuredContent).toEqual(MINIMAL_RESPONSE);
      expect(result.content).toEqual([]);
    });

    it("should always set folderId to 'MCP Generated' before resolution", async () => {
      mockApiClient.post.mockResolvedValueOnce(MINIMAL_RESPONSE);

      await instance.handle(MINIMAL_ARGS);

      const resolveCall = mockFieldResolver
        .getResolver()
        .resolve.mock.calls.find((call: any[]) => call[0] === "folderId");
      expect(resolveCall).toBeDefined();
      expect(resolveCall[2]).toMatchObject({ folderId: "MCP Generated" });
    });

    it("should call the create endpoint with projectId from context", async () => {
      mockApiClient.post.mockResolvedValueOnce(MINIMAL_RESPONSE);

      await instance.handle(MINIMAL_ARGS);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.CREATE_TEST_CYCLE,
        expect.objectContaining({ projectId: 10000 }),
      );
    });

    it("should include all optional scalar fields in the request body", async () => {
      mockApiClient.post.mockResolvedValueOnce(MINIMAL_RESPONSE);

      const rawArgs = {
        summary: "Full Regression",
        status: "To Do",
        description: "Full regression cycle",
        priority: "High",
        reporter: "user-def",
        labels: ["Release_1", "Sprint 1"],
        components: ["UI", "Cloud"],
        plannedStartDate: "10/May/2026 00:00",
        plannedEndDate: "15/May/2026 00:00",
      };

      await instance.handle(rawArgs);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.CREATE_TEST_CYCLE,
        expect.objectContaining({
          summary: "Full Regression",
          description: "Full regression cycle",
          reporter: "user-def",
          plannedStartDate: "10/May/2026 00:00",
          plannedEndDate: "15/May/2026 00:00",
        }),
      );
    });

    it("should return warning when a field cannot be resolved", async () => {
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
                "Skipped priority 'Urgent' — not available in the current project.",
              );
              return Promise.resolve();
            },
          ),
      });
      mockApiClient.post.mockResolvedValueOnce(MINIMAL_RESPONSE);

      const result = await instance.handle({
        summary: "Cycle",
        status: "To Do",
        priority: "Urgent",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({
        type: "text",
        text: expect.stringContaining("Urgent"),
      });
    });

    it("should return warning when priority cannot be resolved", async () => {
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
                "Skipped priority 'Critical' — not available in the current project.",
              );
              return Promise.resolve();
            },
          ),
      });
      mockApiClient.post.mockResolvedValueOnce(MINIMAL_RESPONSE);

      const result = await instance.handle({
        summary: "Cycle",
        priority: "Critical",
      });

      expect(result.content[0].text).toContain("Critical");
    });

    it("should return warning when status cannot be resolved", async () => {
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
                "Skipped status 'Invalid' — not available in the current project.",
              );
              return Promise.resolve();
            },
          ),
      });
      mockApiClient.post.mockResolvedValueOnce(MINIMAL_RESPONSE);

      const result = await instance.handle({
        summary: "Cycle",
        status: "Invalid",
      });

      expect(result.content[0].text).toContain("Invalid");
    });

    it("should return warning when labels cannot be resolved", async () => {
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
                "Skipped labels 'UnknownLabel' — not available in the current project.",
              );
              return Promise.resolve();
            },
          ),
      });
      mockApiClient.post.mockResolvedValueOnce(MINIMAL_RESPONSE);

      const result = await instance.handle({
        summary: "Cycle",
        labels: ["UnknownLabel"],
      });

      expect(result.content[0].text).toContain("UnknownLabel");
    });

    it("should return warning when components cannot be resolved", async () => {
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
                "Skipped components 'UnknownComp' — not available in the current project.",
              );
              return Promise.resolve();
            },
          ),
      });
      mockApiClient.post.mockResolvedValueOnce(MINIMAL_RESPONSE);

      const result = await instance.handle({
        summary: "Cycle",
        components: ["UnknownComp"],
      });

      expect(result.content[0].text).toContain("UnknownComp");
    });

    it("should return empty content when no warnings", async () => {
      mockApiClient.post.mockResolvedValueOnce(MINIMAL_RESPONSE);

      const result = await instance.handle(MINIMAL_ARGS);

      expect(result.content).toEqual([]);
    });

    it("should throw when project context is not set", async () => {
      mockFieldResolver.requireProjectContext.mockImplementation(() => {
        throw new Error("No active project set");
      });

      await expect(instance.handle(MINIMAL_ARGS)).rejects.toThrow(
        "No active project set",
      );
    });

    it("should propagate API errors", async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error("API Error"));

      await expect(instance.handle(MINIMAL_ARGS)).rejects.toThrow("API Error");
    });

    it("should validate API response against schema", async () => {
      mockApiClient.post.mockResolvedValueOnce({ invalid: "response" });

      await expect(instance.handle(MINIMAL_ARGS)).rejects.toThrow();
    });

    it("should reject an invalid plannedStartDate format", async () => {
      await expect(
        instance.handle({
          summary: "Cycle",
          status: "To Do",
          plannedStartDate: "2026-05-10",
        }),
      ).rejects.toThrow();
    });

    it("should reject a blank summary", async () => {
      await expect(
        instance.handle({ summary: "", status: "To Do" }),
      ).rejects.toThrow();
    });

    it("should reject a summary exceeding 255 characters", async () => {
      await expect(
        instance.handle({ summary: "a".repeat(256), status: "To Do" }),
      ).rejects.toThrow();
    });

    it("should reject an invalid plannedEndDate format", async () => {
      await expect(
        instance.handle({ summary: "Cycle", plannedEndDate: "2026-05-15" }),
      ).rejects.toThrow();
    });

    it("should include description in the request body", async () => {
      mockApiClient.post.mockResolvedValueOnce(MINIMAL_RESPONSE);

      await instance.handle({
        summary: "Cycle",
        description: "Some description",
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.CREATE_TEST_CYCLE,
        expect.objectContaining({ description: "Some description" }),
      );
    });

    it("should include reporter in the request body", async () => {
      mockApiClient.post.mockResolvedValueOnce(MINIMAL_RESPONSE);

      await instance.handle({
        summary: "Cycle",
        reporter: "5b10a2844c20165700ede21f",
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.CREATE_TEST_CYCLE,
        expect.objectContaining({ reporter: "5b10a2844c20165700ede21f" }),
      );
    });
  });
});
