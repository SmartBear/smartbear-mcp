import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it } from "vitest";
import {
  asZephyrClient,
  createMockZephyrClient,
  type MockZephyrClient,
} from "../../common/test-helpers.ts";
import { CreateTestCycleIssueLink } from "./create-issue-link.ts";

describe("CreateTestCycleIssueLink", () => {
  let mockClient: MockZephyrClient;
  let instance: CreateTestCycleIssueLink;

  const ExtraRequestHandler: RequestHandlerExtra<
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
    mockClient = createMockZephyrClient();
    instance = new CreateTestCycleIssueLink(asZephyrClient(mockClient));
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Create Test Cycle Issue Link");
    expect(instance.specification.summary).toBe(
      "Create a new link between an issue in Jira and a Test Cycle in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
    expect(instance.specification.inputSchema).toBeDefined();
  });

  it("should call apiClient.post with correct params using test cycle key", async () => {
    mockClient.getApiClient().post.mockResolvedValueOnce(undefined);

    const args = {
      testCycleIdOrKey: "SA-R1",
      issueId: 53,
    };

    await instance.handle(args, ExtraRequestHandler);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testcycles/SA-R1/links/issues",
      {
        issueId: args.issueId,
      },
    );
  });

  it("should call apiClient.post with correct params using test cycle ID", async () => {
    mockClient.getApiClient().post.mockResolvedValueOnce(undefined);

    const args = {
      testCycleIdOrKey: "1001",
      issueId: 54,
    };

    await instance.handle(args, ExtraRequestHandler);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testcycles/1001/links/issues",
      {
        issueId: args.issueId,
      },
    );
  });

  it("should throw error when extra parameters not in the schema", async () => {
    const args = {
      testCycleIdOrKey: "SA-R1",
      issueId: 55,
      extraField: "should be rejected",
    };

    await expect(instance.handle(args, ExtraRequestHandler)).rejects.toThrow();
  });

  it("should handle apiClient.post throwing error", async () => {
    mockClient
      .getApiClient()
      .post.mockRejectedValueOnce(new Error("API error"));

    const args = {
      testCycleIdOrKey: "SA-R1",
      issueId: 53,
    };

    await expect(instance.handle(args, ExtraRequestHandler)).rejects.toThrow(
      "API error",
    );
  });

  it("should throw validation error if issueId is missing", async () => {
    const args = {
      testCycleIdOrKey: "SA-R1",
    };

    await expect(instance.handle(args, ExtraRequestHandler)).rejects.toThrow();
  });

  it("should throw validation error if testCycleIdOrKey is missing", async () => {
    const args = {
      issueId: 53,
    };

    await expect(instance.handle(args, ExtraRequestHandler)).rejects.toThrow();
  });
});
