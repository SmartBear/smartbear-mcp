import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreateTestCaseTestSteps201Response as createTestCaseTestStepsResponse } from "../../common/rest-api-schemas.ts";
import { CreateTestSteps } from "./create-test-steps.ts";

describe("CreateTestSteps", () => {
  let mockClient: any;
  let instance: CreateTestSteps;

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
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        post: vi.fn(),
      }),
    };
    instance = new CreateTestSteps(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Create Test Case Steps");
    expect(instance.specification.summary).toBe(
      "Create steps for a Test Case in Zephyr. Supports inline step definitions or delegating execution to another test case (also known as 'call to test' via UI). Requires a mode: `APPEND` adds steps to the end of the existing list, `OVERWRITE` deletes all existing steps and replaces them with the provided ones. Always ask the user to choose between OVERWRITE or APPEND before calling this tool.",
    );
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.destructive).toBe(true);
    expect(instance.specification.idempotent).toBe(false);
    expect(instance.specification.inputSchema).toBeDefined();
    expect(instance.specification.outputSchema).toBe(
      createTestCaseTestStepsResponse,
    );
  });

  it("should call apiClient.post with correct params and return created test steps information", async () => {
    const responseMock = {
      id: 101,
      self: "https://<api-base-url>/testcases/SA-T1/teststeps",
    };

    mockClient.getApiClient().post.mockResolvedValueOnce(responseMock);

    const args = {
      testCaseKey: "SA-T1",
      mode: "APPEND",
      items: [
        {
          inline: {
            description: "Navigate to the login page",
            expectedResult: "Login page is displayed",
          },
        },
      ],
    };

    const result = await instance.handle(args, ExtraRequestHandler);

    expect(mockClient.getApiClient().post).toHaveBeenCalledWith(
      "/testcases/SA-T1/teststeps",
      {
        mode: args.mode,
        items: args.items,
      },
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should throw error when extra parameters not in the schema", async () => {
    const args = {
      testCaseKey: "SA-T1",
      mode: "APPEND",
      items: [
        {
          inline: {
            description: "Navigate to the login page",
            expectedResult: "Login page is displayed",
          },
        },
      ],
      extraField: "should be rejected",
    };

    await expect(instance.handle(args, ExtraRequestHandler)).rejects.toThrow();
  });

  it("should handle apiClient.post throwing error", async () => {
    mockClient
      .getApiClient()
      .post.mockRejectedValueOnce(new Error("API error"));

    const args = {
      testCaseKey: "SA-T1",
      mode: "APPEND",
      items: [
        {
          inline: {
            description: "Navigate to the login page",
            expectedResult: "Login page is displayed",
          },
        },
      ],
    };

    await expect(instance.handle(args, ExtraRequestHandler)).rejects.toThrow(
      "API error",
    );
  });

  it("should throw validation error if testCaseKey is missing", async () => {
    const args = {
      mode: "APPEND",
      items: [
        {
          inline: {
            description: "Navigate to the login page",
          },
        },
      ],
    };

    await expect(instance.handle(args, ExtraRequestHandler)).rejects.toThrow();
  });

  it("should throw validation error if mode is missing", async () => {
    const args = {
      testCaseKey: "SA-T1",
      items: [
        {
          inline: {
            description: "Navigate to the login page",
          },
        },
      ],
    };

    await expect(instance.handle(args, ExtraRequestHandler)).rejects.toThrow();
  });

  it("should throw validation error if items is missing", async () => {
    const args = {
      testCaseKey: "SA-T1",
      mode: "APPEND",
    };

    await expect(instance.handle(args, ExtraRequestHandler)).rejects.toThrow();
  });
});
