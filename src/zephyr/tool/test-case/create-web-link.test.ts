import type { ServerContext } from "@modelcontextprotocol/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateTestCaseWebLink201Response as CreateTestCaseWebLinkResponse } from "../../common/rest-api-schemas";
import { CreateTestCaseWebLink } from "./create-web-link";

describe("CreateTestCaseWebLink", () => {
  let mockClient: any;
  let instance: CreateTestCaseWebLink;

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
    instance = new CreateTestCaseWebLink(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Create Test Case Web Link");
    expect(instance.specification.summary).toBe(
      "Create a new Web Link for a Test Case in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
    expect(instance.specification.inputSchema).toBeDefined();
    expect(instance.specification.outputSchema).toBe(
      CreateTestCaseWebLinkResponse,
    );
  });

  it("should call apiClient.post with correct params and return created web link information", async () => {
    const responseMock = {
      id: 53,
      self: "https://<api-base-url>/weblinks/53",
    };

    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);

    const args = {
      testCaseKey: "SA-T1",
      url: "https://example.com",
      description: "Link to documentation",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testcases/SA-T1/links/weblinks",
      {
        url: args.url,
        description: args.description,
      },
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should throw error when extra parameters not in the schema", async () => {
    const args = {
      testCaseKey: "SA-T1",
      url: "https://example.com",
      description: "Link to documentation",
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
      testCaseKey: "SA-T1",
      url: "https://example.com",
      description: "Link to documentation",
    };

    await expect(instance.handle(args, EXTRA_REQUEST_HANDLER)).rejects.toThrow(
      "API error",
    );
  });

  it("should throw validation error if url is missing", async () => {
    const args = {
      testCaseKey: "SA-T1",
      description: "Link to documentation",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });

  it("should throw validation error if testCaseKey is missing", async () => {
    const args = {
      url: "https://example.com",
      description: "Link to documentation",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });
});
