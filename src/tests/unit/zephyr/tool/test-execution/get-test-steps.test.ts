import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetTestExecutionTestSteps200Response as getTestExecutionStepsResponse } from "../../../../../zephyr/common/rest-api-schemas";
import { GetTestExecutionSteps } from "../../../../../zephyr/tool/test-execution/get-test-steps";

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
      "Get details of test execution steps in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBeDefined();
    expect(instance.specification.outputSchema).toBe(
      getTestExecutionStepsResponse,
    );
  });

  it("should call apiClient.get with correct path and return API-compliant response", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      maxResults: 10,
      total: 1,
      isLast: true,
      values: [
        {
          inline: {
            description: "Step description",
            testData: "Username = SmartBear Password = SmartBear",
            expectedResult: "Expected result",
            actualResult: "Actual result",
            testDataRowNumber: 1,
            reflectRef: "Not available yet",
            status: {
              id: 10000,
              self: "https://api.example.com/statuses/10000",
            },
          },
        },
      ],
    };

    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const args = {
      testExecutionIdOrKey: "SA-E1",
    };

    const result = await instance.handle(args, {});

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testexecutions/SA-E1/teststeps",
      {
        maxResults: 10,
        startAt: 0,
      },
    );

    expect(result.structuredContent).toBe(responseMock);
    expect(result.content).toEqual([]);
  });

  it("should handle empty response values", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      maxResults: 10,
      total: 0,
      isLast: true,
      values: [
        {
          inline: {}
        }
      ],
    };

    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const result = await instance.handle(
      { testExecutionIdOrKey: "SA-E1" },
      {},
    );

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testexecutions/SA-E1/teststeps",
      {
        maxResults: 10,
        startAt: 0,
      },
    );

    expect(result.structuredContent).toEqual(responseMock);
    expect(result.content).toEqual([]);
  });

  it("should handle default query params when only testExecutionIdOrKey is provided", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      maxResults: 10,
      total: 1,
      isLast: true,
      values: [
        {
          inline: {
            description: "Step description",
            expectedResult: "Expected result",
            actualResult: "Actual result",
            testDataRowNumber: 0,
          },
        },
      ],
    };

    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const result = await instance.handle({ testExecutionIdOrKey: "SA-E1" }, {});

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testexecutions/SA-E1/teststeps",
      {
        maxResults: 10,
        startAt: 0,
      },
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should pass testDataRowNumber when provided", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      maxResults: 5,
      total: 1,
      isLast: true,
      values: [
        {
          inline: {
            description: "Filtered step description",
            expectedResult: "Expected result",
            actualResult: "Actual result",
            testDataRowNumber: 3,
          },
        },
      ],
    };

    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const result = await instance.handle(
      {
        testExecutionIdOrKey: "SA-E1",
        maxResults: 5,
        startAt: 0,
        testDataRowNumber: 3,
      },
      {},
    );

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testexecutions/SA-E1/teststeps",
      {
        maxResults: 5,
        startAt: 0,
        testDataRowNumber: 3,
      },
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should support test execution ID as testExecutionIdOrKey path param", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      maxResults: 1,
      total: 1,
      isLast: true,
      values: [
        {
          inline: {
            description: "Step",
            expectedResult: "Expected result",
            actualResult: "Actual result",
          },
        },
      ],
    };

    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);

    const result = await instance.handle(
      {
        testExecutionIdOrKey: "12345",
        maxResults: 1,
      },
      {},
    );

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testexecutions/12345/teststeps",
      {
        maxResults: 1,
        startAt: 0,
      },
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));

    await expect(
      instance.handle({ testExecutionIdOrKey: "SA-E1", maxResults: 1 }, {}),
    ).rejects.toThrow("API error");
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(undefined);

    const result = await instance.handle(
      { testExecutionIdOrKey: "SA-E1", maxResults: 1 },
      {},
    );

    expect(result.structuredContent).toBeUndefined();
    expect(result.content).toEqual([]);
  });
});
