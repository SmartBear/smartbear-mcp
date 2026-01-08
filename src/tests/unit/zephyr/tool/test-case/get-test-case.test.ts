import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getTestCaseParams,
  getTestCaseResponse,
} from "../../../../../zephyr/common/rest-api-schemas";
import { GetTestCase } from "../../../../../zephyr/tool/test-case/get-test-case";

describe("GetTestCase", () => {
  let mockClient: any;
  let instance: GetTestCase;

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        get: vi.fn(),
      }),
    };
    instance = new GetTestCase(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Case");
    expect(instance.specification.summary).toBe(
      "Get details of test case specified by key in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(getTestCaseParams);
    expect(instance.specification.outputSchema).toBe(getTestCaseResponse);
  });

  it("should call apiClient.get with correct params and return formatted content", async () => {
    const responseMock = {
      id: 1,
      key: "SA-T10",
      name: "Check axial pump",
      project: {
        id: 10005,
        self: "https://api.example.com/projects/10005",
      },
      createdOn: "2018-05-15T13:15:13Z",
      objective: "To ensure the axial pump can be enabled",
      precondition: "Latest version of the axial pump available",
      estimatedTime: 138000,
      labels: ["Regression", "Performance", "Automated"],
      component: {
        id: 10001,
        self: "https://<jira-instance>.atlassian.net/rest/api/2/component/10001",
      },
      priority: {
        id: 10002,
        self: "https://<api-base-url>/priorities/10002",
      },
      status: {
        id: 10000,
        self: "https://<api-base-url>/statuses/10000",
      },
      folder: {
        id: 100006,
        self: "https://<api-base-url>/folders/10006",
      },
      owner: {
        self: "https://<jira-instance>.atlassian.net/rest/api/2/user?accountId=5b10a2844c20165700ede21g",
        accountId: "5b10a2844c20165700ede21g",
      },
      testScript: {
        self: "https://<api-base-url>/testCases/PROJ-T1/testscript",
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
        self: "https://api.zephyrscale.smartbear.com/v2/testcases/14/links",
        issues: [
          {
            self: "https://api.zephyrscale.smartbear.com/v2/testcases/14/links",
            issueId: 10100,
            id: 1,
            target:
              "https://<jira-instance>.atlassian.net/rest/api/2/issue/10000",
            type: "COVERAGE",
          },
        ],
        webLinks: [
          {
            self: "https://api.zephyrscale.smartbear.com/v2/testcases/14/links",
            description: "A link to atlassian.com",
            url: "https://atlassian.com",
            id: 1,
            type: "COVERAGE",
          },
        ],
      },
    };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { testCaseKey: "SA-T10" };
    const result = await instance.handle(args, {});
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testcases/SA-T10",
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockClient.getApiClient().get.mockRejectedValueOnce(new Error("API error"));
    await expect(
      instance.handle({ testCaseKey: "SA-T10" }, {}),
    ).rejects.toThrow("API error");
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockClient.getApiClient().get.mockResolvedValueOnce(undefined);
    const result = await instance.handle({ testCaseKey: "SA-T10" }, {});
    expect(result.structuredContent).toBeUndefined();
  });

  it("should throw validation error if testCaseKey is missing", async () => {
    await expect(instance.handle({}, {})).rejects.toThrow();
  });
});
