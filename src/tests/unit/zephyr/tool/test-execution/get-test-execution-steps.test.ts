import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetTestExecutionTestSteps200Response as GetTestExecutionTestStepsResponse } from "../../../../../zephyr/common/rest-api-schemas";
import { GetTestExecutionSteps } from "../../../../../zephyr/tool/test-execution/get-test-execution-steps";

const responseMock = {
  next: null,
  startAt: 0,
  maxResults: 10,
  total: 2,
  isLast: true,
  values: [
    {
      inline: {
        description: "Navigate to the login page",
        expectedResult: "Login page is displayed",
        actualResult: "Login page displayed as expected",
        status: { id: 1 },
      },
    },
    {
      inline: {
        description: "Enter valid credentials and click Submit",
        expectedResult: "User is redirected to the dashboard",
        actualResult: "User redirected to dashboard successfully",
        status: { id: 1 },
      },
    },
  ],
};

describe("GetTestExecutionSteps", () => {
  let mockClient: any;
  let instance: GetTestExecutionSteps;

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        get: vi.fn(),
      }),
    };
    instance = new GetTestExecutionSteps(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Execution Steps");
    expect(instance.specification.summary).toBe(
      "Get the test steps for a Test Execution in Zephyr, including each step's status and actual result.",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBeDefined();
    expect(instance.specification.outputSchema).toBe(
      GetTestExecutionTestStepsResponse,
    );
  });

  it("should call apiClient.get with key-based testExecutionIdOrKey and return response", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const result = await instance.handle(
      { testExecutionIdOrKey: "SA-E1", maxResults: 10, startAt: 0 },
      {},
    );

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testexecutions/SA-E1/teststeps",
      { maxResults: 10, startAt: 0 },
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should call apiClient.get with numeric ID-based testExecutionIdOrKey", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const result = await instance.handle(
      { testExecutionIdOrKey: "42" },
      {},
    );

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testexecutions/42/teststeps",
      { maxResults: 10, startAt: 0 },
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should pass testDataRowNumber query param when provided", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    await instance.handle(
      { testExecutionIdOrKey: "SA-E10", testDataRowNumber: 1 },
      {},
    );

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testexecutions/SA-E10/teststeps",
      { maxResults: 10, startAt: 0, testDataRowNumber: 1 },
    );
  });

  it("should use default pagination when not specified", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    await instance.handle({ testExecutionIdOrKey: "SA-E1" }, {});

    const callArgs = mockClient.getApiClient().get.mock.calls[0];
    expect(callArgs[1].maxResults).toBe(10);
    expect(callArgs[1].startAt).toBe(0);
  });

  it("should reject when apiClient.get throws", async () => {
    mockClient
      .getApiClient()
      .get.mockRejectedValueOnce(new Error("API error"));

    await expect(
      instance.handle({ testExecutionIdOrKey: "SA-E1" }, {}),
    ).rejects.toThrow("API error");
  });

  it("should throw a validation error when testExecutionIdOrKey is missing", async () => {
    await expect(instance.handle({}, {})).rejects.toThrow();
  });
});
