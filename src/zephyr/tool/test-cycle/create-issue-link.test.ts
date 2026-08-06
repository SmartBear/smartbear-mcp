import type { ServerContext } from "@modelcontextprotocol/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateTestCycleIssueLink } from "./create-issue-link";

describe("CreateTestCycleIssueLink", () => {
  let mockClient: any;
  let instance: CreateTestCycleIssueLink;

  const EXTRA_REQUEST_HANDLER: ServerContext = {
    mcpReq: {
      id: "",
      method: "tools/call",
      signal: AbortSignal.timeout(5000),
      requestState: () => undefined,
      notify: (_notification) => {
        throw new Error("Function not implemented.");
      },
      send: (_request: any, _resultSchemaOrOptions?: any, _options?: any) => {
        throw new Error("Function not implemented.");
      },
      log: (_level, _data, _logger) => {
        throw new Error("Function not implemented.");
      },
      elicitInput: (_params, _options) => {
        throw new Error("Function not implemented.");
      },
      requestSampling: (_params, _options) => {
        throw new Error("Function not implemented.");
      },
    },
  };

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        post: vi.fn(),
      }),
    };
    instance = new CreateTestCycleIssueLink(mockClient as any);
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

    await instance.handle(args, EXTRA_REQUEST_HANDLER);

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

    await instance.handle(args, EXTRA_REQUEST_HANDLER);

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

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });

  it("should handle apiClient.post throwing error", async () => {
    mockClient
      .getApiClient()
      .post.mockRejectedValueOnce(new Error("API error"));

    const args = {
      testCycleIdOrKey: "SA-R1",
      issueId: 53,
    };

    await expect(instance.handle(args, EXTRA_REQUEST_HANDLER)).rejects.toThrow(
      "API error",
    );
  });

  it("should throw validation error if issueId is missing", async () => {
    const args = {
      testCycleIdOrKey: "SA-R1",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });

  it("should throw validation error if testCycleIdOrKey is missing", async () => {
    const args = {
      issueId: 53,
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });
});
