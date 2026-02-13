import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestCaseTestScript201Response as createTestCaseScriptResponse } from "../../../../../zephyr/common/rest-api-schemas";
import { CreateTestScript } from "../../../../../zephyr/tool/test-case/create-test-script";

describe("CreateTestScript", () => {
  let mockClient: any;
  let instance: CreateTestScript;

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
    instance = new CreateTestScript(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Create Test Script");
    expect(instance.specification.summary).toBe(
      "Create a new Test Script in Zephyr specified project",
    );
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
    expect(instance.specification.inputSchema).toBeDefined();
    expect(instance.specification.outputSchema).toBe(
      createTestCaseScriptResponse,
    );
  });

  it("should call apiClient.post with correct params and return created script information", async () => {
    const responseMock = {
      id: 101,
      self: "https://<api-base-url>/testcases/SA-T1/testscript",
    };

    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);

    const args = {
      testCaseKey: "SA-T1",
      type: "plain",
      text: "1. Navigate to Pump Settings\n2. Enable Axial Pump\n3. Verify pump status is 'Active'",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testcases/SA-T1/testscript",
      {
        type: args.type,
        text: args.text,
      },
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should ignore extra parameters not in the schema", async () => {
    const responseMock = {
      id: 102,
      self: "https://<api-base-url>/testcases/SA-T2/testscript",
    };

    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);

    const args = {
      testCaseKey: "SA-T2",
      type: "plain",
      text: "1. Step one\n2. Step two",
      extraParam: "should be ignored",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testcases/SA-T2/testscript",
      {
        type: args.type,
        text: args.text,
      },
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.post throwing error", async () => {
    mockClient
      .getApiClient()
      .post.mockRejectedValueOnce(new Error("API error"));

    const args = {
      testCaseKey: "SA-T3",
      type: "plain",
      text: "1. Step one\n2. Step two",
    };

    await expect(instance.handle(args, EXTRA_REQUEST_HANDLER)).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.post returning unexpected data", async () => {
    mockClient.getApiClient().post.mockResolvedValueOnce(undefined);

    const args = {
      testCaseKey: "SA-T4",
      type: "plain",
      text: "1. Step one\n2. Step two",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(result.structuredContent).toBeUndefined();
  });

  it("should throw validation error if testCaseKey is missing", async () => {
    const args = {
      type: "plain",
      text: "1. Step one\n2. Step two",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });

  it("should throw validation error if type is missing", async () => {
    const args = {
      testCaseKey: "SA-T5",
      text: "1. Step one\n2. Step two",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });

  it("should throw validation error if text is missing", async () => {
    const args = {
      testCaseKey: "SA-T6",
      type: "plain",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });
});
