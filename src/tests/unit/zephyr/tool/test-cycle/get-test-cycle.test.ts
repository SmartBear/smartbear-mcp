import { describe, expect, it, vi } from "vitest";
import {
  getTestCycleParams,
  getTestCycleResponse,
} from "../../../../../zephyr/common/rest-api-schemas.js";
import { GetTestCycle } from "../../../../../zephyr/tool/test-cycle/get-test-cycle.js";

describe("GetTestCycle", () => {
  const mockApiClient = { get: vi.fn() };
  const instance = new GetTestCycle(mockApiClient as any);

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Cycle");
    expect(instance.specification.summary).toBe(
      "Get details of test cycle specified by id or key in Zephyr",
    );
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.inputSchema).toBe(getTestCycleParams);
    expect(instance.specification.outputSchema).toBe(getTestCycleResponse);
  });

  it("should call apiClient.get with correct params and return formatted content", async () => {
    const responseMock = {
      id: 260,
      key: "TEST-R1",
      name: "Test mcp",
      project: {
        id: 39,
        self: "http://localhost:5051/v2/projects/39",
      },
      jiraProjectVersion: {
        id: 10000,
        self: "https://test.atlassian.net/rest/api/2/version/10000",
      },
      status: {
        id: 663,
        self: "http://localhost:5051/v2/statuses/663",
      },
      folder: {
        id: 45,
        self: "http://localhost:5051/v2/folders/45",
      },
      description: "Description of test cycle for mcp test",
      plannedStartDate: "2025-10-24T09:44:29Z",
      plannedEndDate: "2025-10-24T09:44:29Z",
      owner: {
        self: "https://test.atlassian.net/rest/api/2/user?accountId=712020%3Ad55539fb-741c-4c02-8ceb-c89cd4450cb3",
        accountId: "712020:d55539fb-741c-4c02-8ceb-c89cd4450cb3",
      },
      customFields: {
        "Test custom field ": true,
        "Test required custom field": true,
      },
      links: {
        self: "http://localhost:5051/v2/testcycles/260/links",
        issues: [
          {
            self: "http://localhost:5051/v2/links/531",
            issueId: 10200,
            id: 531,
            target: "https://test.atlassian.net/rest/api/2/issue/10200",
            type: "RELATED",
          },
        ],
        webLinks: [
          {
            self: "http://localhost:5051/v2/links/529",
            description: "Test link for mcp",
            url: "https://www.google.com/",
            id: 529,
            type: "RELATED",
          },
        ],
        testPlans: [
          {
            id: 530,
            self: "http://localhost:5051/v2/links/530",
            testPlanId: 7,
            type: "RELATED",
            target: "https://test.atlassian.net/testplans/7",
          },
        ],
      },
    };
    mockApiClient.get.mockResolvedValueOnce(responseMock);
    const args = { testCycleIdOrKey: "TEST-R1" };
    const result = await instance.handle(args, {});
    expect(mockApiClient.get).toHaveBeenCalledWith("/testcycles/TEST-R1");
    expect(result.structuredContent).toBe(responseMock);
  });

  it("should handle apiClient.get throwing error", async () => {
    mockApiClient.get.mockRejectedValueOnce(new Error("API error"));
    await expect(
      instance.handle({ testCycleIdOrKey: "1" }, {}),
    ).rejects.toThrow("API error");
  });

  it("should handle apiClient.get returning unexpected data", async () => {
    mockApiClient.get.mockResolvedValueOnce(undefined);
    const result = await instance.handle({ testCycleIdOrKey: "1" }, {});
    expect(result.structuredContent).toBeUndefined();
  });

  it("should throw validation error if testCycleKey is missing", async () => {
    await expect(instance.handle({}, {})).rejects.toThrow();
  });
});


