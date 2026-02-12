import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createTestCycleBody,
  createTestCycle201Response as createTestCycleResponse,
} from "../../../../../zephyr/common/rest-api-schemas";
import { CreateTestCycle } from "../../../../../zephyr/tool/test-cycle/create-test-cycle";

describe("CreateTestCyCle", () => {
  let mockClient: any;
  let instance: CreateTestCycle;
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
    instance = new CreateTestCycle(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Create Test Cycle");
    expect(instance.specification.summary).toBe(
      "Create a new Test Cycle in Zephyr specified project",
    );
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
    expect(instance.specification.inputSchema).toBe(createTestCycleBody);
    expect(instance.specification.outputSchema).toBe(createTestCycleResponse);
  });

  it("should call apiClient.post with correct params and return created content information", async () => {
    const responseMock = {
      id: 53,
      self: "https://<api-base-url>/testcycles/SA-R1",
      key: "SA-R1",
    };
    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);
    const args = {
      projectKey: "SA",
      name: "New Test Cycle",
      description: "This is a new test cycle created via the API for testing",
    };
    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);
    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testcycles/",
      args,
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should ignore extra parameters not in the schema", async () => {
    const responseMock = {
      id: 54,
      self: "https://<api-base-url>/testcycles/SA-R2",
      key: "SA-R2",
    };
    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);
    const args = {
      projectKey: "SA",
      name: "New Test Cycles with Extra",
      description: "This is a new test cycle created via the API for testing",
      extraParam: "This should be ignored",
    };
    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);
    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testcycles/",
      {
        projectKey: args.projectKey,
        name: args.name,
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
      projectKey: "SA",
      name: "New Test Cycle",
      description: "This is a new test cycle created via the API for testing",
    };
    await expect(instance.handle(args, EXTRA_REQUEST_HANDLER)).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.post returning unexpected data", async () => {
    mockClient.getApiClient().post.mockResolvedValueOnce(undefined);
    const args = {
      projectKey: "SA",
      name: "New Test Cycle",
      description: "This is a new test cycle created via the API for testing",
    };
    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);
    expect(result.structuredContent).toBeUndefined();
  });

  it("should throw validation error if projectKey is missing", async () => {
    const args = {
      name: "New Test Cycle",
      description: "This is a new test cycle created via the API for testing",
    };
    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });

  it("should throw validation error if name is missing", async () => {
    const args = {
      projectKey: "SA",
      precondition: "Name should have been provided",
    };
    await expect(
      instance.handle(args, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });
});
