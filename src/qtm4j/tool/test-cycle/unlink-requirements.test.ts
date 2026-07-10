import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../../common/tools";
import { ENDPOINTS } from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types";
import { UnlinkRequirementsFromCycle } from "./unlink-requirements";

describe("UnlinkRequirementsFromCycle", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockRegistry: any;
  let mockCycleResolver: any;
  let mockReqResolver: any;
  let instance: UnlinkRequirementsFromCycle;

  const mockContext = {
    projectKey: "SCRUM",
    projectId: 10000,
    projectName: "Scrum Project",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockCycleResolver = { resolveAndReturn: vi.fn() };
    mockReqResolver = { resolveAndReturn: vi.fn() };

    mockRegistry = {
      requireProjectContext: vi.fn().mockReturnValue(mockContext),
      getResolver: vi.fn().mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.TEST_CYCLE_KEY_TO_UID)
          return mockCycleResolver;
        if (key === ResolverKeys.SearchableField.REQUIREMENT_KEY_TO_ID)
          return mockReqResolver;
        throw new Error(`Unexpected resolver key: ${key}`);
      }),
    };

    mockApiClient = { post: vi.fn().mockResolvedValue({}) };
    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockRegistry),
    };

    instance = new UnlinkRequirementsFromCycle(mockClient as any);
  });

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe(
        "Unlink Requirements from Test Cycle",
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
    it("should resolve cycle and requirement keys and unlink", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });
      mockReqResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-1": { id: "10001" },
        "SCRUM-2": { id: "10002" },
      });

      const result = await instance.handle({
        cycleKey: "SCRUM-TR-1",
        requirementKeys: ["SCRUM-1", "SCRUM-2"],
      });

      expect(mockCycleResolver.resolveAndReturn).toHaveBeenCalledWith(10000, [
        "SCRUM-TR-1",
      ]);
      expect(mockReqResolver.resolveAndReturn).toHaveBeenCalledWith(10000, [
        "SCRUM-1",
        "SCRUM-2",
      ]);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.UNLINK_REQUIREMENTS_FROM_CYCLE("cycle-uid-abc"),
        { requirementIds: [10001, 10002] },
      );
      expect(result.structuredContent).toEqual({
        cycleKey: "SCRUM-TR-1",
        unlinked: true,
      });
      expect(result.content).toEqual([]);
    });

    it("should unlink all when unLinkAll is true", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });

      await instance.handle({ cycleKey: "SCRUM-TR-1", unLinkAll: true });

      expect(mockReqResolver.resolveAndReturn).not.toHaveBeenCalled();
      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.UNLINK_REQUIREMENTS_FROM_CYCLE("cycle-uid-abc"),
        { unLinkAll: true },
      );
    });

    it("should warn and skip unresolvable requirement keys", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });
      mockReqResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-1": { id: "10001" },
      });

      const result = await instance.handle({
        cycleKey: "SCRUM-TR-1",
        requirementKeys: ["SCRUM-1", "SCRUM-999"],
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({
        type: "text",
        text: expect.stringContaining("SCRUM-999"),
      });
      expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {
        requirementIds: [10001],
      });
    });

    it("should throw ToolError when cycle key not found", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({});

      await expect(
        instance.handle({
          cycleKey: "SCRUM-TR-999",
          requirementKeys: ["SCRUM-1"],
        }),
      ).rejects.toThrow(ToolError);

      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({});
      await expect(
        instance.handle({
          cycleKey: "SCRUM-TR-999",
          requirementKeys: ["SCRUM-1"],
        }),
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

      await expect(
        instance.handle({
          cycleKey: "SCRUM-TR-1",
          requirementKeys: ["SCRUM-1"],
        }),
      ).rejects.toThrow("Resolver Error");
    });

    it("should propagate API errors", async () => {
      mockCycleResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TR-1": { uid: "cycle-uid-abc" },
      });
      mockReqResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-1": { id: "10001" },
      });
      mockApiClient.post.mockRejectedValueOnce(new Error("API Error"));

      await expect(
        instance.handle({
          cycleKey: "SCRUM-TR-1",
          requirementKeys: ["SCRUM-1"],
        }),
      ).rejects.toThrow("API Error");
    });

    it("should throw on missing required cycleKey", async () => {
      await expect(
        instance.handle({ requirementKeys: ["SCRUM-1"] }),
      ).rejects.toThrow();
    });
  });
});
