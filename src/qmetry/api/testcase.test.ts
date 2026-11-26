import { beforeEach, describe, expect, it, vi } from "vitest";
import { QMETRY_HANDLER_MAP } from "../client/handlers.js";
import {
  createTestCases,
  fetchTestCaseDetails,
  fetchTestCaseExecutions,
  fetchTestCaseSteps,
  fetchTestCases,
  fetchTestCasesLinkedToRequirement,
  fetchTestCaseVersionDetails,
  linkReleaseCycleWithTestCase,
  linkTestcaseToIssues,
} from "../client/testcase.js";
import { QMetryToolsHandlers } from "../config/constants.js";
import { LinkReleaseCycleWithTestCaseArgsSchema } from "../types/common.js";
import { DEFAULT_FETCH_TESTCASES_PAYLOAD } from "../types/testcase.js";

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
    text: async () => JSON.stringify(data),
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

  it("fetchTestCases should default folderPath to root and send no viewId", async () => {
    global.fetch = vi.fn().mockResolvedValue(mockOk({ data: [] }));

    await fetchTestCases(token, baseUrl, projectKey, {} as any);

    const body = JSON.parse((global.fetch as any).mock.calls[0][1].body);
    expect(body.folderPath).toBe("");
    expect(body).not.toHaveProperty("viewId");
  });

  it("fetchTestCases should throw on invalid folderPath", async () => {
    const payload = {
      ...DEFAULT_FETCH_TESTCASES_PAYLOAD,
      folderPath: 5,
    } as any;

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
        folderPath: "/",
        start: 0,
      }),
    ).rejects.toThrow(/QMetry API error 400: Invalid request/);
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
        folderPath: "/",
      }),
    ).rejects.toThrow(/QMetry API error 400/);
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
      ).rejects.toThrow(/QMetry API error 404/);
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
      ).rejects.toThrow(/QMetry API error 404/);
    });

    it("should throw error when tcid is missing", async () => {
      const payload = {} as any; // Missing required tcid

      await expect(
        fetchTestCaseExecutions(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(/Missing or invalid required parameter: 'tcid'/);
    });
  });

  describe("linkTestcaseToIssues", () => {
    it("should POST to the correct endpoint with required fields", async () => {
      const mockResponse = { success: true };
      global.fetch = vi.fn().mockResolvedValue(mockOk(mockResponse));

      const payload = { tcID: "8d7b-TC-63", dfIDs: [2039, 2038, 2037, 1528] };
      const result = await linkTestcaseToIssues(
        token,
        baseUrl,
        projectKey,
        payload,
      );

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/testcases/link/issues`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"tcID":"8d7b-TC-63"'),
        }),
      );
      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/testcases/link/issues`,
        expect.objectContaining({
          body: expect.stringContaining('"dfIDs":[2039,2038,2037,1528]'),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should throw when tcID is missing", async () => {
      const payload = { dfIDs: [2039] } as any;
      await expect(
        linkTestcaseToIssues(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(/Missing or invalid required parameter: 'tcID'/);
    });

    it("should throw when dfIDs is empty", async () => {
      const payload = { tcID: "8d7b-TC-63", dfIDs: [] };
      await expect(
        linkTestcaseToIssues(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(/Missing or invalid required parameter: 'dfIDs'/);
    });
  });

  describe("createTestCases", () => {
    const mockResponse = { id: "TC-1", name: "Login Test Case" };

    it("should POST without steps when skipSteps is true", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
      });

      const payload = {
        tcFolderID: "102653",
        name: "Login Test Case",
        skipSteps: true,
      } as any;

      const result = await createTestCases(token, baseUrl, projectKey, payload);

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/testcases`,
        expect.objectContaining({
          method: "POST",
          body: expect.not.stringContaining('"steps"'),
        }),
      );
      expect(result).toEqual(mockResponse);
    });

    it("should throw on missing steps when skipSteps is not set", async () => {
      const payload = {
        tcFolderID: "102653",
        name: "Login Test Case",
      } as any;

      await expect(
        createTestCases(token, baseUrl, projectKey, payload),
      ).rejects.toThrow(/Missing or invalid required parameter: 'steps'/);
    });

    it("should POST with steps when provided", async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
        text: async () => JSON.stringify(mockResponse),
      });

      const payload = {
        tcFolderID: "102653",
        name: "Login Test Case",
        steps: [{ orderId: 1, description: "Navigate to login page" }],
      } as any;

      const result = await createTestCases(token, baseUrl, projectKey, payload);

      expect(global.fetch).toHaveBeenCalledWith(
        `${baseUrl}/rest/testcases`,
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining('"steps"'),
        }),
      );
      expect(result).toEqual(mockResponse);
    });
  });
});

describe("linkReleaseCycleWithTestCase", () => {
  const validPayload = {
    destinationProjectId: 46893,
    releaseCycleMapping: [{ releaseId: 92340, cycleIds: [131142] }],
    testCases: [{ tcID: 4611391, tcVersionID: 4705299 }],
  };

  const mockResponse = (body: unknown, ok = true, status = 200) => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok,
      status,
      statusText: ok ? "OK" : "Bad Request",
      json: async () => body,
      text: async () => JSON.stringify(body),
    });
  };

  const sentBody = () =>
    JSON.parse((globalThis.fetch as any).mock.calls[0][1].body);

  const expectRejected = async (payload: unknown, message: string) => {
    globalThis.fetch = vi.fn();
    await expect(
      linkReleaseCycleWithTestCase(token, baseUrl, projectKey, payload as any),
    ).rejects.toThrow(message);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  };

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("maps linkReleaseCycleWithTestCase to its handler", () => {
    expect(
      QMETRY_HANDLER_MAP[QMetryToolsHandlers.LINK_RELEASE_CYCLE_WITH_TESTCASE],
    ).toBe(linkReleaseCycleWithTestCase);
  });

  it("POSTs the new scope/add body for one release and one test case", async () => {
    const response = {
      success: true,
      code: "CO.REL_CYCLE_LINK_SUCCESS",
      message: "Release(s) and Cycle(s) associated successfully.",
      data: [{}],
    };
    mockResponse(response);

    const result = await linkReleaseCycleWithTestCase(
      token,
      baseUrl,
      projectKey,
      validPayload,
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/testcases/scope/add`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: token,
          project: projectKey,
          "Content-Type": "application/json",
        }),
      }),
    );
    expect(sentBody()).toEqual({
      sourceScope: "project",
      entityType: "TC",
      releaseCycleMapping: [{ release: 92340, cycle: [131142], version: 1 }],
      destinationProjectId: 46893,
      entityData: [{ entityId: 4611391, version: 4705299 }],
    });
    expect(result).toEqual(response);
  });

  it("maps several releases and several test cases in order", async () => {
    mockResponse({ success: true });

    await linkReleaseCycleWithTestCase(token, baseUrl, projectKey, {
      ...validPayload,
      releaseCycleMapping: [
        { releaseId: 92340, cycleIds: [131142] },
        { releaseId: 92341, cycleIds: [131143, 133715] },
      ],
      testCases: [
        { tcID: 4611391, tcVersionID: 4705299 },
        { tcID: 4611393, tcVersionID: 4705304 },
      ],
    });

    const body = sentBody();
    expect(body.releaseCycleMapping).toEqual([
      { release: 92340, cycle: [131142], version: 1 },
      { release: 92341, cycle: [131143, 133715], version: 1 },
    ]);
    expect(body.entityData).toEqual([
      { entityId: 4611391, version: 4705299 },
      { entityId: 4611393, version: 4705304 },
    ]);
  });

  it("does not send tool-level or extra fields", async () => {
    mockResponse({ success: true });

    await linkReleaseCycleWithTestCase(token, baseUrl, projectKey, {
      ...validPayload,
      projectKey: "SHOULD_NOT_BE_SENT",
    } as any);

    const body = sentBody();
    expect(body).not.toHaveProperty("projectKey");
    expect(body).not.toHaveProperty("testCases");
    expect(body.releaseCycleMapping[0]).not.toHaveProperty("releaseId");
  });

  it.each([
    [
      "all pairs already linked",
      {
        duplicate_rel_cycle: [
          { release: "Default Release", cycle: "Default Cycle" },
        ],
        success: true,
        code: "TC.REL_CYC_EXIST",
        message: "The selected Release(s)/Cycle(s) is already linked.",
      },
    ],
    [
      "some pairs already linked",
      {
        duplicate_rel_cycle: [
          { release: "Releases :- A", cycle: "ABC" },
          { release: "Releases :- A", cycle: "AC" },
        ],
        success: true,
        code: "CO.REL_CYCLE_LINK_SUCCESS",
        message: "Release(s) and Cycle(s) associated successfully.",
      },
    ],
  ])("returns the %s response as-is", async (_label, response) => {
    mockResponse(response);

    await expect(
      linkReleaseCycleWithTestCase(token, baseUrl, projectKey, validPayload),
    ).resolves.toEqual(response);
  });

  it.each([
    ["missing", undefined],
    ["a string", "abc"],
    ["NaN", Number.NaN],
  ])("throws when destinationProjectId is %s", async (_label, value) => {
    await expectRejected(
      { ...validPayload, destinationProjectId: value },
      "[linkReleaseCycleWithTestCase] Missing or invalid required parameter: 'destinationProjectId'",
    );
  });

  it.each([
    ["missing", undefined],
    ["empty", []],
  ])("throws when releaseCycleMapping is %s", async (_label, mapping) => {
    await expectRejected(
      { ...validPayload, releaseCycleMapping: mapping },
      "Missing or invalid required parameter: 'releaseCycleMapping'",
    );
  });

  it("throws when a releaseId is invalid", async () => {
    await expectRejected(
      {
        ...validPayload,
        releaseCycleMapping: [
          { releaseId: 92340, cycleIds: [131142] },
          { releaseId: "abc", cycleIds: [131143] },
        ],
      },
      "'releaseCycleMapping[1].releaseId'",
    );
  });

  it.each([
    ["missing", undefined],
    ["empty", []],
    ["non-numeric", [131142, "abc"]],
  ])("throws when a release's cycleIds is %s", async (_label, cycleIds) => {
    await expectRejected(
      {
        ...validPayload,
        releaseCycleMapping: [{ releaseId: 92340, cycleIds }],
      },
      "'releaseCycleMapping[0].cycleIds'",
    );
  });

  it("throws when a release is repeated", async () => {
    await expectRejected(
      {
        ...validPayload,
        releaseCycleMapping: [
          { releaseId: 92340, cycleIds: [131142] },
          { releaseId: 92340, cycleIds: [131145] },
        ],
      },
      "Release 92340 appears more than once",
    );
  });

  it.each([
    ["missing", undefined],
    ["empty", []],
  ])("throws when testCases is %s", async (_label, testCases) => {
    await expectRejected(
      { ...validPayload, testCases },
      "Missing or invalid required parameter: 'testCases'",
    );
  });

  it.each([
    "tcID",
    "tcVersionID",
  ])("throws when a test case's %s is missing", async (field) => {
    const tc: any = { tcID: 4611393, tcVersionID: 4705304 };
    delete tc[field];
    await expectRejected(
      {
        ...validPayload,
        testCases: [{ tcID: 4611391, tcVersionID: 4705299 }, tc],
      },
      `'testCases[1].${field}'`,
    );
  });

  it("throws when a test case is repeated", async () => {
    await expectRejected(
      {
        ...validPayload,
        testCases: [
          { tcID: 4611391, tcVersionID: 4705299 },
          { tcID: 4611391, tcVersionID: 4705300 },
        ],
      },
      "Test case 4611391 appears more than once in 'testCases'",
    );
  });

  it.each([
    [
      "invalid cycle (build)",
      {
        success: false,
        code: "CO.INVALID_BUILD_ID",
        message: "Invalid Build ID.",
      },
      /Invalid Build ID/,
    ],
    [
      "invalid release",
      { success: false, code: "CO.INVALID_RELEASE_ID" },
      /CO.INVALID_RELEASE_ID/,
    ],
    [
      "unknown test case",
      { success: false, code: "RQ.ENTITY_NOT_FOUND_ERROR" },
      /RQ.ENTITY_NOT_FOUND_ERROR/,
    ],
  ])("surfaces QMetry's %s error", async (_label, errorBody, expected) => {
    mockResponse(errorBody, false, 400);

    await expect(
      linkReleaseCycleWithTestCase(token, baseUrl, projectKey, validPayload),
    ).rejects.toThrow(expected);
  });
});

