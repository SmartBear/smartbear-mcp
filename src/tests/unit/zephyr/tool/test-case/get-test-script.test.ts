import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetTestCaseTestScript200Response as GetTestScriptResponse } from "../../../../../zephyr/common/rest-api-schemas";
import { GetTestScript } from "../../../../../zephyr/tool/test-case/get-test-script";

describe("GetTestScript", () => {
  let mockClient: any;
  let instance: GetTestScript;

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
    instance = new GetTestScript(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Script");
    expect(instance.specification.summary).toBe(
      "Get the Test Script (Plain Text or BDD) for a given Test Case in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBeDefined();
    expect(instance.specification.outputSchema).toBe(GetTestScriptResponse);
  });

  it("should call apiClient.get with correct params and return test script", async () => {
    const responseMock = {
      type: "plain",
      text: "1. Navigate to Pump Settings\n2. Enable Axial Pump\n3. Verify pump status is 'Active'",
      id: 101,
    };

    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const args = {
      testCaseKey: "SA-T1",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcases/SA-T1/testscript",
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should return BDD test script", async () => {
    const responseMock = {
      type: "bdd",
      text: "Given the axial pump is installed\nWhen the user enables the axial pump\nThen the pump status should be Active",
      id: 202,
    };

    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const args = {
      testCaseKey: "MM2-T15",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcases/MM2-T15/testscript",
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should ignore extra parameters not in the schema", async () => {
    const responseMock = {
      type: "plain",
      text: "1. Step one\n2. Step two",
      id: 303,
    };

    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const args = {
      testCaseKey: "SA-T2",
      extraParam: "should be ignored",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcases/SA-T2/testscript",
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));

    const args = {
      testCaseKey: "SA-T3",
    };

    await expect(instance.handle(args, EXTRA_REQUEST_HANDLER)).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.get returning undefined", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(undefined);

    const args = {
      testCaseKey: "SA-T4",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(result.structuredContent).toBeUndefined();
  });

  it("should throw validation error if testCaseKey is missing", async () => {
    const args = {};

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });

  it("should throw validation error if testCaseKey has invalid format", async () => {
    const args = {
      testCaseKey: "invalid-key",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });
});
