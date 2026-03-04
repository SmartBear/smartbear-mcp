import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateTestCycleWebLink201Response as createTestCycleWebLinkResponse } from "../../../../../zephyr/common/rest-api-schemas";
import { CreateTestCycleWebLink } from "../../../../../zephyr/tool/test-cycle/create-web-link";

describe("CreateTestCycleWebLink", () => {
  let mockClient: any;
  let instance: CreateTestCycleWebLink;

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
    instance = new CreateTestCycleWebLink(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Create Test Cycle Web Link");
    expect(instance.specification.summary).toBe(
      "Create a new Web Link for a Test Cycle in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
    expect(instance.specification.inputSchema).toBeDefined();
    expect(instance.specification.outputSchema).toBe(
      createTestCycleWebLinkResponse,
    );
  });

  it("should call apiClient.post with correct params (Test Cycle Key) and return created web link information", async () => {
    const responseMock = {
      id: 53,
      self: "https://<api-base-url>/weblinks/53",
    };

    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);

    const args = {
      testCycleIdOrKey: "SA-R1",
      url: "https://example.com",
      description: "Link to documentation",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testcycles/SA-R1/links/weblinks",
      {
        url: args.url,
        description: args.description,
      },
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should call apiClient.post with correct params (Test Cycle Id) and return created web link information", async () => {
    const responseMock = {
      id: 53,
      self: "https://<api-base-url>/weblinks/53",
    };

    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);

    const args = {
      testCycleIdOrKey: "10001",
      url: "https://example.com",
      description: "Link to documentation",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testcycles/10001/links/weblinks",
      {
        url: args.url,
        description: args.description,
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
      testCycleIdOrKey: "SA-R1",
      url: "https://example.com",
      description: "Link to documentation",
      extraField: "should be ignored",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testcycles/SA-R1/links/weblinks",
      {
        url: args.url,
        description: args.description,
      },
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.post throwing error", async () => {
    mockClient
      .getApiClient()
      .post.mockRejectedValueOnce(new Error("API error"));

    const args = {
      testCycleIdOrKey: "SA-R1",
      url: "https://example.com",
      description: "Link to documentation",
    };

    await expect(instance.handle(args, EXTRA_REQUEST_HANDLER)).rejects.toThrow(
      "API error",
    );
  });

  it("should throw validation error if url is missing", async () => {
    const args = {
      testCycleIdOrKey: "SA-R1",
      description: "Link to documentation",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });

  it("should throw validation error if testCycleIdOrKey is missing", async () => {
    const args = {
      url: "https://example.com",
      description: "Link to documentation",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });
});