describe("LinkReleaseCycleWithTestCaseArgsSchema", () => {
  const base = {
    destinationProjectId: 46893,
    releaseCycleMapping: [{ releaseId: 92340, cycleIds: [131142] }],
    testCases: [{ tcID: 4611391, tcVersionID: 4705299 }],
  };

  it("rejects a call without destinationProjectId", () => {
    const { destinationProjectId: _omit, ...rest } = base;
    const result = LinkReleaseCycleWithTestCaseArgsSchema.safeParse({
      projectKey: "MAC",
      ...rest,
    });
    expect(result.success).toBe(false);
  });

  it("coerces string IDs to numbers", () => {
    const parsed = LinkReleaseCycleWithTestCaseArgsSchema.parse({
      projectKey: "MAC",
      destinationProjectId: "46893",
      releaseCycleMapping: [{ releaseId: "92340", cycleIds: ["131142"] }],
      testCases: [{ tcID: "4611391", tcVersionID: "4705299" }],
    });
    expect(parsed).toMatchObject(base);
  });

  it.each([
    ["empty releaseCycleMapping", { releaseCycleMapping: [] }],
    [
      "a release with no cycles",
      { releaseCycleMapping: [{ releaseId: 92340, cycleIds: [] }] },
    ],
    ["empty testCases", { testCases: [] }],
    ["a test case without tcVersionID", { testCases: [{ tcID: 1 }] }],
  ])("rejects %s", (_label, override) => {
    const result = LinkReleaseCycleWithTestCaseArgsSchema.safeParse({
      projectKey: "MAC",
      ...base,
      ...override,
    });
    expect(result.success).toBe(false);
  });
});
