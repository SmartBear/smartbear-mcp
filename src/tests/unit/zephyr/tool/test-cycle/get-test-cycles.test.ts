import { describe, expect, it, vi } from "vitest";
import { ZephyrTestCycleListSchema } from "../../../../../zephyr/common/types.js";
import {
  GetTestCycles,
  GetTestCyclesInputSchema,
} from "../../../../../zephyr/tool/test-cycle/get-test-cycles.js";

describe("GetTestCycles", () => {
  const mockApiClient = { get: vi.fn() };
  const instance = new GetTestCycles(mockApiClient as any);

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Cycles");
    expect(instance.specification.summary).toBe(
      "Get details of Test Cycles in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(GetTestCyclesInputSchema);
    expect(instance.specification.outputSchema).toBe(ZephyrTestCycleListSchema);
  });

  it("should call apiClient.get with correct params and return formatted content", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      maxResults: 10,
      total: 1,
      isLast: true,
      values: [
        {
          id: 1,
          key: "SA-R40",
          name: "Sprint 1 Regression Test Cycle",
          project: {
            id: 10005,
            self: "https://api.example.com/projects/10005",
          },
          jiraProjectVersion: {
            id: 10000,
            self: "https://jira.example.com/rest/api/2/version/10000",
          },
          status: {
            id: 10000,
            self: "https://api.example.com/statuses/10000",
          },
          folder: {
            id: 100006,
            self: "https://api.example.com/folders/10006",
          },
          description: "Regression test cycle 1 to ensure no breaking changes",
          plannedStartDate: "2018-05-19T13:15:13Z",
          plannedEndDate: "2018-05-20T13:15:13Z",
          owner: {
            self: "https://jira.example.com/rest/api/2/user?accountId=5b10a2844c20165700ede21g",
            accountId: "5b10a2844c20165700ede21g",
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
                target: "https://jira.example.com/rest/api/2/issue/10000",
                type: "COVERAGE",
              },
            ],
            webLinks: [
              {
                self: "string",
                description: "A link to atlassian.com",
                url: "https://atlassian.com",
                id: 1,
                type: "COVERAGE",
              },
            ],
            testPlans: [
              {
                id: 1,
                self: "https://api.example.com/links/1",
                type: "RELATED",
                testPlanId: 2,
                target: "https://jira.example.com/rest/api/2/testplan/123",
              },
            ],
          },
        },
      ],
    };
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const args = { maxResults: 10, startAt: 0 };
    const result = await instance.handle(args, {});
    expect(mockApiClient.get).toHaveBeenCalledWith("/testcycles", args);
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle empty args and call apiClient.get with undefined params", async () => {
    const responseMock = {
      next: null,
      startAt: 0,
      maxResults: 10,
      total: 1,
      isLast: true,
      values: [
        {
          id: 1,
          key: "SA-R40",
          name: "Sprint 1 Regression Test Cycle",
          project: {
            id: 10005,
            self: "https://api.example.com/projects/10005",
          },
          jiraProjectVersion: {
            id: 10000,
            self: "https://jira.example.com/rest/api/2/version/10000",
          },
          status: {
            id: 10000,
            self: "https://api.example.com/statuses/10000",
          },
          folder: {
            id: 100006,
            self: "https://api.example.com/folders/10006",
          },
          description: "Regression test cycle 1 to ensure no breaking changes",
          plannedStartDate: "2018-05-19T13:15:13Z",
          plannedEndDate: "2018-05-20T13:15:13Z",
          owner: {
            self: "https://jira.example.com/rest/api/2/user?accountId=5b10a2844c20165700ede21g",
            accountId: "5b10a2844c20165700ede21g",
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
                target: "https://jira.example.com/rest/api/2/issue/10000",
                type: "COVERAGE",
              },
            ],
            webLinks: [
              {
                self: "string",
                description: "A link to atlassian.com",
                url: "https://atlassian.com",
                id: 1,
                type: "COVERAGE",
              },
            ],
            testPlans: [
              {
                id: 1,
                self: "https://api.example.com/links/1",
                type: "RELATED",
                testPlanId: 2,
                target: "https://jira.example.com/rest/api/2/testplan/123",
              },
            ],
          },
        },
      ],
    };
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const result = await instance.handle({}, {});
    expect(mockApiClient.get).toHaveBeenCalledWith("/testcycles", {
      maxResults: undefined,
      startAt: undefined,
    });
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockApiClient.get.mockRejectedValueOnce(new Error("API error"));
    await expect(instance.handle({ maxResults: 1 }, {})).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockApiClient.get.mockResolvedValueOnce(undefined);
    const result = await instance.handle({ maxResults: 1 }, {});
    expect(result.structuredContent).toBeUndefined();
  });
});
