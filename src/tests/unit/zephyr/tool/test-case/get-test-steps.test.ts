import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetTestCaseTestSteps200Response as getTestCaseResponse } from "../../../../../zephyr/common/rest-api-schemas";
import { GetTestCaseSteps } from "../../../../../zephyr/tool/test-case/get-test-steps";

describe("GetTestCaseSteps", () => {
  let mockClient: any;
  let instance: GetTestCaseSteps;

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        get: vi.fn(),
      }),
    };
    instance = new GetTestCaseSteps(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Case Steps");
    expect(instance.specification.summary).toBe(
      "Get details of test case steps in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBeDefined();
    expect(instance.specification.outputSchema).toBe(getTestCaseResponse);
  });

  it("should call apiClient.get with correct path and return API-compliant response", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      maxResults: 10,
      total: 1,
      isLast: false,
      values: [
        {
          inline: {
            description: "Step description",
            expectedResult: "Expected result",
          },
          testCase: {
            key: "SA-T1",
            id: 10001,
          },
        },
      ],
    };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { testCaseKey: "SA-T1", maxResults: 10, startAt: 0 };

    const result = await instance.handle(args, {});

    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcases/SA-T1/teststeps",
      {
        maxResults: 10,
        startAt: 0,
      },
    );

    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle empty args and call apiClient.get with default param values", async () => {
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
          },
          testCase: {
            key: "SA-T1",
            id: 10001,
          },
        },
      ],
    };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const result = await instance.handle({ testCaseKey: "SA-T1" }, {});
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcases/SA-T1/teststeps",
      {
        maxResults: 10,
        startAt: 0,
      },
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));
    await expect(
      instance.handle({ testCaseKey: "SA-T1", maxResults: 1 }, {}),
    ).rejects.toThrow("API error");
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(undefined);
    const result = await instance.handle(
      { testCaseKey: "SA-T1", maxResults: 1 },
      {},
    );
    expect(result.structuredContent).toBeUndefined();
  });
});
