import { beforeEach, describe, expect, it } from "vitest";
import {
  ListTestCasesCursorPaginatedQueryParams,
  ListTestCasesCursorPaginated200Response as ListTestCasesCursorPaginatedResponse,
} from "../../common/rest-api-schemas.ts";
import {
  asZephyrClient,
  createMockZephyrClient,
  fakeExtra,
  type MockZephyrClient,
} from "../../common/test-helpers.ts";
import { GetTestCases } from "./get-test-cases.ts";

describe("GetTestCases", () => {
  let mockClient: MockZephyrClient;
  let instance: GetTestCases;

  beforeEach(() => {
    mockClient = createMockZephyrClient();
    instance = new GetTestCases(asZephyrClient(mockClient));
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Cases");
    expect(instance.specification.summary).toBe(
      "Get details of test cases in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(
      ListTestCasesCursorPaginatedQueryParams,
    );
    expect(instance.specification.outputSchema).toBe(
      ListTestCasesCursorPaginatedResponse,
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
            id: 10_000,
          },
          createdOn: "2023-01-01T00:00:00Z",
          objective: "Ensure feature X works as expected",
          precondition: "User is logged in",
          estimatedTime: 138_000,
          labels: ["Regression", "Performance", "Automated"],
          component: {
            id: 10_001,
            self: "https://jira.example.com/rest/api/2/component/10001",
          },
          priority: {
            id: 10_002,
            self: "https://api.example.com/priorities/10002",
          },
          status: {
            id: 10_000,
            self: "https://api.example.com/statuses/10000",
          },
          folder: {
            id: 100_006,
            self: "https://api.example.com/folders/10006",
          },
          owner: {
            // biome-ignore lint/security/noSecrets: fixture Jira/Atlassian account ID and URL used in test data, not a secret
            self: "https://jira.example.com/rest/api/2/user?accountId=5b10a2844c20165700ede21g",
            // biome-ignore lint/security/noSecrets: fixture Jira/Atlassian account ID and URL used in test data, not a secret
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
                issueId: 10_100,
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
    const result = await instance.handle(args, fakeExtra);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcases/nextgen",
      args,
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle empty args and call apiClient.get with default param values", async () => {
    const responseMock = {
      nextStartAtId: null,
      limit: 10,
      values: [
        {
          id: 1,
          key: "PROJ-T1",
          name: "Test Case 1",
          project: {
            id: 10_000,
          },
          createdOn: "2023-01-01T00:00:00Z",
          objective: "Ensure feature X works as expected",
          precondition: "User is logged in",
          estimatedTime: 138_000,
          labels: ["Regression", "Performance", "Automated"],
          component: {
            id: 10_001,
            self: "https://jira.example.com/rest/api/2/component/10001",
          },
          priority: {
            id: 10_002,
            self: "https://api.example.com/priorities/10002",
          },
          status: {
            id: 10_000,
            self: "https://api.example.com/statuses/10000",
          },
          folder: {
            id: 100_006,
            self: "https://api.example.com/folders/10006",
          },
          owner: {
            // biome-ignore lint/security/noSecrets: fixture Jira/Atlassian account ID and URL used in test data, not a secret
            self: "https://jira.example.com/rest/api/2/user?accountId=5b10a2844c20165700ede21g",
            // biome-ignore lint/security/noSecrets: fixture Jira/Atlassian account ID and URL used in test data, not a secret
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
                issueId: 10_100,
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
    const result = await instance.handle({}, fakeExtra);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcases/nextgen",
      {
        limit: 10,
        startAtId: 0,
      },
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));
    await expect(instance.handle({ limit: 1 }, fakeExtra)).rejects.toThrow(
      "API error",
    );
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(undefined);
    const result = await instance.handle({ limit: 1 }, fakeExtra);
    expect(result.structuredContent).toBeUndefined();
  });
});
