import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchTestCases,
  fetchTestCaseDetails,
  fetchTestCaseVersionDetails,
  fetchTestCaseSteps,
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
});
