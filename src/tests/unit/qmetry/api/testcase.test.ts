import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  fetchTestCaseDetails,
  fetchTestCaseExecutions,
  fetchTestCaseSteps,
  fetchTestCases,
  fetchTestCasesLinkedToRequirement,
  fetchTestCaseVersionDetails,
} from "../../../../qmetry/client/testcase.js";
import { DEFAULT_FETCH_TESTCASES_PAYLOAD } from "../../../../qmetry/types/testcase.js";

const token = "fake-token";
const baseUrl = "https://qmetry.example";
const projectKey = "TEST_PROJECT";

describe("testcase API clients", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const mockOk = (data: any) => ({
    ok: true,
    json: async () => data,
  });

  const mockFail = (status = 400, errorText = "Bad Request") => ({
    ok: false,
    status,
    text: async () => errorText,
    headers: new Map([["content-type", "text/plain"]]),
  });

  it("fetchTestCases should POST with correct URL and headers", async () => {
    const payload = {
      ...DEFAULT_FETCH_TESTCASES_PAYLOAD,
      viewId: 1,
      folderPath: "/",
    };
    const mockResponse = {
      data: [
        { id: 1, name: "Test1" },
        { id: 2, name: "Test2" },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

    const result = await fetchTestCases(token, baseUrl, projectKey, payload);

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/testcases/list/viewColumns`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          apikey: token,
          project: projectKey,
          "User-Agent": expect.stringContaining("SmartBear MCP Server"),
        }),
        body: JSON.stringify(payload),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("fetchTestCases should throw on missing viewId", async () => {
    const invalidPayload = {
      ...DEFAULT_FETCH_TESTCASES_PAYLOAD,
      folderPath: "/",
    };
    const payload = invalidPayload as any;

    await expect(
      fetchTestCases(token, baseUrl, projectKey, payload),
    ).rejects.toThrow(/Missing or invalid required parameter: 'viewId'/);
  });

  it("fetchTestCases should throw on missing folderPath", async () => {
    const invalidPayload = { ...DEFAULT_FETCH_TESTCASES_PAYLOAD, viewId: 1 };
    const payload = invalidPayload as any;

    await expect(
      fetchTestCases(token, baseUrl, projectKey, payload),
    ).rejects.toThrow(/Missing or invalid required parameter: 'folderPath'/);
  });

  it("fetchTestCaseDetails should POST with correct URL and include tcID", async () => {
    const payload = { tcID: 123 };
    const mockResponse = { id: "TC-123", name: "Login Test Case" };

    global.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

    const result = await fetchTestCaseDetails(
      token,
      baseUrl,
      projectKey,
      payload,
    );

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/testcases/getVersionDetail`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          apikey: token,
          project: projectKey,
        }),
        body: expect.stringContaining('"tcID":123'),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("fetchTestCaseVersionDetails should POST with correct URL and include id/version", async () => {
    const payload = { id: 123, version: 2 };
    const mockResponse = { id: 123, version: 2, name: "Version Test" };

    global.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

    const result = await fetchTestCaseVersionDetails(
      token,
      baseUrl,
      projectKey,
      payload,
    );

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/testcases/list`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          apikey: token,
          project: projectKey,
        }),
        body: expect.stringContaining('"id":123'),
      }),
    );
    expect(result).toEqual(mockResponse);
  });

  it("fetchTestCaseSteps should POST with correct URL and include steps data", async () => {
    const payload = { id: 123, version: 1 };
    const mockResponse = { steps: [{ step: "Login" }, { step: "Navigate" }] };

    global.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

    const result = await fetchTestCaseSteps(
      token,
      baseUrl,
      projectKey,
      payload,
    );

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/testcases/steps/list`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          apikey: token,
          project: projectKey,
        }),
      }),
    );

    expect(result).toHaveProperty("steps");
    expect((result as any).steps).toHaveLength(2);
  });

  it("should throw on bad response with correct error format", async () => {
    global.fetch = vi.fn().mockResolvedValue(mockFail(400, "Invalid request"));

    await expect(
      fetchTestCases(token, baseUrl, projectKey, {
        ...DEFAULT_FETCH_TESTCASES_PAYLOAD,
        viewId: 1,
        folderPath: "/",
        start: 0,
      }),
    ).rejects.toThrow(/QMetry API request failed \(400\): Invalid request/);
  });

  it("should handle JSON error responses", async () => {
    const errorResponse = { error: "Validation failed", code: 400 };
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      headers: new Map([["content-type", "application/json"]]),
      json: async () => errorResponse,
    });

    await expect(
      fetchTestCases(token, baseUrl, projectKey, {
        ...DEFAULT_FETCH_TESTCASES_PAYLOAD,
        viewId: 1,
        folderPath: "/",
      }),
    ).rejects.toThrow(/QMetry API request failed \(400\):/);
  });

  describe("fetchTestCasesLinkedToRequirement", () => {
    it("should POST with correct URL and headers for linked test cases", async () => {
      const mockResponse = {
        data: [
          {
            entityKey: "MAC-TC-1692",
            summary: "Table Testing functionality",
            testingTypeAlias: "Automated",
          },
          {
            entityKey: "MAC-TC-1693",
            summary: "Login validation",
            testingTypeAlias: "Manual",
          },
        ],
        total: 2,
      };

      global.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const payload = { rqID: 2499315, getLinked: true };
      const result = await fetchTestCasesLinkedToRequirement(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/testcases/list/forRQ`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            apikey: token,
            project: projectKey,
          }),
          body: expect.stringContaining("2499315"),
        }),
      );

      expect(result).toHaveProperty("data");
      expect((result as any).data).toHaveLength(2);
      expect((result as any).total).toBe(2);
    });

    it("should throw error when rqID is missing", async () => {
      const payload = { getLinked: true };

      await expect(
        fetchTestCasesLinkedToRequirement(
          token,
          baseUrl,
          projectKey,
          payload as any,
        ),
      ).rejects.toThrow(
        "[fetchTestCasesLinkedToRequirement] Missing or invalid required parameter: 'rqID'.",
      );
    });

    it("should throw error when rqID is not a number", async () => {
      const payload = { rqID: "invalid-id", getLinked: true };

      await expect(
        fetchTestCasesLinkedToRequirement(
          token,
          baseUrl,
          projectKey,
          payload as any,
        ),
      ).rejects.toThrow(
        "[fetchTestCasesLinkedToRequirement] Missing or invalid required parameter: 'rqID'.",
      );
    });

    it("should handle gap analysis with getLinked: false", async () => {
      const mockResponse = {
        data: [
          {
            entityKey: "MAC-TC-9999",
            summary: "Unlinked test case",
            testingTypeAlias: "Manual",
          },
        ],
        total: 1,
      };

      global.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const payload = { rqID: 2499315, getLinked: false };
      const result = await fetchTestCasesLinkedToRequirement(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/testcases/list/forRQ`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"getLinked":false'),
        }),
      );

      expect(result).toHaveProperty("data");
      expect((result as any).data).toHaveLength(1);
    });

    it("should handle API errors gracefully", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(mockFail(404, "Requirement not found"));

      const payload = { rqID: 99999, getLinked: true };

      await expect(
        fetchTestCasesLinkedToRequirement(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(
        /QMetry API Invalid URL Error: The API endpoint appears to be incorrect/,
      );
    });
  });

  describe("fetchTestCaseExecutions", () => {
    it("should POST with correct URL and required parameters", async () => {
      const payload = { tcid: 1223922 };
      const mockResponse = {
        data: [
          {
            id: 1,
            executionStatus: "PASS",
            testSuiteName: "Regression Suite",
            platformID: 12345,
            executedBy: "john.doe",
            executedDate: "2024-10-15T10:30:00Z",
            executedVersion: 1,
          },
          {
            id: 2,
            executionStatus: "FAIL",
            testSuiteName: "Smoke Suite",
            platformID: 67890,
            executedBy: "jane.smith",
            executedDate: "2024-10-14T14:20:00Z",
            executedVersion: 2,
          },
        ],
        totalCount: 2,
      };

      global.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const result = await fetchTestCaseExecutions(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/testcases/execution`,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
            apikey: token,
            project: projectKey,
          }),
          body: expect.stringContaining('"tcid":1223922'),
        }),
      );

      expect(result).toHaveProperty("data");
      expect((result as any).data).toHaveLength(2);
      expect((result as any).data[0]).toHaveProperty("executionStatus", "PASS");
      expect((result as any).data[1]).toHaveProperty("executionStatus", "FAIL");
    });

    it("should include optional parameters in the request", async () => {
      const payload = {
        tcid: 1223922,
        tcversion: 3,
        filter: '[{"value":["PASS"],"type":"list","field":"executionStatus"}]',
        limit: 5,
        page: 2,
        scope: "release",
      };
      const mockResponse = {
        data: [
          {
            id: 3,
            executionStatus: "PASS",
            testSuiteName: "API Test Suite",
            platformID: 11111,
            executedBy: "automation.user",
            executedDate: "2024-10-15T16:45:00Z",
            executedVersion: 3,
          },
        ],
        totalCount: 1,
      };

      global.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const result = await fetchTestCaseExecutions(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/testcases/execution`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"tcversion":3'),
        }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/testcases/execution`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"scope":"release"'),
        }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/testcases/execution`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"limit":5'),
        }),
      );

      expect(result).toHaveProperty("data");
      expect((result as any).data).toHaveLength(1);
      expect((result as any).data[0]).toHaveProperty("executionStatus", "PASS");
    });

    it("should handle API errors gracefully", async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValue(mockFail(404, "Test case not found"));

      const payload = { tcid: 99999 };

      await expect(
        fetchTestCaseExecutions(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(
        /QMetry API Invalid URL Error: The API endpoint appears to be incorrect/,
      );
    });

    it("should throw error when tcid is missing", async () => {
      const payload = {} as any; // Missing required tcid

      await expect(
        fetchTestCaseExecutions(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(/Missing or invalid required parameter: 'tcid'/);
    });
  });
});
