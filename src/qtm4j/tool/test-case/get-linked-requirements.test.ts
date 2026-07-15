import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../../common/tools.ts";
import type { Qtm4jClient } from "../../client.ts";
import { ENDPOINTS } from "../../config/constants.ts";
import { ResolverKeys } from "../../config/field-resolution.types.ts";
import { GetLinkedRequirements } from "./get-linked-requirements.ts";

type MockMethods = Record<string, ReturnType<typeof vi.fn>>;

describe("GetLinkedRequirements", () => {
  let mockClient: Partial<Qtm4jClient>;
  let mockApiClient: MockMethods;
  let mockRegistry: MockMethods;
  let mockTcResolver: MockMethods;
  let instance: GetLinkedRequirements;

  const mockContext = {
    projectKey: "SCRUM",
    projectId: 10_000,
    projectName: "Scrum Project",
  };

  const mockLinkedReqResponse = {
    total: 2,
    startAt: 0,
    maxResults: 50,
    data: [
      {
        id: 10_001,
        key: "SCRUM-1",
        summary: "User login story",
        status: { name: "In Progress" },
        priority: { name: "High" },
        issueType: { name: "Story" },
        tcVersionNo: 2,
      },
      {
        id: 10_002,
        key: "SCRUM-2",
        summary: "User logout story",
        status: { name: "To Do" },
        priority: { name: "Medium" },
        issueType: { name: "Story" },
        tcVersionNo: 2,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockTcResolver = { resolveAndReturn: vi.fn() };

    mockRegistry = {
      requireProjectContext: vi.fn().mockReturnValue(mockContext),
      getResolver: vi.fn().mockReturnValue(mockTcResolver),
    };

    mockApiClient = { get: vi.fn().mockResolvedValue(mockLinkedReqResponse) };
    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockRegistry),
    };

    instance = new GetLinkedRequirements(mockClient as Qtm4jClient);
  });

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe("Get Linked Requirements");
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
    it("should resolve test case key and return linked requirements", async () => {
      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-145": { uid: "uid-abc", latestVersion: 2 },
      });

      const result = await instance.handle({ key: "SCRUM-TC-145" });

      expect(mockRegistry.getResolver).toHaveBeenCalledWith(
        ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID,
      );
      expect(mockTcResolver.resolveAndReturn).toHaveBeenCalledWith(10_000, [
        "SCRUM-TC-145",
      ]);
      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.GET_LINKED_REQUIREMENTS("uid-abc"),
        expect.objectContaining({ tcVersionNo: undefined }),
      );
      expect(result.structuredContent).toEqual(mockLinkedReqResponse);
      expect(result.content).toEqual([]);
    });

    it("should pass versionNo as tcVersionNo in query params", async () => {
      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-85": { uid: "uid-xyz", latestVersion: 3 },
      });

      await instance.handle({ key: "SCRUM-TC-85", versionNo: 2 });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        ENDPOINTS.GET_LINKED_REQUIREMENTS("uid-xyz"),
        expect.objectContaining({ tcVersionNo: 2 }),
      );
    });

    it("should pass pagination params in query", async () => {
      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-145": { uid: "uid-abc", latestVersion: 1 },
      });

      await instance.handle({
        key: "SCRUM-TC-145",
        maxResults: 20,
        startAt: 40,
      });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ maxResults: 20, startAt: 40 }),
      );
    });

    it("should pass sort param in query", async () => {
      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-145": { uid: "uid-abc", latestVersion: 1 },
      });

      await instance.handle({ key: "SCRUM-TC-145", sort: "key:asc" });

      expect(mockApiClient.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ sort: "key:asc" }),
      );
    });

    it("should throw ToolError when test case key not found", async () => {
      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({});

      await expect(instance.handle({ key: "SCRUM-TC-999" })).rejects.toThrow(
        ToolError,
      );

      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({});
      await expect(instance.handle({ key: "SCRUM-TC-999" })).rejects.toThrow(
        "SCRUM-TC-999",
      );
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

      await expect(instance.handle({ key: "SCRUM-TC-145" })).rejects.toThrow(
        "Resolver Error",
      );
    });

    it("should propagate API errors from get", async () => {
      mockTcResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-145": { uid: "uid-abc", latestVersion: 1 },
      });
      mockApiClient.get.mockRejectedValueOnce(new Error("API Error"));

      await expect(instance.handle({ key: "SCRUM-TC-145" })).rejects.toThrow(
        "API Error",
      );
    });

    it("should throw on missing required key", async () => {
      await expect(instance.handle({})).rejects.toThrow();
    });
  });
});
