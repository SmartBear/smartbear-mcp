import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTestExecutionBody,
  createTestExecution201Response as createTestExecutionResponse,
} from "../../../../../zephyr/common/rest-api-schemas";
import { CreateTestExecution } from "../../../../../zephyr/tool/test-execution/create-test-execution";

describe("CreateTestExecution", () => {
  let mockClient: any;
  let instance: CreateTestExecution;

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

    instance = new CreateTestExecution(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Create Test Execution");
    expect(instance.specification.summary).toBe(
      "Create a new Test Execution for a Test Case within a specific Test Cycle",
    );
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
    expect(instance.specification.inputSchema).toBe(createTestExecutionBody);
    expect(instance.specification.outputSchema).toBe(
      createTestExecutionResponse,
    );
  });

  it("should call apiClient.post with correct params and return created content information", async () => {
    const responseMock = {
      id: 53,
      self: "https://<api-base-url>/testexecutions/SA-E10",
      key: "SA-E10",
    };

    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);

    const args = {
      projectKey: "SA",
      testCaseKey: "SA-T1",
      testCycleKey: "SA-R1",
      statusName: "Pass",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testexecutions/",
      args,
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should ignore extra parameters not in the schema", async () => {
    const responseMock = {
      id: 54,
      self: "https://<api-base-url>/testexecutions/SA-E11",
      key: "SA-E11",
    };

    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);

    const args = {
      projectKey: "SA",
      testCaseKey: "SA-T1",
      testCycleKey: "SA-R1",
      statusName: "Pass",
      extraParam: "This should be ignored",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testexecutions/",
      {
        projectKey: args.projectKey,
        testCaseKey: args.testCaseKey,
        testCycleKey: args.testCycleKey,
        statusName: args.statusName,
      },
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.post throwing error", async () => {
    mockClient
      .getApiClient()
      .post.mockRejectedValueOnce(new Error("API error"));

    const args = {
      projectKey: "SA",
      testCaseKey: "SA-T1",
      testCycleKey: "SA-R1",
      statusName: "Pass",
    };

    await expect(instance.handle(args, EXTRA_REQUEST_HANDLER)).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.post returning unexpected data", async () => {
    mockClient.getApiClient().post.mockResolvedValueOnce(undefined);

    const args = {
      projectKey: "SA",
      testCaseKey: "SA-T1",
      testCycleKey: "SA-R1",
      statusName: "Pass",
    };

    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(result.structuredContent).toBeUndefined();
  });

  it("should throw validation error if projectKey is missing", async () => {
    const args = {
      testCaseKey: "SA-T1",
      testCycleKey: "SA-R1",
      statusName: "Pass",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });

  it("should throw validation error if testCaseKey is missing", async () => {
    const args = {
      projectKey: "SA",
      testCycleKey: "SA-R1",
      statusName: "Pass",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });

  it("should throw validation error if testCycleKey is missing", async () => {
    const args = {
      projectKey: "SA",
      testCaseKey: "SA-T1",
      statusName: "Pass",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });

  it("should throw validation error if statusName is missing", async () => {
    const args = {
      projectKey: "SA",
      testCaseKey: "SA-T1",
      testCycleKey: "SA-R1",
    };

    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });
});
