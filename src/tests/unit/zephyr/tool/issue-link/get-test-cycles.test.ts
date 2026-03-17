import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GetIssueLinkTestCyclesParams as GetIssueLinkTestCyclesPathParam,
  GetIssueLinkTestCycles200Response as GetIssueLinkTestCyclesResponse,
} from "../../../../../zephyr/common/rest-api-schemas";
import { GetTestCycles } from "../../../../../zephyr/tool/issue-link/get-test-cycles";

describe("GetIssueLinkTestCycles", () => {
  let mockClient: any;
  let instance: GetTestCycles;

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        get: vi.fn(),
      }),
    };
    instance = new GetTestCycles(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe(
      "Get Test Cycles linked to a Jira issue",
    );
    expect(instance.specification.summary).toBe(
      "Get test cycles linked to a Jira issue in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(
      GetIssueLinkTestCyclesPathParam,
    );
    expect(instance.specification.outputSchema).toBe(
      GetIssueLinkTestCyclesResponse,
    );
  });

  it("should call apiClient.get with correct path and return formatted content", async () => {
    const responseMock = [
      {
        id: 1,
        self: "http://api.zephyrscale-dev.smartbear.com/v2/testcycles/1",
      },
      {
        id: 2,
        self: "http://api.zephyrscale-dev.smartbear.com/v2/testcycles/2",
      },
    ];

    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const args = { issueKey: "PROJ-123" };
    const result = await instance.handle(args, {} as any);

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/issuelinks/PROJ-123/testcycles",
    );
    expect(result.structuredContent).toEqual({ testCycles: responseMock });
    expect(result.content).toEqual([]);
  });

  it("should handle empty list response", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce([]);

    const result = await instance.handle({ issueKey: "PROJ-123" }, {} as any);

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/issuelinks/PROJ-123/testcycles",
    );
    expect(result.structuredContent).toEqual({ testCycles: [] });
    expect(result.content).toEqual([]);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));

    await expect(
      instance.handle({ issueKey: "PROJ-123" }, {} as any),
    ).rejects.toThrow("API error");
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(undefined);

    const result = await instance.handle({ issueKey: "PROJ-123" }, {} as any);
    expect(result.structuredContent).toEqual({ testCycles: undefined });
  });

  it("should throw validation error if issueKey is missing", async () => {
    await expect(instance.handle({}, {} as any)).rejects.toThrow();
  });

  it("should throw validation error if issueKey format is invalid", async () => {
    await expect(
      instance.handle({ issueKey: "PROJT!" }, {} as any),
    ).rejects.toThrow();
  });

  it("should handle apiClient.get returning non-array data", async () => {
    const responseMock = { id: 1 };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const result = await instance.handle({ issueKey: "PROJ-123" }, {} as any);
    expect(result.structuredContent).toEqual({ testCycles: responseMock });
  });
});
