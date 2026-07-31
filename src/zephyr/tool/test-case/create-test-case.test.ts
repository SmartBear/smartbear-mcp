import type { ServerContext } from "@modelcontextprotocol/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CreateTestCaseBody,
  CreateTestCase201Response as CreateTestCaseResponse,
} from "../../common/rest-api-schemas";
import { CreateTestCase } from "./create-test-case";

describe("CreateTestCase", () => {
  let mockClient: any;
  let instance: CreateTestCase;
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
    instance = new CreateTestCase(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Create Test Case");
    expect(instance.specification.summary).toBe(
      "Create a new Test Case in Zephyr specified project",
    );
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
    expect(instance.specification.inputSchema).toBe(CreateTestCaseBody);
    expect(instance.specification.outputSchema).toBe(CreateTestCaseResponse);
  });

  it("should call apiClient.post with correct params and return created content information", async () => {
    const responseMock = {
      id: 53,
      self: "https://<api-base-url>/testcases/SA-T10",
      key: "SA-T10",
    };
    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);
    const args = {
      projectKey: "SA",
      name: "New Test Case",
      objective: "This is a new test case created via the API for testing",
    };
    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);
    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testcases/",
      args,
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should throw error when extra parameters not in the schema", async () => {
    const args = {
      projectKey: "SA",
      name: "New Test Case with Extra",
      objective: "This is a new test case created via the API for testing",
      extraParam: "This should be rejected",
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
      projectKey: "SA",
      name: "New Test Case",
      objective: "This is a new test case created via the API for testing",
    };
    await expect(instance.handle(args, EXTRA_REQUEST_HANDLER)).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.post returning unexpected data", async () => {
    mockClient.getApiClient().post.mockResolvedValueOnce(undefined);
    const args = {
      projectKey: "SA",
      name: "New Test Case",
      objective: "This is a new test case created via the API for testing",
    };
    const result = await instance.handle(args, EXTRA_REQUEST_HANDLER);
    expect(result.structuredContent).toBeUndefined();
  });

  it("should throw validation error if projectKey is missing", async () => {
    const args = {
      name: "New Test Case",
      objective: "This is a new test case created via the API for testing",
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
