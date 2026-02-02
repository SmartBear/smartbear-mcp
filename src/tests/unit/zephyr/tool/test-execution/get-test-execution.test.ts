import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getTestExecutionParams,
  getTestExecution200Response as getTestExecutionResponse,
} from "../../../../../zephyr/common/rest-api-schemas.js";
import { GetTestExecution } from "../../../../../zephyr/tool/test-execution/get-test-execution.js";

const responseMock = {
  id: 1,
  key: "SA-E10",
  project: {
    id: 10005,
    self: "https://api.example.com/projects/10005",
  },
  testCase: {
    id: 10002,
    self: "https://api.example.com/testcases/PROJ-T1/versions/1",
  },
  environment: {
    id: 10005,
    self: "https://example.com/rest/api/v2/environment/10005",
  },
  jiraProjectVersion: {
    id: 10000,
    self: "https://jira.example.com.atlassian.net/rest/api/2/version/10000",
  },
  testExecutionStatus: {
    id: 10000,
    self: "https://api.example.com/statuses/10000",
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
        issueId: 10100,
        self: "http://example.com",
        id: 1,
        target: "https://jira.example.com.atlassian.net/rest/api/2/issue/10000",
        type: "COVERAGE",
      },
    ],
  },
};

describe("GetTestExecution", () => {
  let mockClient: any;
  let instance: GetTestExecution;

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        get: vi.fn(),
      }),
    };
    instance = new GetTestExecution(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Execution");
    expect(instance.specification.summary).toBe(
      "Get details of test execution specified by id or key in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(getTestExecutionParams);
    expect(instance.specification.outputSchema).toBe(getTestExecutionResponse);
  });

  it("should call apiClient.get with string testExecutionIdOrKey and return formatted content", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { testExecutionIdOrKey: "SA-E10" };
    const result = await instance.handle(args, {});
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testexecutions/SA-E10",
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should call apiClient.get with numeric string testExecutionIdOrKey and return formatted content", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { testExecutionIdOrKey: "1" }; // Pass as string
    const result = await instance.handle(args, {});
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testexecutions/1",
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));
    await expect(
      instance.handle({ testExecutionIdOrKey: "1" }, {}),
    ).rejects.toThrow("API error");
  });

  it("should throw validation error if testExecutionIdOrKey is missing", async () => {
    await expect(instance.handle({}, {})).rejects.toThrow();
  });
});
