import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GetTestCycleLinksParams,
  GetTestCycleLinks200Response as GetTestCycleLinksResponse,
} from "../../../../../zephyr/common/rest-api-schemas";
import { GetTestCycleLinks } from "../../../../../zephyr/tool/test-cycle/get-links";

describe("GetTestCycleLinks", () => {
  let mockClient: any;
  let instance: GetTestCycleLinks;

  const EXTRA_REQUEST_HANDLER: RequestHandlerExtra<
    ServerRequest,
    ServerNotification
  > = {
    signal: AbortSignal.timeout(5000),
    requestId: "",
    sendNotification: (_notification) => {
      throw new Error("Function not implemented.");
    },
    sendRequest: (_request, _resultSchema, _options?) => {
      throw new Error("Function not implemented.");
    },
  };

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        get: vi.fn(),
      }),
    };
    instance = new GetTestCycleLinks(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Cycle Links");
    expect(instance.specification.summary).toBe(
      "Get all links (issues, web links, and test plans) associated with a test cycle in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(GetTestCycleLinksParams);
    expect(instance.specification.outputSchema).toBe(GetTestCycleLinksResponse);
  });

  it("should call apiClient.get with correct params (Test Cycle Key) and return formatted content", async () => {
    const responseMock = {
      self: "http://localhost:5051/v2/testcycles/260/links",
      issues: [
        {
          self: "http://localhost:5051/v2/links/531",
          issueId: 10200,
          id: 531,
          target: "https://test.atlassian.net/rest/api/2/issue/10200",
          type: "RELATED",
        },
        {
          self: "http://localhost:5051/v2/links/532",
          issueId: 10201,
          id: 532,
          target: "https://test.atlassian.net/rest/api/2/issue/10201",
          type: "BLOCKS",
        },
      ],
      webLinks: [
        {
          self: "http://localhost:5051/v2/links/529",
          description: "Test link for mcp",
          url: "https://www.google.com/",
          id: 529,
          type: "RELATED",
        },
      ],
      testPlans: [
        {
          id: 530,
          self: "http://localhost:5051/v2/links/530",
          testPlanId: 7,
          type: "COVERAGE",
          target: "https://test.atlassian.net/testplans/7",
        },
      ],
    };

    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { testCycleIdOrKey: "SA-R40" };
    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcycles/SA-R40/links",
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should call apiClient.get with correct params (Test Cycle ID) and return formatted content", async () => {
    const responseMock = {
      self: "http://localhost:5051/v2/testcycles/1/links",
      issues: [
        {
          self: "http://localhost:5051/v2/links/100",
          issueId: 10100,
          id: 100,
          target: "https://test.atlassian.net/rest/api/2/issue/10100",
          type: "COVERAGE",
        },
      ],
      webLinks: [],
      testPlans: [],
    };

    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { testCycleIdOrKey: "1" };
    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcycles/1/links",
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle test cycle with no links", async () => {
    const responseMock = {
      self: "http://localhost:5051/v2/testcycles/100/links",
      issues: [],
      webLinks: [],
      testPlans: [],
    };

    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { testCycleIdOrKey: "100" };
    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcycles/100/links",
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));
    await expect(
      instance.handle({ testCycleIdOrKey: "1" }, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow("API error");
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(undefined);
    const result = await instance.handle(
      { testCycleIdOrKey: "1" },
      EXTRA_REQUEST_HANDLER,
    );
    expect(result.structuredContent).toBeUndefined();
  });

  it("should throw validation error if testCycleIdOrKey is missing", async () => {
    await expect(instance.handle({}, EXTRA_REQUEST_HANDLER)).rejects.toThrow();
  });

  it("should throw validation error if testCycleIdOrKey has invalid format", async () => {
    await expect(
      instance.handle(
        { testCycleIdOrKey: "invalid-key" },
        EXTRA_REQUEST_HANDLER,
      ),
    ).rejects.toThrow();
  });
});
