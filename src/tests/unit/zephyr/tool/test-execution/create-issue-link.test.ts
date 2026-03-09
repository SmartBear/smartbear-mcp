import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateTestCaseIssueLink201Response as createTestExecutionIssueLinkResponse } from "../../../../../zephyr/common/rest-api-schemas";
import { CreateTestExecutionIssueLink } from "../../../../../zephyr/tool/test-execution/create-issue-link";

describe("CreateTestExecutionIssueLink", () => {
  let mockClient: any;
  let instance: CreateTestExecutionIssueLink;

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
        post: vi.fn(),
      }),
    };
    instance = new CreateTestExecutionIssueLink(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe(
      "Create Test Execution Issue Link",
    );
    expect(instance.specification.summary).toBe(
      "Create a new link between a Jira issue and a Test Execution in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
    expect(instance.specification.inputSchema).toBeDefined();
    expect(instance.specification.outputSchema).toBe(
      createTestExecutionIssueLinkResponse,
    );
  });

  it("should call apiClient.post with correct params and return created issue link information", async () => {
    const responseMock = {
      id: 53,
      self: "https://<api-base-url>/issuelinks/53",
    };

    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);

    const args = {
      testExecutionIdOrKey: "SA-E40",
      issueId: 10100,
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testexecutions/SA-E40/links/issues",
      {
        issueId: args.issueId,
      },
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should work with numeric test execution id", async () => {
    const responseMock = {
      id: 54,
      self: "https://<api-base-url>/issuelinks/54",
    };

    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);

    const args = {
      testExecutionIdOrKey: "1",
      issueId: 20050,
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testexecutions/1/links/issues",
      {
        issueId: args.issueId,
      },
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should ignore extra parameters not in the schema", async () => {
    const responseMock = {
      id: 55,
      self: "https://<api-base-url>/issuelinks/55",
    };

    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);

    const args = {
      testExecutionIdOrKey: "SA-E40",
      issueId: 10100,
      extraField: "should be ignored",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testexecutions/SA-E40/links/issues",
      {
        issueId: args.issueId,
      },
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.post throwing error", async () => {
    mockClient
      .getApiClient()
      .post.mockRejectedValueOnce(new Error("API error"));

    const args = {
      testExecutionIdOrKey: "SA-E40",
      issueId: 10100,
    };

    await expect(instance.handle(args, EXTRA_REQUEST_HANDLER)).rejects.toThrow(
      "API error",
    );
  });

  it("should throw validation error if issueId is missing", async () => {
    const args = {
      testExecutionIdOrKey: "SA-E40",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });
});
