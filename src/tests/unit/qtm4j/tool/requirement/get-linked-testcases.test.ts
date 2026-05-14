import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../../../../common/tools";
import { ENDPOINTS } from "../../../../../qtm4j/config/constants";
import { ResolverKeys } from "../../../../../qtm4j/config/field-resolution.types";
import { GetLinkedTestCasesForRequirement } from "../../../../../qtm4j/tool/requirement/get-linked-testcases";

describe("GetLinkedTestCasesForRequirement", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockRegistry: any;
  let mockReqResolver: any;
  let instance: GetLinkedTestCasesForRequirement;

  const mockContext = {
    projectKey: "SCRUM",
    projectId: 10000,
    projectName: "Scrum Project",
  };

  const mockLinkedTcResponse = {
    total: 2,
    startAt: 0,
    maxResults: 50,
    data: [
      {
        id: "uid-tc-10",
        key: "SCRUM-TC-10",
        summary: "Login test",
        status: { name: "To Do" },
        priority: { name: "High" },
      },
      {
        id: "uid-tc-11",
        key: "SCRUM-TC-11",
        summary: "Logout test",
        status: { name: "Done" },
        priority: { name: "Medium" },
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockReqResolver = { resolveAndReturn: vi.fn() };

    mockRegistry = {
      requireProjectContext: vi.fn().mockReturnValue(mockContext),
      getResolver: vi.fn().mockReturnValue(mockReqResolver),
    };

    mockApiClient = { post: vi.fn().mockResolvedValue(mockLinkedTcResponse) };
    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockRegistry),
    };

    instance = new GetLinkedTestCasesForRequirement(mockClient as any);
  });

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe(
        "Get Linked Test Cases for Requirement",
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
    it("should resolve requirement key and return linked test cases", async () => {
      mockReqResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-1": { id: "10001" },
      });

      const result = await instance.handle({ requirementKey: "SCRUM-1" });

      expect(mockRegistry.getResolver).toHaveBeenCalledWith(
        ResolverKeys.SearchableField.REQUIREMENT_KEY_TO_ID,
      );
      expect(mockReqResolver.resolveAndReturn).toHaveBeenCalledWith(10000, [
        "SCRUM-1",
      ]);
      expect(mockApiClient.post).toHaveBeenCalledWith(
        ENDPOINTS.GET_LINKED_TESTCASES_FOR_REQUIREMENT(10001),
        {},
        expect.objectContaining({ maxResults: undefined, startAt: undefined }),
      );
      expect(result.structuredContent).toEqual(mockLinkedTcResponse);
      expect(result.content).toEqual([]);
    });

    it("should inject projectId into filter body", async () => {
      mockReqResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-1": { id: "10001" },
      });

      await instance.handle({
        requirementKey: "SCRUM-1",
        filter: { priority: ["High"] },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        { filter: { priority: ["High"], projectId: 10000 } },
        expect.any(Object),
      );
    });

    it("should pass fields, pagination, and sort as query params", async () => {
      mockReqResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-1": { id: "10001" },
      });

      await instance.handle({
        requirementKey: "SCRUM-1",
        fields: "key,summary,status",
        maxResults: 20,
        startAt: 20,
        sort: "key:asc",
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        {},
        expect.objectContaining({
          fields: "key,summary,status",
          maxResults: 20,
          startAt: 20,
          sort: "key:asc",
        }),
      );
    });

    it("should throw ToolError when requirement key not found", async () => {
      mockReqResolver.resolveAndReturn.mockResolvedValueOnce({});

      await expect(
        instance.handle({ requirementKey: "SCRUM-999" }),
      ).rejects.toThrow(ToolError);

      mockReqResolver.resolveAndReturn.mockResolvedValueOnce({});
      await expect(
        instance.handle({ requirementKey: "SCRUM-999" }),
      ).rejects.toThrow("SCRUM-999");
    });

    it("should throw when project context not set", async () => {
      mockRegistry.requireProjectContext.mockImplementation(() => {
        throw new Error("No active project set");
      });

      await expect(
        instance.handle({ requirementKey: "SCRUM-1" }),
      ).rejects.toThrow("No active project set");
    });

    it("should propagate resolver errors", async () => {
      mockReqResolver.resolveAndReturn.mockRejectedValueOnce(
        new Error("Resolver Error"),
      );

      await expect(
        instance.handle({ requirementKey: "SCRUM-1" }),
      ).rejects.toThrow("Resolver Error");
    });

    it("should propagate API errors from post", async () => {
      mockReqResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-1": { id: "10001" },
      });
      mockApiClient.post.mockRejectedValueOnce(new Error("API Error"));

      await expect(
        instance.handle({ requirementKey: "SCRUM-1" }),
      ).rejects.toThrow("API Error");
    });

    it("should throw on missing required requirementKey", async () => {
      await expect(instance.handle({})).rejects.toThrow();
    });
  });
});
