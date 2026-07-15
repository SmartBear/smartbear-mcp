import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../../common/tools.ts";
import { ENDPOINTS } from "../../config/constants.ts";
import { ResolverKeys } from "../../config/field-resolution.types.ts";
import { UnlinkRequirements } from "./unlink-requirements.ts";

describe("UnlinkRequirements", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockRegistry: any;
  let mockTcResolver: any;
  let mockReqResolver: any;
  let instance: UnlinkRequirements;

  const mockContext = {
    projectKey: "SCRUM",
    projectId: 10_000,
    projectName: "Scrum Project",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockTcResolver = { resolveAndReturn: vi.fn() };
    mockReqResolver = { resolveAndReturn: vi.fn() };

    mockRegistry = {
      requireProjectContext: vi.fn().mockReturnValue(mockContext),
      getResolver: vi.fn().mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID)
          return mockTcResolver;
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

    instance = new UnlinkRequirements(mockClient as any);
  });

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe(
        "Unlink Requirements from Test Case",
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
    it("should resolve test case key and unlink specific requirements", async () => {
      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-145": { uid: "uid-abc", latestVersion: 2 },
      });
      mockReqResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-1": { id: "10001" },
        "SCRUM-2": { id: "10002" },
      });

      const result = await instance.handle({
        key: "SCRUM-TC-145",
        requirementKeys: ["SCRUM-1", "SCRUM-2"],
      });

      expect(mockTcResolver.resolveAndReturn).toHaveBeenCalledWith(10_000, [
        "SCRUM-TC-145",
      ]);
      expect(mockReqResolver.resolveAndReturn).toHaveBeenCalledWith(10_000, [
        "SCRUM-1",
        "SCRUM-2",
      ]);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.UNLINK_REQUIREMENTS("uid-abc", 2),
        { requirementIds: [10_001, 10_002] },
      );
      expect(result.structuredContent).toEqual({
        key: "SCRUM-TC-145",
        versionNo: 2,
        unlinked: true,
      });
      expect(result.content).toEqual([]);
    });

    it("should use unLinkAll: true without resolving requirement keys", async () => {
      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-145": { uid: "uid-abc", latestVersion: 1 },
      });

      await instance.handle({ key: "SCRUM-TC-145", unLinkAll: true });

      expect(mockReqResolver.resolveAndReturn).not.toHaveBeenCalled();
      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.UNLINK_REQUIREMENTS("uid-abc", 1),
        { unLinkAll: true },
      );
    });

    it("should use provided versionNo instead of latest", async () => {
      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-145": { uid: "uid-abc", latestVersion: 3 },
      });
      mockReqResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-1": { id: "10001" },
      });

      const result = await instance.handle({
        key: "SCRUM-TC-145",
        versionNo: 1,
        requirementKeys: ["SCRUM-1"],
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.UNLINK_REQUIREMENTS("uid-abc", 1),
        expect.any(Object),
      );
      expect(result.structuredContent.versionNo).toBe(1);
    });

    it("should warn and skip unresolvable requirement keys", async () => {
      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-145": { uid: "uid-abc", latestVersion: 1 },
      });
      mockReqResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-1": { id: "10001" },
      });

      const result = await instance.handle({
        key: "SCRUM-TC-145",
        requirementKeys: ["SCRUM-1", "SCRUM-999"],
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toMatchObject({
        type: "text",
        text: expect.stringContaining("SCRUM-999"),
      });
      expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {
        requirementIds: [10_001],
      });
    });

    it("should throw ToolError when test case key not found", async () => {
      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({});

      await expect(
        instance.handle({ key: "SCRUM-TC-999", requirementKeys: ["SCRUM-1"] }),
      ).rejects.toThrow(ToolError);

      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({});
      await expect(
        instance.handle({ key: "SCRUM-TC-999", requirementKeys: ["SCRUM-1"] }),
      ).rejects.toThrow("SCRUM-TC-999");
    });

    it("should throw when project context not set", async () => {
      mockRegistry.requireProjectContext.mockImplementation(() => {
        throw new Error("No active project set");
      });

      await expect(instance.handle({ key: "SCRUM-TC-145" })).rejects.toThrow(
        "No active project set",
      );
    });

    it("should propagate resolver errors", async () => {
      mockTcResolver.resolveAndReturn.mockRejectedValueOnce(
        new Error("Resolver Error"),
      );

      await expect(
        instance.handle({ key: "SCRUM-TC-145", requirementKeys: ["SCRUM-1"] }),
      ).rejects.toThrow("Resolver Error");
    });

    it("should propagate API errors from post", async () => {
      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-145": { uid: "uid-abc", latestVersion: 1 },
      });
      mockReqResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-1": { id: "10001" },
      });
      mockApiClient.post.mockRejectedValueOnce(new Error("API Error"));

      await expect(
        instance.handle({ key: "SCRUM-TC-145", requirementKeys: ["SCRUM-1"] }),
      ).rejects.toThrow("API Error");
    });

    it("should throw on missing required key", async () => {
      await expect(
        instance.handle({ requirementKeys: ["SCRUM-1"] }),
      ).rejects.toThrow();
    });
  });
});
