import { beforeEach, describe, expect, it } from "vitest";
import {
  GetTestExecutionParams,
  GetTestExecution200Response as GetTestExecutionResponse,
} from "../../common/rest-api-schemas.ts";
import {
  asZephyrClient,
  createMockZephyrClient,
  fakeExtra,
  type MockZephyrClient,
} from "../../common/test-helpers.ts";
import { GetTestExecution } from "./get-test-execution.ts";

const responseMock = {
  id: 1,
  key: "SA-E10",
  project: {
    id: 10_005,
    self: "https://api.example.com/projects/10005",
  },
  testCase: {
    id: 10_002,
    self: "https://api.example.com/testcases/PROJ-T1/versions/1",
  },
  environment: {
    id: 10_005,
    self: "https://example.com/rest/api/v2/environment/10005",
  },
  jiraProjectVersion: {
    id: 10_000,
    self: "https://jira.example.com.atlassian.net/rest/api/2/version/10000",
  },
  testExecutionStatus: {
    id: 10_000,
    self: "https://api.example.com/statuses/10000",
  },
  actualEndDate: "2018-05-20T13:15:13Z",
  estimatedTime: 138_000,
  executionTime: 120_000,
  // biome-ignore lint/security/noSecrets: entropy false positive in test fixture data, not a secret
  executedById: "5b10a2844c20165700ede21g",
  // biome-ignore lint/security/noSecrets: entropy false positive in test fixture data, not a secret
  assignedToId: "5b10a2844c20165700ede21g",
  comment: "Test failed user could not login",
  automated: true,
  testCycle: {
    id: 10_010,
    self: "https://api.example.com/testcycles/10010",
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
    self: "http://example.com",
    issues: [
      {
        issueId: 10_100,
        self: "http://example.com",
        id: 1,
        target: "https://jira.example.com.atlassian.net/rest/api/2/issue/10000",
        type: "COVERAGE",
      },
    ],
  },
};

describe("GetTestExecution", () => {
  let mockClient: MockZephyrClient;
  let instance: GetTestExecution;

  beforeEach(() => {
    mockClient = createMockZephyrClient();
    instance = new GetTestExecution(asZephyrClient(mockClient));
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Execution");
    expect(instance.specification.summary).toBe(
      "Get details of test execution specified by id or key in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(GetTestExecutionParams);
    expect(instance.specification.outputSchema).toBe(GetTestExecutionResponse);
  });

  it("should call apiClient.get with string testExecutionIdOrKey and return formatted content", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { testExecutionIdOrKey: "SA-E10" };
    const result = await instance.handle(args, fakeExtra);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testexecutions/SA-E10",
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should call apiClient.get with numeric string testExecutionIdOrKey and return formatted content", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { testExecutionIdOrKey: "1" }; // Pass as string
    const result = await instance.handle(args, fakeExtra);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testexecutions/1",
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));
    await expect(
      instance.handle({ testExecutionIdOrKey: "1" }, fakeExtra),
    ).rejects.toThrow("API error");
  });

  it("should throw validation error if testExecutionIdOrKey is missing", async () => {
    await expect(instance.handle({}, fakeExtra)).rejects.toThrow();
  });
});
