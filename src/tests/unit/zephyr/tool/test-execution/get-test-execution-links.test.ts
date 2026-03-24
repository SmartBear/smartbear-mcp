import { beforeEach, describe, expect, it, vi } from "vitest";
import { ListTestExecutionLinks200Response as getTestExecutionLinksResponse } from "../../../../../zephyr/common/rest-api-schemas";
import { GetTestExecutionLinks } from "../../../../../zephyr/tool/test-execution/get-test-execution-links";

describe("GetTestExecutionLinks", () => {
  let mockClient: any;
  let instance: GetTestExecutionLinks;

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        get: vi.fn(),
      }),
    };

    instance = new GetTestExecutionLinks(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Execution Links");
    expect(instance.specification.summary).toBe(
      "Get links for a specific test execution in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBeDefined();
    expect(instance.specification.outputSchema).toBe(
      getTestExecutionLinksResponse,
    );
  });

  it("should call apiClient.get with correct path and return API-compliant response", async () => {
    const responseMock = {
      self: "https://api.example.com/testexecutions/1/links",
      issues: [
        {
          issueId: 10001,
          id: 1,
          type: "RELATED",
          self: "https://api.example.com/link/1",
          target: "https://jira.example.com/rest/api/3/issue/10001",
        },
        {
          issueId: 10002,
          id: 2,
          type: "BLOCKS",
          self: "https://api.example.com/link/2",
          target: "https://jira.example.com/rest/api/3/issue/10002",
        },
      ],
    };

    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const args = { testExecutionIdOrKey: "1" };

    const result = await instance.handle(args, {});

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testexecutions/1/links",
    );

    expect(result.structuredContent).toBe(responseMock);
    expect(result.content).toEqual([]);
  });

  it("should support test execution key as parameter", async () => {
    const responseMock = {
      self: "https://api.example.com/testexecutions/1/links",
      issues: [
        {
          issueId: 10001,
          id: 1,
          type: "RELATED",
          self: "https://api.example.com/link/1",
          target: "https://jira.example.com/rest/api/3/issue/10001",
        },
        {
          issueId: 10002,
          id: 2,
          type: "BLOCKS",
          self: "https://api.example.com/link/2",
          target: "https://jira.example.com/rest/api/3/issue/10002",
        },
      ],
    };

    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const result = await instance.handle(
      { testExecutionIdOrKey: "PROJ-E123" },
      {},
    );

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testexecutions/PROJ-E123/links",
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));

    await expect(
      instance.handle({ testExecutionIdOrKey: "PROJ-E123" }, {}),
    ).rejects.toThrow("API error");
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(undefined);

    const result = await instance.handle({ testExecutionIdOrKey: "1" }, {});

    expect(result.structuredContent).toBeUndefined();
  });
});
