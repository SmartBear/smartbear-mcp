import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../../../common/tools";
import { ENDPOINTS } from "../../../config/constants";
import { ResolverKeys } from "../../../config/field-resolution.types";
import { GetLinkedRequirementsForCycle } from "../../../tool/test-cycle/get-linked-requirements";

describe("GetLinkedRequirementsForCycle", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockRegistry: any;
  let mockCycleResolver: any;
  let instance: GetLinkedRequirementsForCycle;

  const mockContext = {
    projectKey: "SCRUM",
    projectId: 10000,
    projectName: "Scrum Project",
  };

  const mockApiResponse = {
    startAt: 0,
    maxResults: 50,
    total: 2,
    data: [
      {
        id: 10173,
        key: "SCRUM-3",
        summary: "Issue 3",
        status: {
          id: 10016,
          name: "To Do",
          iconUrl: "https://example.com/",
          color: "blue-gray",
        },
        priority: {
          id: 3,
          name: "Medium",
          iconUrl: "https://example.com/medium.svg",
        },
        issueType: {
          id: 10022,
          name: "Story",
          iconUrl: "https://example.com/story.svg",
        },
      },
      {
        id: 10174,
        key: "SCRUM-4",
        summary: "Issue 4",
        status: {
          id: 10017,
          name: "In Progress",
          iconUrl: "https://example.com/",
          color: "yellow",
        },
        priority: {
          id: 2,
          name: "High",
          iconUrl: "https://example.com/high.svg",
        },
        issueType: {
          id: 10022,
          name: "Story",
          iconUrl: "https://example.com/story.svg",
        },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCycleResolver = { resolveAndReturn: vi.fn() };

    mockRegistry = {
      requireProjectContext: vi.fn().mockReturnValue(mockContext),
      getResolver: vi.fn().mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.TEST_CYCLE_KEY_TO_UID)
          return mockCycleResolver;
        throw new Error(`Unexpected resolver key: ${key}`);
      }),
    };

    mockApiClient = { get: vi.fn().mockResolvedValue(mockApiResponse) };
    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockRegistry),
    };

    instance = new GetLinkedRequirementsForCycle(mockClient as any);
  });

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe(
        "Get Linked Requirements for Test Cycle",
      );
      expect(instance.specification.readOnly).toBe(true);
      expect(instance.specification.idempotent).toBe(true);
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
    it("should resolve cycle key and return linked requirements", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });

      const result = await instance.handle({ cycleKey: "SCRUM-TR-1" });

      expect(mockCycleResolver.resolveAndReturn).toHaveBeenCalledWith(10000, [
        "SCRUM-TR-1",
      ]);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.GET_LINKED_REQUIREMENTS_FOR_CYCLE("cycle-uid-abc"),
        expect.objectContaining({ maxResults: 50, startAt: 0 }),
      );
      expect(result.structuredContent).toEqual(mockApiResponse);
      expect(result.content).toEqual([]);
    });

    it("should pass maxResults, startAt, and sort as query params", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });

      await instance.handle({
        cycleKey: "SCRUM-TR-1",
        maxResults: 25,
        startAt: 50,
        sort: "priority:asc",
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.GET_LINKED_REQUIREMENTS_FOR_CYCLE("cycle-uid-abc"),
        { maxResults: 25, startAt: 50, sort: "priority:asc" },
      );
    });

    it("should default sort to undefined when not provided", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });

      await instance.handle({ cycleKey: "SCRUM-TR-1" });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ sort: undefined }),
      );
    });

    it("should throw ToolError when cycle key not found", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({});

      await expect(
        instance.handle({ cycleKey: "SCRUM-TR-999" }),
      ).rejects.toThrow(ToolError);

      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({});
      await expect(
        instance.handle({ cycleKey: "SCRUM-TR-999" }),
      ).rejects.toThrow("SCRUM-TR-999");
    });

    it("should throw when project context not set", async () => {
      mockRegistry.requireProjectContext.mockImplementation(() => {
        throw new Error("No active project set");
      });

      await expect(instance.handle({ cycleKey: "SCRUM-TR-1" })).rejects.toThrow(
        "No active project set",
      );
    });

    it("should propagate resolver errors", async () => {
      mockCycleResolver.resolveAndReturn.mockRejectedValueOnce(
        new Error("Resolver Error"),
      );

      await expect(instance.handle({ cycleKey: "SCRUM-TR-1" })).rejects.toThrow(
        "Resolver Error",
      );
    });

    it("should propagate API errors", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });
      mockApiClient.get.mockRejectedValueOnce(new Error("API Error"));

      await expect(instance.handle({ cycleKey: "SCRUM-TR-1" })).rejects.toThrow(
        "API Error",
      );
    });

    it("should throw on missing required cycleKey", async () => {
      await expect(instance.handle({})).rejects.toThrow();
    });

    it("should return structured content matching response schema", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });

      const result = await instance.handle({ cycleKey: "SCRUM-TR-1" });

      expect(result.structuredContent).toHaveProperty("total", 2);
      expect(result.structuredContent).toHaveProperty("startAt", 0);
      expect(result.structuredContent).toHaveProperty("maxResults", 50);
      expect(result.structuredContent.data).toHaveLength(2);
      expect(result.structuredContent.data[0]).toMatchObject({
        id: 10173,
        key: "SCRUM-3",
        summary: "Issue 3",
      });
    });
  });
});
