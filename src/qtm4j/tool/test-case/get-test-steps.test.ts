import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../../common/tools.ts";
import type { Qtm4jClient } from "../../client.ts";
import { ENDPOINTS } from "../../config/constants.ts";
import { ResolverKeys } from "../../config/field-resolution.types.ts";
import { GetTestSteps } from "./get-test-steps.ts";

type MockMethods = Record<string, ReturnType<typeof vi.fn>>;

describe("GetTestSteps", () => {
  let mockClient: Partial<Qtm4jClient>;
  let mockApiClient: MockMethods;
  let mockRegistry: MockMethods;
  let mockUidResolver: MockMethods;
  let instance: GetTestSteps;

  const mockContext = {
    projectKey: "SCRUM",
    projectId: 10_000,
    projectName: "Scrum Project",
  };

  const mockStep = {
    id: 1,
    seqNo: "1",
    stepDetails: "Open the app",
    testData: "",
    expectedResult: "App opens",
    attachmentCount: 0,
    shareable: null,
  };

  const mockStepsResponse = {
    total: 1,
    startAt: 0,
    maxResults: 50,
    data: [mockStep],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockUidResolver = {
      resolveAndReturn: vi.fn(),
    };
    mockRegistry = {
      requireProjectContext: vi.fn().mockReturnValue(mockContext),
      getResolver: vi.fn().mockReturnValue(mockUidResolver),
    };
    mockApiClient = { post: vi.fn() };
    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockRegistry),
    };

    instance = new GetTestSteps(mockClient as Qtm4jClient);
  });

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe("Get Test Steps");
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
    it("should resolve test case key and return steps", async () => {
      mockUidResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-145": { uid: "uid-abc", latestVersion: 2 },
      });
      mockApiClient.post.mockResolvedValueOnce(mockStepsResponse);

      const result = await instance.handle({ key: "SCRUM-TC-145" });

      expect(mockRegistry.getResolver).toHaveBeenCalledWith(
        ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID,
      );
      expect(mockUidResolver.resolveAndReturn).toHaveBeenCalledWith(10_000, [
        "SCRUM-TC-145",
      ]);
      expect(result.structuredContent).toEqual(mockStepsResponse);
      expect(result.content).toEqual([]);
    });

    it("should use latest version when versionNo is not provided", async () => {
      mockUidResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-145": { uid: "uid-abc", latestVersion: 3 },
      });
      mockApiClient.post.mockResolvedValueOnce(mockStepsResponse);

      await instance.handle({ key: "SCRUM-TC-145" });

      const expectedEndpoint = expect.stringContaining(
        ENDPOINTS.TEST_STEPS("uid-abc", 3),
      );
      expect(mockApiClient.post).toHaveBeenCalledWith(expectedEndpoint, {});
    });

    it("should use provided versionNo instead of latest", async () => {
      mockUidResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-145": { uid: "uid-abc", latestVersion: 3 },
      });
      mockApiClient.post.mockResolvedValueOnce(mockStepsResponse);

      await instance.handle({ key: "SCRUM-TC-145", versionNo: 1 });

      const expectedEndpoint = expect.stringContaining(
        ENDPOINTS.TEST_STEPS("uid-abc", 1),
      );
      expect(mockApiClient.post).toHaveBeenCalledWith(expectedEndpoint, {});
    });

    it("should include filter in request body when provided", async () => {
      mockUidResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-145": { uid: "uid-abc", latestVersion: 1 },
      });
      mockApiClient.post.mockResolvedValueOnce(mockStepsResponse);

      await instance.handle({
        key: "SCRUM-TC-145",
        filter: { stepDetails: "Open the app" },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {
        filter: { stepDetails: "Open the app" },
      });
    });

    it("should include sort in query params when provided", async () => {
      mockUidResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-145": { uid: "uid-abc", latestVersion: 1 },
      });
      mockApiClient.post.mockResolvedValueOnce(mockStepsResponse);

      await instance.handle({ key: "SCRUM-TC-145", sort: "seqNo:asc" });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("sort=seqNo%3Aasc"),
        {},
      );
    });

    it("should throw ToolError when test case key is not found", async () => {
      mockUidResolver.resolveAndReturn.mockResolvedValueOnce({});

      await expect(instance.handle({ key: "SCRUM-TC-999" })).rejects.toThrow(
        ToolError,
      );

      await expect(instance.handle({ key: "SCRUM-TC-999" })).rejects.toThrow(
        "SCRUM-TC-999",
      );
    });

    it("should throw when project context is not set", async () => {
      mockRegistry.requireProjectContext.mockImplementation(() => {
        throw new Error("No active project set");
      });

      await expect(instance.handle({ key: "SCRUM-TC-1" })).rejects.toThrow(
        "No active project set",
      );
    });

    it("should propagate API errors from resolve", async () => {
      mockUidResolver.resolveAndReturn.mockRejectedValueOnce(
        new Error("API Error"),
      );

      await expect(instance.handle({ key: "SCRUM-TC-1" })).rejects.toThrow(
        "API Error",
      );
    });

    it("should propagate API errors from test steps endpoint", async () => {
      mockUidResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-1": { uid: "uid-abc", latestVersion: 1 },
      });
      mockApiClient.post.mockRejectedValueOnce(new Error("Steps API Error"));

      await expect(instance.handle({ key: "SCRUM-TC-1" })).rejects.toThrow(
        "Steps API Error",
      );
    });

    it("should validate API response against schema", async () => {
      mockUidResolver.resolveAndReturn.mockResolvedValueOnce({
        "SCRUM-TC-1": { uid: "uid-abc", latestVersion: 1 },
      });
      mockApiClient.post.mockResolvedValueOnce({ invalid: "response" });

      await expect(instance.handle({ key: "SCRUM-TC-1" })).rejects.toThrow();
    });
  });
});
