import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../../config/constants";
import { GetTestCases } from "../../../tool/test-case/get-test-cases";

describe("SearchTestCases", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockRegistry: any;
  let instance: GetTestCases;

  const mockContext = {
    projectKey: "SCRUM",
    projectId: 10000,
    projectName: "Scrum Project",
  };

  const mockResponse = {
    total: 2,
    startAt: 0,
    maxResults: 50,
    data: [
      {
        id: "1",
        key: "SCRUM-TC-1",
        summary: "Login test",
        versionNo: 1,
      },
      {
        id: "2",
        key: "SCRUM-TC-2",
        summary: "Logout test",
        versionNo: 1,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockRegistry = {
      requireProjectContext: vi.fn().mockReturnValue(mockContext),
    };
    mockApiClient = { post: vi.fn() };
    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockRegistry),
    };

    instance = new GetTestCases(mockClient as any);
  });

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe("Search Test Cases");
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
    it("should call search endpoint with project id from context", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      const result = await instance.handle({});

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining(ENDPOINTS.SEARCH_TEST_CASES),
        { filter: { projectId: "10000" } },
      );
      expect(result.structuredContent).toEqual(mockResponse);
      expect(result.content).toEqual([]);
    });

    it("should not override projectId if already set in filter", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({ filter: { projectId: "99999" } });

      expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {
        filter: { projectId: "99999" },
      });
    });

    it("should add fields to URL query params when provided", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({ fields: ["key", "summary", "status"] });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("fields=key%2Csummary%2Cstatus"),
        expect.any(Object),
      );
    });

    it("should add sort to URL query params when provided", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({ sort: "created:desc" });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.stringContaining("sort=created%3Adesc"),
        expect.any(Object),
      );
    });

    it("should add startAt and maxResults to URL query params", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({ startAt: 50, maxResults: 25 });

      const postCall = mockApiClient.post.mock.calls[0][0];
      expect(postCall).toContain("startAt=50");
      expect(postCall).toContain("maxResults=25");
    });

    it("should send filter in request body", async () => {
      mockApiClient.post.mockResolvedValueOnce(mockResponse);

      await instance.handle({
        filter: { status: ["Done"], priority: ["High"] },
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {
        filter: {
          status: ["Done"],
          priority: ["High"],
          projectId: "10000",
        },
      });
    });

    it("should throw when project context is not set", async () => {
      mockRegistry.requireProjectContext.mockImplementation(() => {
        throw new Error("No active project set");
      });

      await expect(instance.handle({})).rejects.toThrow(
        "No active project set",
      );
    });

    it("should propagate API errors", async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error("API Error"));

      await expect(instance.handle({})).rejects.toThrow("API Error");
    });

    it("should validate API response against schema", async () => {
      mockApiClient.post.mockResolvedValueOnce({ invalid: "response" });

      await expect(instance.handle({})).rejects.toThrow();
    });
  });
});
