import { describe, expect, it, vi } from "vitest";
import {
  listTestExecutionsNextgenQueryParams,
  listTestExecutionsNextgenResponse,
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
      listTestExecutionsNextgenQueryParams,
    );
    expect(instance.specification.outputSchema).toBe(
      listTestExecutionsNextgenResponse,
    );
  });

  it("should call apiClient.get with correct params and return formatted content", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      limit: 10,
      total: 2,
      isLast: true,
      values: [
        {
          id: 1,
          key: "TEST-E1",
          project: {
            id: 100,
            self: "https://api.example.com/projects/100",
          },
          testCase: {
            id: 200,
            self: "https://api.example.com/testcases/200",
          },
          testExecutionStatus: {
            id: 1,
            self: "https://api.example.com/statuses/1",
          },
          actualEndDate: "2024-01-15T10:30:00Z",
          estimatedTime: 3600000,
          executionTime: 3500000,
          executedById: "account-id-123",
          assignedToId: "account-id-456",
          comment: "Test completed successfully",
          automated: false,
          environment: {
            id: 5,
            self: "https://api.example.com/environments/5",
          },
          jiraProjectVersion: {
            id: 10,
            self: "https://api.example.com/versions/10",
          },
          testCycle: {
            id: 50,
            self: "https://api.example.com/cycles/50",
          },
          customFields: {
            customfield_10001: "value1",
          },
          links: {
            self: "https://api.example.com/executions/1",
            issues: [
              {
                issueId: 300,
                id: 1,
                self: "https://api.example.com/links/1",
                target: "https://jira.example.com/rest/api/3/issue/300",
                type: "COVERAGE",
              },
            ],
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
    expect(mockApiClient.get).toHaveBeenCalledWith("/testexecutions/nextgen", {
      limit: 10,
    });
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
