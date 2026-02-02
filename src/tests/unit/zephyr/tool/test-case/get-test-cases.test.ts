import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  listTestCasesCursorPaginatedQueryParams,
  listTestCasesCursorPaginated200Response as listTestCasesCursorPaginatedResponse,
} from "../../../../../zephyr/common/rest-api-schemas";
import { GetTestCases } from "../../../../../zephyr/tool/test-case/get-test-cases";

describe("GetTestCases", () => {
  let mockClient: any;
  let instance: GetTestCases;

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        get: vi.fn(),
      }),
    };
    instance = new GetTestCases(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Cases");
    expect(instance.specification.summary).toBe(
      "Get details of test cases in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(
      listTestCasesCursorPaginatedQueryParams,
    );
    expect(instance.specification.outputSchema).toBe(
      listTestCasesCursorPaginatedResponse,
    );
  });

  it("should call apiClient.get with correct params and return formatted content", async () => {
    const responseMock = {
      nextStartAtId: null,
      limit: 10,
      values: [
        {
          id: 1,
          key: "PROJ-T1",
          name: "Test Case 1",
          project: {
            id: 10000,
          },
          createdOn: "2023-01-01T00:00:00Z",
          objective: "Ensure feature X works as expected",
          precondition: "User is logged in",
          estimatedTime: 138000,
          labels: ["Regression", "Performance", "Automated"],
          component: {
            id: 10001,
            self: "https://jira.example.com/rest/api/2/component/10001",
          },
          priority: {
            id: 10002,
            self: "https://api.example.com/priorities/10002",
          },
          status: {
            id: 10000,
            self: "https://api.example.com/statuses/10000",
          },
          folder: {
            id: 100006,
            self: "https://api.example.com/folders/10006",
          },
          owner: {
            self: "https://jira.example.com/rest/api/2/user?accountId=5b10a2844c20165700ede21g",
            accountId: "5b10a2844c20165700ede21g",
          },
          testScript: {
            self: "https://api.example.com/testCases/PROJ-T1/testscript",
          },
          customFields: {
            "Build Number": 20,
            "Release Date": "2020-01-01",
            "Pre-Condition(s)":
              "User should have logged in. <br> User should have navigated to the administration panel.",
            Implemented: false,
            Category: [],
            Tester: "fa2e582e-5e15-521e-92e3-47e6ca2e7256",
          },
          links: {
            self: "http://example.com",
            issues: [
              {
                issueId: 10100,
                self: "http://example.com",
                id: 1,
                target:
                  "https://jira.example.com.atlassian.net/rest/api/2/issue/10100",
                type: "COVERAGE",
              },
            ],
            webLinks: [
              {
                description: "A link to atlassian.com",
                url: "https://atlassian.com",
                self: "http://example.com",
                id: 1,
                type: "COVERAGE",
              },
            ],
          },
        },
      ],
    };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { limit: 10, startAtId: 0 };
    const result = await instance.handle(args, {});
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcases/nextgen",
      args,
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle empty args and call apiClient.get with undefined params", async () => {
    const responseMock = {
      nextStartAtId: null,
      limit: 10,
      values: [
        {
          id: 1,
          key: "PROJ-T1",
          name: "Test Case 1",
          project: {
            id: 10000,
          },
          createdOn: "2023-01-01T00:00:00Z",
          objective: "Ensure feature X works as expected",
          precondition: "User is logged in",
          estimatedTime: 138000,
          labels: ["Regression", "Performance", "Automated"],
          component: {
            id: 10001,
            self: "https://jira.example.com/rest/api/2/component/10001",
          },
          priority: {
            id: 10002,
            self: "https://api.example.com/priorities/10002",
          },
          status: {
            id: 10000,
            self: "https://api.example.com/statuses/10000",
          },
          folder: {
            id: 100006,
            self: "https://api.example.com/folders/10006",
          },
          owner: {
            self: "https://jira.example.com/rest/api/2/user?accountId=5b10a2844c20165700ede21g",
            accountId: "5b10a2844c20165700ede21g",
          },
          testScript: {
            self: "https://api.example.com/testCases/PROJ-T1/testscript",
          },
          customFields: {
            "Build Number": 20,
            "Release Date": "2020-01-01",
            "Pre-Condition(s)":
              "User should have logged in. <br> User should have navigated to the administration panel.",
            Implemented: false,
            Category: [],
            Tester: "fa2e582e-5e15-521e-92e3-47e6ca2e7256",
          },
          links: {
            self: "http://example.com",
            issues: [
              {
                issueId: 10100,
                self: "http://example.com",
                id: 1,
                target:
                  "https://jira.example.com.atlassian.net/rest/api/2/issue/10100",
                type: "COVERAGE",
              },
            ],
            webLinks: [
              {
                description: "A link to atlassian.com",
                url: "https://atlassian.com",
                self: "http://example.com",
                id: 1,
                type: "COVERAGE",
              },
            ],
          },
        },
      ],
    };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const result = await instance.handle({}, {});
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcases/nextgen",
      {
        limit: 10,
        startAtId: undefined,
      },
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));
    await expect(instance.handle({ limit: 1 }, {})).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(undefined);
    const result = await instance.handle({ limit: 1 }, {});
    expect(result.structuredContent).toBeUndefined();
  });
});
