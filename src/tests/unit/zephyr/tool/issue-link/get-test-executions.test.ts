import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GetIssueLinkTestExecutionsParams as GetIssueLinkTestExecutionsPathParam,
  GetIssueLinkTestExecutions200Response as GetIssueLinkTestExecutionsResponse,
} from "../../../../../zephyr/common/rest-api-schemas";
import { GetTestExecutions } from "../../../../../zephyr/tool/issue-link/get-test-executions";

describe("GetIssueLinkTestExecutions", () => {
  let mockClient: any;
  let instance: GetTestExecutions;

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        get: vi.fn(),
      }),
    };
    instance = new GetTestExecutions(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe(
      "Get test executions linked to a Jira issue",
    );
    expect(instance.specification.summary).toBe(
      "Get test executions linked to a Jira issue in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(
      GetIssueLinkTestExecutionsPathParam,
    );
    expect(instance.specification.outputSchema).toBe(
      GetIssueLinkTestExecutionsResponse,
    );
  });

  it("should call apiClient.get with correct path and return formatted content", async () => {
    const responseMock = [
      {
        id: "1",
        self: "http://api.zephyrscale-dev.smartbear.com/v2/executions/1",
      },
      {
        id: "2",
        self: "http://api.zephyrscale-dev.smartbear.com/v2/executions/2",
      },
    ];

    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const args = { issueKey: "PROJ-123" };
    const result = await instance.handle(args, {});

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/issuelinks/PROJ-123/executions",
    );
    expect(result.structuredContent).toEqual({ testExecutions: responseMock });
    expect(result.content).toEqual([]);
  });

  it("should handle empty list response", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce([]);

    const result = await instance.handle({ issueKey: "PROJ-123" }, {});

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/issuelinks/PROJ-123/executions",
    );
    expect(result.structuredContent).toEqual({ testExecutions: [] });
    expect(result.content).toEqual([]);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));

    await expect(instance.handle({ issueKey: "PROJ-123" }, {})).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(undefined);

    const result = await instance.handle({ issueKey: "PROJ-123" }, {});
    expect(result.structuredContent).toEqual({ testExecutions: undefined });
  });

  it("should throw validation error if issueKey is missing", async () => {
    await expect(instance.handle({}, {})).rejects.toThrow();
  });

  it("should throw validation error if issueKey format is invalid", async () => {
    await expect(instance.handle({ issueKey: "PROJT!" }, {})).rejects.toThrow();
  });

  it("should handle apiClient.get returning non-array data", async () => {
    const responseMock = { key: "PROJ-1", version: 1 };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const result = await instance.handle({ issueKey: "PROJ-123" }, {});
    expect(result.structuredContent).toEqual({ testExecutions: responseMock });
  });
});
