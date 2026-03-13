import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { UpdateTestExecutionSteps } from "../../../../../zephyr/tool/test-execution/update-test-execution-steps";

describe("UpdateTestExecutionSteps", () => {
  let mockClient: any;
  let instance: UpdateTestExecutionSteps;

  const EXTRA_REQUEST_HANDLER: RequestHandlerExtra<
    ServerRequest,
    ServerNotification
  > = {
    signal: AbortSignal.timeout(5000),
    requestId: "",
    sendNotification: () => {
      throw new Error("Not implemented");
    },
    sendRequest: () => {
      throw new Error("Not implemented");
    },
  };

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        put: vi.fn(),
      }),
    };
    instance = new UpdateTestExecutionSteps(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Update Test Execution Steps");
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBeDefined();

    const validInput = {
      testExecutionIdOrKey: "SA-E1",
      steps: [{ statusName: "Pass", actualResult: "Looks good" }],
    };
    expect(
      instance.specification.inputSchema?.safeParse(validInput).success,
    ).toBe(true);

    const missingKey = { steps: [{ statusName: "Pass" }] };
    expect(
      instance.specification.inputSchema?.safeParse(missingKey).success,
    ).toBe(false);
  });

  it("should call PUT on the correct endpoint with steps body using a key", async () => {
    mockClient.getApiClient().put.mockResolvedValueOnce({});

    const args = {
      testExecutionIdOrKey: "SA-E1",
      steps: [
        { statusName: "Pass", actualResult: "Login page displayed" },
        { statusName: "Pass", actualResult: "User redirected to dashboard" },
      ],
    };

    await instance.handle(args, EXTRA_REQUEST_HANDLER);

    expect(mockClient.getApiClient().put).toHaveBeenCalledWith(
      "/testexecutions/SA-E1/teststeps",
      {
        steps: [
          { statusName: "Pass", actualResult: "Login page displayed" },
          { statusName: "Pass", actualResult: "User redirected to dashboard" },
        ],
      },
    );
  });

  it("should call PUT on the correct endpoint using a numeric ID", async () => {
    mockClient.getApiClient().put.mockResolvedValueOnce({});

    await instance.handle(
      { testExecutionIdOrKey: "10", steps: [{ statusName: "Fail" }] },
      EXTRA_REQUEST_HANDLER,
    );

    expect(mockClient.getApiClient().put).toHaveBeenCalledWith(
      "/testexecutions/10/teststeps",
      { steps: [{ statusName: "Fail" }] },
    );
  });

  it("should return empty structuredContent on success", async () => {
    mockClient.getApiClient().put.mockResolvedValueOnce({});

    const result = await instance.handle(
      {
        testExecutionIdOrKey: "SA-E1",
        steps: [{ statusName: "Pass" }],
      },
      EXTRA_REQUEST_HANDLER,
    );

    expect(result.structuredContent).toEqual({});
    expect(result.content).toEqual([]);
  });

  it("should work when steps contain only actualResult (no statusName)", async () => {
    mockClient.getApiClient().put.mockResolvedValueOnce({});

    const args = {
      testExecutionIdOrKey: "SA-E5",
      steps: [{ actualResult: "Page loaded in 1.2s" }],
    };

    await instance.handle(args, EXTRA_REQUEST_HANDLER);

    const body = mockClient.getApiClient().put.mock.calls[0][1];
    expect(body.steps[0].actualResult).toBe("Page loaded in 1.2s");
    expect(body.steps[0].statusName).toBeUndefined();
  });

  it("should reject when PUT fails", async () => {
    mockClient
      .getApiClient()
      .put.mockRejectedValueOnce(new Error("Update failed"));

    await expect(
      instance.handle(
        { testExecutionIdOrKey: "SA-E1", steps: [{ statusName: "Pass" }] },
        EXTRA_REQUEST_HANDLER,
      ),
    ).rejects.toThrow("Update failed");
  });

  it("should throw a validation error when testExecutionIdOrKey is missing", async () => {
    await expect(
      instance.handle({ steps: [{ statusName: "Pass" }] }, EXTRA_REQUEST_HANDLER),
    ).rejects.toThrow();
  });
});
