import { describe, expect, it, vi } from "vitest";
import { GetTestExecutionsResponseSchema } from "../../../../../zephyr/common/types.js";
import {
  GetTestExecutions,
  GetTestExecutionsInputSchema,
} from "../../../../../zephyr/tool/testexecution/get-testexecutions.js";

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
      GetTestExecutionsInputSchema,
    );
    expect(instance.specification.outputSchema).toBe(
      GetTestExecutionsResponseSchema,
    );
  });

  it("should call apiClient.get with correct params and return formatted content", async () => {
    const responseMock = {
      next: "string",
      nextStartAtId: 0,
      limit: 1,
      values: [
        {
          id: 1,
          key: "SA-E10",
          project: {
            id: 10005,
            self: "https://<api-base-url>/projects/10005",
          },
          testCase: {
            id: 10002,
            self: "https://<api-base-url>/testcases/PROJ-T1/versions/1",
          },
          environment: {
            id: 10005,
            self: "https://example.com/rest/api/v2/environment/10005",
          },
          jiraProjectVersion: {
            id: 10000,
            self: "https://<jira-instance>.atlassian.net/rest/api/2/version/10000",
          },
          testExecutionStatus: {
            id: 10000,
            self: "https://<api-base-url>/statuses/10000",
          },
          actualEndDate: "2018-05-20T13:15:13Z",
          estimatedTime: 138000,
          executionTime: 120000,
          executedById: "5b10a2844c20165700ede21g",
          assignedToId: "5b10a2844c20165700ede21g",
          comment: "Test failed user could not login",
          automated: true,
          testCycle: {
            id: 10010,
            self: "https://<api-base-url>/testcycles/10010",
          },
          customFields: {
            "Build Number": 20,
            "Release Date": "2020-01-01",
            "Pre-Condition(s)":
              "User should have logged in. <br> User should have navigated to the administration panel.",
            Implemented: false,
            Category: ["Performance", "Regression"],
            Tester: "fa2e582e-5e15-521e-92e3-47e6ca2e7256",
          },
          links: {
            self: "string",
            issues: [
              {
                self: "string",
                issueId: 10100,
                id: 1,
                target:
                  "https://<jira-instance>.atlassian.net/rest/api/2/issue/10000",
                type: "COVERAGE",
              },
            ],
          },
        },
      ],
    };
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const args = { limit: 1, startAtId: 0 };
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
      nextStartAtId: 0,
      limit: 10,
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
