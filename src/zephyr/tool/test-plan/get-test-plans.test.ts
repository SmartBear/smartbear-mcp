import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  ListTestPlansCursorPaginatedQueryParams,
  ListTestPlansCursorPaginated200Response as ListTestPlansCursorPaginatedResponse,
} from "../../common/rest-api-schemas";
import { GetTestPlans } from "./get-test-plans";

describe("GetTestPlans", () => {
  let mockClient: any;
  let instance: GetTestPlans;

  beforeEach(() => {
    mockClient = {
      getApiClient: vi.fn().mockReturnValue({
        get: vi.fn(),
      }),
    };
    instance = new GetTestPlans(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Plans");
    expect(instance.specification.summary).toBe(
      "Get details of Test Plans in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(
      ListTestPlansCursorPaginatedQueryParams,
    );
    expect(instance.specification.outputSchema).toBe(
      ListTestPlansCursorPaginatedResponse,
    );
  });

  it("should call apiClient.get with correct params and return formatted content", async () => {
    const responseMock = {
      next: null,
      nextStartAtId: null,
      limit: 10,
      values: [
        {
          id: 1,
          key: "PROJ-P1",
          name: "Test Plan 1",
          objective: "Validate release readiness",
          project: {
            id: 10000,
            self: "https://api.example.com/projects/10000",
          },
          status: {
            id: 10001,
            self: "https://api.example.com/statuses/10001",
          },
          folder: {
            id: 10002,
            self: "https://api.example.com/folders/10002",
          },
          owner: {
            accountId: "5b10a2844c20165700ede21g",
            self: "https://jira.example.com/rest/api/2/user?accountId=5b10a2844c20165700ede21g",
          },
          labels: ["Regression", "Release"],
          customFields: {
            "Build Number": 20,
            "Release Date": "2020-01-01",
          },
          links: {
            webLinks: [
              {
                description: "A link to atlassian.com",
                url: "https://atlassian.com",
                self: "http://example.com",
                id: 1,
                type: "RELATED",
              },
            ],
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
            testCycles: [
              {
                id: 1,
                self: "https://api.example.com/testcycles/1",
                testCycleId: 5,
                type: "RELATED",
                target: "https://api.example.com/testcycles/5",
              },
            ],
          },
        },
      ],
    };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const args = { limit: 10, startAtId: 0 };
    const result = await instance.handle(args, {} as any);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testplans/nextgen",
      args,
    );
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle empty args and call apiClient.get with default param values", async () => {
    const responseMock = {
      next: null,
      nextStartAtId: null,
      limit: 10,
      values: [
        {
          id: 1,
          key: "PROJ-P1",
          name: "Test Plan 1",
          project: {
            id: 10000,
          },
          status: {
            id: 10001,
          },
        },
      ],
    };
    mockClient.getApiClient().get.mockResolvedValueOnce(responseMock);
    const result = await instance.handle({}, {} as any);
    expect(mockClient.getApiClient().get).toHaveBeenCalledWith(
      "/testplans/nextgen",
      { limit: 10, startAtId: 0 },
    );
    expect(result.structuredContent).toBe(responseMock);
  });
});
