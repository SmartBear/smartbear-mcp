import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  GetTestCaseLinksParams,
  GetTestCaseLinks200Response as GetTestCaseLinksResponse,
} from "../../../../../zephyr/common/rest-api-schemas";
import { GetTestCaseLinks } from "../../../../../zephyr/tool/test-case/get-links";

describe("GetTestCaseLinks", () => {
  let mockClient: any;
  let instance: GetTestCaseLinks;

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
    instance = new GetTestCaseLinks(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Case Links");
    expect(instance.specification.summary).toBe(
      "Get all links (issue links and web links) associated with a test case in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(GetTestCaseLinksParams);
    expect(instance.specification.outputSchema).toBe(GetTestCaseLinksResponse);
  });

  it("should call apiClient.get with correct params and return formatted content", async () => {
    const responseMock = {
      self: "https://api.zephyrscale.smartbear.com/v2/testcases/SA-T10/links",
      issues: [
        {
          issueId: 10100,
          self: "https://api.zephyrscale.smartbear.com/v2/testcases/14/links/issues/1",
          id: 1,
          target: "https://example.atlassian.net/rest/api/2/issue/10100",
          type: "COVERAGE",
        },
        {
          issueId: 10200,
          self: "https://api.zephyrscale.smartbear.com/v2/testcases/14/links/issues/2",
          id: 2,
          target: "https://example.atlassian.net/rest/api/2/issue/10200",
          type: "BLOCKS",
        },
      ],
      webLinks: [
        {
          description: "A link to atlassian.com",
          url: "https://atlassian.com",
          self: "https://api.zephyrscale.smartbear.com/v2/testcases/14/links/weblinks/1",
          id: 1,
          type: "COVERAGE",
        },
        {
          description: "Related documentation",
          url: "https://docs.example.com",
          self: "https://api.zephyrscale.smartbear.com/v2/testcases/14/links/weblinks/2",
          id: 2,
          type: "RELATED",
        },
      ],
    };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { testCaseKey: "SA-T10" };
    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcases/SA-T10/links",
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle response with only issue links", async () => {
    const responseMock = {
      self: "https://api.zephyrscale.smartbear.com/v2/testcases/MM2-T1/links",
      issues: [
        {
          issueId: 10100,
          self: "https://api.zephyrscale.smartbear.com/v2/testcases/14/links/issues/1",
          id: 1,
          target: "https://example.atlassian.net/rest/api/2/issue/10100",
          type: "COVERAGE",
        },
      ],
    };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { testCaseKey: "MM2-T1" };
    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcases/MM2-T1/links",
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle response with only web links", async () => {
    const responseMock = {
      self: "https://api.zephyrscale.smartbear.com/v2/testcases/PROJ-T5/links",
      webLinks: [
        {
          description: "A link to atlassian.com",
          url: "https://atlassian.com",
          self: "https://api.zephyrscale.smartbear.com/v2/testcases/14/links/weblinks/1",
          id: 1,
          type: "COVERAGE",
        },
      ],
    };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { testCaseKey: "PROJ-T5" };
    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcases/PROJ-T5/links",
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle response with no links", async () => {
    const responseMock = {
      self: "https://api.zephyrscale.smartbear.com/v2/testcases/ABC-T1/links",
    };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { testCaseKey: "ABC-T1" };
    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcases/ABC-T1/links",
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));
    await expect(
      instance.handle({ testCaseKey: "SA-T10" }, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow("API error");
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(undefined);
    const result = await instance.handle(
      { testCaseKey: "SA-T10" },
      EXTRA_REQUEST_HANDLER,
    );
    expect(result.structuredContent).toBeUndefined();
  });

  it("should throw validation error if testCaseKey is missing", async () => {
    await expect(instance.handle({}, EXTRA_REQUEST_HANDLER)).rejects.toThrow();
  });

  it("should throw validation error if testCaseKey has invalid format", async () => {
    await expect(
      instance.handle({ testCaseKey: 123 }, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
    await expect(
      instance.handle({ testCaseKey: null }, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
    await expect(
      instance.handle({ testCaseKey: "" }, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });
});
