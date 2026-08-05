import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../../common/tools";
import { ENDPOINTS } from "../../config/constants";
import { SetProjectContext } from "./set-project-context";

describe("SetProjectContext", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockFieldResolver: any;
  let mockPreload: any;
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
    mockApiClient.skipAnalytics = vi.fn().mockReturnValue(mockApiClient);

    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockFieldResolver),
    };

    instance = new SetProjectContext(mockClient as any);
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
            id: 10000,
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

      const result = await instance.handle({ projectKey: "SCRUM" }, {} as any);

      expect(mockApiClient.post).toHaveBeenCalledWith(ENDPOINTS.PROJECTS, {
        startAt: 0,
        maxResults: 10,
        search: "SCRUM",
      });
      expect(mockFieldResolver.setProjectContext).toHaveBeenCalledWith({
        projectId: 10000,
        projectKey: "SCRUM",
        projectName: "Scrum Project",
      });
      expect(mockPreload).toHaveBeenCalledWith("SCRUM", 10000);
      expect(result.structuredContent).toMatchObject({
        projectId: 10000,
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
            id: 10000,
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

      const result = await instance.handle({ projectKey: "scrum" }, {} as any);

      expect(mockFieldResolver.setProjectContext).toHaveBeenCalledWith({
        projectId: 10000,
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
            id: 20000,
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
        projectId: 10000,
        projectName: "Scrum Project",
      });
      mockPreload.mockResolvedValueOnce({});

      await instance.handle({ projectKey: "AD" }, {} as any);

      expect(mockFieldResolver.clearProjectCache).toHaveBeenCalledWith("SCRUM");
      expect(mockFieldResolver.setProjectContext).toHaveBeenCalledWith({
        projectId: 20000,
        projectKey: "AD",
        projectName: "Ad Project",
      });
    });

    it("should not clear cache when switching to the same project", async () => {
      const mockProjects = {
        total: 1,
        data: [
          {
            id: 10000,
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
        projectId: 10000,
        projectName: "Scrum Project",
      });
      mockPreload.mockResolvedValueOnce({});

      await instance.handle({ projectKey: "SCRUM" }, {} as any);

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
        await instance.handle({ projectKey: "NONEXISTENT" }, {} as any);
        // Should not reach here
        expect.fail("Expected error to be thrown");
      } catch (error: any) {
        expect(error).toBeInstanceOf(ToolError);
        expect(error.message).toContain("not found");
      }
    });

    it("should throw error when no exact match is found", async () => {
      const mockProjects = {
        total: 2,
        data: [
          {
            id: 10000,
            key: "SCRUM",
            name: "Scrum Project",
            favorite: false,
            qmetryEnabled: true,
          },
          {
            id: 20000,
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
        await instance.handle({ projectKey: "SCR" }, {} as any);
        // Should not reach here
        expect.fail("Expected error to be thrown");
      } catch (error: any) {
        expect(error).toBeInstanceOf(ToolError);
        expect(error.message).toContain("No exact match");
      }
    });

    it("should continue even when preload fails", async () => {
      const mockProjects = {
        total: 1,
        data: [
          {
            id: 10000,
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

      const result = await instance.handle({ projectKey: "SCRUM" }, {} as any);

      expect(result.structuredContent).toMatchObject({
        projectId: 10000,
        projectKey: "SCRUM",
        projectName: "Scrum Project",
        availableFields: {},
      });
    });

    it("should propagate API errors", async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error("API Error"));

      await expect(
        instance.handle({ projectKey: "SCRUM" }, {} as any),
      ).rejects.toThrow("API Error");
    });

    it("should handle invalid API response", async () => {
      mockApiClient.post.mockResolvedValueOnce({
        // Missing required fields
        invalid: "response",
      });

      await expect(
        instance.handle({ projectKey: "SCRUM" }, {} as any),
      ).rejects.toThrow();
    });
  });
});
