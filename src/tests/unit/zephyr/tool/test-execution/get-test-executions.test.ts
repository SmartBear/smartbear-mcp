import { describe, expect, it, vi } from "vitest";
import {
  listTestExecutionsNextgenResponse,
  listTestExecutionsQueryParams,
} from "../../../../../zephyr/common/rest-api-schemas.js";
import { GetTestExecutions } from "../../../../../zephyr/tool/testexecution/get-test-executions.js";

describe("GetTestExecutions", () => {
  const mockApiClient = { get: vi.fn() };
  const instance = new GetTestExecutions(mockApiClient as any);

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Executions");
    expect(instance.specification.summary).toBe(
      "Get test executions with optional filters",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(
      listTestExecutionsQueryParams,
    );
    expect(instance.specification.outputSchema).toBe(
      listTestExecutionsNextgenResponse,
    );
  });

  it("should call apiClient.get with correct params and return formatted content", async () => {
    const responseMock = {
      next: null,
      limit: 10,
      startAtId: 0,
      total: 1,
      isLast: true,
      values: [
        {
          id: 1,
          key: "TE-1",
          name: "Test Execution 1",
          project: {
            id: 10005,
            self: "https://api.example.com/projects/10005",
          },
          status: "PASSED",
          executedBy: {
            accountId: "5b10a2844c20165700ede21g",
            self: "https://jira.example.com/rest/api/2/user?accountId=5b10a2844c20165700ede21g",
          },
          actualEndDate: "2024-05-01T10:00:00Z",
          customFields: {
            Environment: "Staging",
            Browser: "Chrome",
          },
        },
      ],
    };
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const args = { limit: 10, startAtId: 0 };
    const result = await instance.handle(args, {});
    expect(mockApiClient.get).toHaveBeenCalledWith(
      "/testexecutions/nextgen",
      args,
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle empty args and call apiClient.get with undefined params", async () => {
    const responseMock = {
      next: null,
      limit: 10,
      startAtId: undefined,
      total: 1,
      isLast: true,
      values: [],
    };
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const result = await instance.handle({}, {});
    expect(mockApiClient.get).toHaveBeenCalledWith(
      "/testexecutions/nextgen",
      {},
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockApiClient.get.mockRejectedValueOnce(new Error("API error"));
    await expect(instance.handle({ limit: 1 }, {})).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockApiClient.get.mockResolvedValueOnce(undefined);
    const result = await instance.handle({ limit: 1 }, {});
    expect(result.structuredContent).toBeUndefined();
  });
});
