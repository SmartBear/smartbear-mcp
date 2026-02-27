import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateTestCaseIssueLink201Response as createTestCaseIssueLinkResponse } from "../../../../../zephyr/common/rest-api-schemas";
import { CreateTestCaseIssueLink } from "../../../../../zephyr/tool/test-case/create-issue-link";

describe("CreateTestCaseIssueLink", () => {
  let mockClient: any;
  let instance: CreateTestCaseIssueLink;

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
    instance = new CreateTestCaseIssueLink(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Create Test Case Issue Link");
    expect(instance.specification.summary).toBe(
      "Create a new link between an issue in Jira and a Test Case in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
    expect(instance.specification.inputSchema).toBeDefined();
    expect(instance.specification.outputSchema).toBe(
      createTestCaseIssueLinkResponse,
    );
  });

  it("should call apiClient.post with correct params and return created issue link information", async () => {
    const responseMock = {
      id: 53,
      self: "https://<api-base-url>/issuelinks/53",
    };

    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);

    const args = {
      testCaseKey: "SA-T1",
      issueId: 53,
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testcases/SA-T1/links/issues",
      {
        issueId: args.issueId,
      },
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should ignore extra parameters not in the schema", async () => {
    const responseMock = {
      id: 54,
      self: "https://<api-base-url>/weblinks/54",
    };

    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);

    const args = {
      testCaseKey: "SA-T1",
      issueId: 54,
      extraField: "should be ignored",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testcases/SA-T1/links/issues",
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
      testCaseKey: "SA-T1",
      issueId: 53,
      description: "Link to documentation",
    };

    await expect(instance.handle(args, EXTRA_REQUEST_HANDLER)).rejects.toThrow(
      "API error",
    );
  });

  it("should throw validation error if id is missing", async () => {
    const args = {
      testCaseKey: "SA-T1",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });
});
