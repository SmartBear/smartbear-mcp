import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../../common/tools.ts";
import type { Qtm4jClient } from "../../client.ts";
import { ENDPOINTS } from "../../config/constants.ts";
import { SetProjectContext } from "./set-project-context.ts";

type HandleExtra = Parameters<SetProjectContext["handle"]>[1];

describe("SetProjectContext", () => {
  let mockClient: {
    getApiClient: ReturnType<typeof vi.fn>;
    getResolverRegistry: ReturnType<typeof vi.fn>;
  };
  let mockApiClient: { post: ReturnType<typeof vi.fn> };
  let mockFieldResolver: {
    requireProjectContext: ReturnType<typeof vi.fn>;
    setProjectContext: ReturnType<typeof vi.fn>;
    clearProjectCache: ReturnType<typeof vi.fn>;
    getCommonAttributeResolver: ReturnType<typeof vi.fn>;
  };
  let mockPreload: ReturnType<typeof vi.fn>;
  let instance: SetProjectContext;

  beforeEach(() => {
    vi.clearAllMocks();

    mockPreload = vi.fn().mockResolvedValue({});
    mockFieldResolver = {
      requireProjectContext: vi.fn(),
      setProjectContext: vi.fn(),
      clearProjectCache: vi.fn(),
      getCommonAttributeResolver: vi
        .fn()
        .mockReturnValue({ preload: mockPreload }),
    };

    mockApiClient = {
      post: vi.fn(),
    };

    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockFieldResolver),
    };

    instance = new SetProjectContext(mockClient as unknown as Qtm4jClient);
  });

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe("Set Project Context");
      expect(instance.specification.summary).toBe(
        "Set the active QTM4J project for the current session. Must be called before any project-specific operation. " +
          "Pre-loads priority and status values so you can map user-provided names to valid options via NLP.",
      );
      expect(instance.specification.readOnly).toBe(false);
      expect(instance.specification.idempotent).toBe(true);
    });
  });

  describe("handle", () => {
    it("should set project context when exact match is found", async () => {
      const mockProjects = {
        total: 1,
        data: [
          {
            id: 10_000,
            key: "SCRUM",
            name: "Scrum Project",
            favorite: false,
            qmetryEnabled: true,
          },
        ],
      };

      const mockAvailableFields = {
        priority: { high: "1", medium: "2", low: "3" },
        testCaseStatus: { "to do": "10", done: "20" },
      };

      mockApiClient.post.mockResolvedValueOnce(mockProjects);
      mockFieldResolver.requireProjectContext.mockImplementation(() => {
        throw new Error("No context");
      });
      mockPreload.mockResolvedValueOnce(mockAvailableFields);

      const result = await instance.handle(
        { projectKey: "SCRUM" },
        {} as unknown as HandleExtra,
      );

      expect(mockApiClient.post).toHaveBeenCalledWith(ENDPOINTS.PROJECTS, {
        startAt: 0,
        maxResults: 10,
        search: "SCRUM",
      });
      expect(mockFieldResolver.setProjectContext).toHaveBeenCalledWith({
        projectId: 10_000,
        projectKey: "SCRUM",
        projectName: "Scrum Project",
      });
      expect(mockPreload).toHaveBeenCalledWith("SCRUM", 10_000);
      expect(result.structuredContent).toMatchObject({
        projectId: 10_000,
        projectKey: "SCRUM",
        projectName: "Scrum Project",
        availableFields: mockAvailableFields,
      });
    });

    it("should handle case-insensitive project key matching", async () => {
      const mockProjects = {
        total: 1,
        data: [
          {
            id: 10_000,
            key: "SCRUM",
            name: "Scrum Project",
            favorite: false,
            qmetryEnabled: true,
          },
        ],
      };

      mockApiClient.post.mockResolvedValueOnce(mockProjects);
      mockFieldResolver.requireProjectContext.mockImplementation(() => {
        throw new Error("No context");
      });
      mockPreload.mockResolvedValueOnce({});

      const result = await instance.handle(
        { projectKey: "scrum" },
        {} as unknown as HandleExtra,
      );

      expect(mockFieldResolver.setProjectContext).toHaveBeenCalledWith({
        projectId: 10_000,
        projectKey: "SCRUM",
        projectName: "Scrum Project",
      });
      expect(result.structuredContent?.projectKey).toBe("SCRUM");
    });

    it("should clear previous project cache when switching projects", async () => {
      const mockProjects = {
        total: 1,
        data: [
          {
            id: 20_000,
            key: "AD",
            name: "Ad Project",
            favorite: false,
            qmetryEnabled: true,
          },
        ],
      };

      mockApiClient.post.mockResolvedValueOnce(mockProjects);
      mockFieldResolver.requireProjectContext.mockReturnValueOnce({
        projectKey: "SCRUM",
        projectId: 10_000,
        projectName: "Scrum Project",
      });
      mockPreload.mockResolvedValueOnce({});

      await instance.handle({ projectKey: "AD" }, {} as unknown as HandleExtra);

      expect(mockFieldResolver.clearProjectCache).toHaveBeenCalledWith("SCRUM");
      expect(mockFieldResolver.setProjectContext).toHaveBeenCalledWith({
        projectId: 20_000,
        projectKey: "AD",
        projectName: "Ad Project",
      });
    });

    it("should not clear cache when switching to the same project", async () => {
      const mockProjects = {
        total: 1,
        data: [
          {
            id: 10_000,
            key: "SCRUM",
            name: "Scrum Project",
            favorite: false,
            qmetryEnabled: true,
          },
        ],
      };

      mockApiClient.post.mockResolvedValueOnce(mockProjects);
      mockFieldResolver.requireProjectContext.mockReturnValueOnce({
        projectKey: "SCRUM",
        projectId: 10_000,
        projectName: "Scrum Project",
      });
      mockPreload.mockResolvedValueOnce({});

      await instance.handle(
        { projectKey: "SCRUM" },
        {} as unknown as HandleExtra,
      );

      expect(mockFieldResolver.clearProjectCache).not.toHaveBeenCalled();
    });

    it("should throw error when project is not found", async () => {
      const mockProjects = {
        total: 0,
        data: [],
      };

      mockApiClient.post.mockResolvedValueOnce(mockProjects);
      mockFieldResolver.requireProjectContext.mockImplementation(() => {
        throw new Error("No context");
      });

      try {
        await instance.handle(
          { projectKey: "NONEXISTENT" },
          {} as unknown as HandleExtra,
        );
        // Should not reach here
        expect.fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ToolError);
        expect((error as Error).message).toContain("not found");
      }
    });

    it("should throw error when no exact match is found", async () => {
      const mockProjects = {
        total: 2,
        data: [
          {
            id: 10_000,
            key: "SCRUM",
            name: "Scrum Project",
            favorite: false,
            qmetryEnabled: true,
          },
          {
            id: 20_000,
            key: "SCRUMTEST",
            name: "Scrum Test Project",
            favorite: false,
            qmetryEnabled: true,
          },
        ],
      };

      mockApiClient.post.mockResolvedValueOnce(mockProjects);
      mockFieldResolver.requireProjectContext.mockImplementation(() => {
        throw new Error("No context");
      });

      try {
        await instance.handle(
          { projectKey: "SCR" },
          {} as unknown as HandleExtra,
        );
        // Should not reach here
        expect.fail("Expected error to be thrown");
      } catch (error) {
        expect(error).toBeInstanceOf(ToolError);
        expect((error as Error).message).toContain("No exact match");
      }
    });

    it("should continue even when preload fails", async () => {
      const mockProjects = {
        total: 1,
        data: [
          {
            id: 10_000,
            key: "SCRUM",
            name: "Scrum Project",
            favorite: false,
            qmetryEnabled: true,
          },
        ],
      };

      mockApiClient.post.mockResolvedValueOnce(mockProjects);
      mockFieldResolver.requireProjectContext.mockImplementation(() => {
        throw new Error("No context");
      });
      mockPreload.mockRejectedValueOnce(new Error("Preload failed"));

      const result = await instance.handle(
        { projectKey: "SCRUM" },
        {} as unknown as HandleExtra,
      );

      expect(result.structuredContent).toMatchObject({
        projectId: 10_000,
        projectKey: "SCRUM",
        projectName: "Scrum Project",
        availableFields: {},
      });
    });

    it("should propagate API errors", async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error("API Error"));

      await expect(
        instance.handle({ projectKey: "SCRUM" }, {} as unknown as HandleExtra),
      ).rejects.toThrow("API Error");
    });

    it("should handle invalid API response", async () => {
      mockApiClient.post.mockResolvedValueOnce({
        // Missing required fields
        invalid: "response",
      });

      await expect(
        instance.handle({ projectKey: "SCRUM" }, {} as unknown as HandleExtra),
      ).rejects.toThrow();
    });
  });
});
