import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { FunctionalTestingAPI } from "../client/functional-testing-api";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const testsMock = [
  { id: "test-1", name: "Login Test" },
  { id: "test-2", name: "Checkout Test" },
];

const UNREACHABLE_MESSAGE =
  "Swagger Functional Testing service is currently unreachable. Retry after a moment.";

const AUTH_FAILED_MESSAGE =
  "Authentication failed. Verify your API token is valid and has not expired.";

const suitesResponseMock = {
  suites: [
    {
      id: "suite-1",
      accountId: 42,
      name: "Smoke Suite",
      slug: "smoke-suite",
      created: 1719400000000,
      numTestInstances: 3,
    },
    {
      id: "suite-2",
      accountId: 42,
      name: "Regression Suite",
      slug: "regression-suite",
      created: 1719500000000,
      numTestInstances: 12,
    },
  ],
  stats: {
    executions: 15,
    passRate: 0.93,
    avgRuntimeSecs: 42,
    cumExecTimeSecs: 630,
  },
};

describe("FunctionalTestingAPI", () => {
  let api: FunctionalTestingAPI;

  beforeEach(() => {
    fetchMock.resetMocks();
    api = new FunctionalTestingAPI(
      () => "test-api-key",
      "SmartBear MCP Server/test",
    );
  });

  describe("listTests", () => {
    it("should call the correct endpoint with X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(testsMock));

      await api.listTests();

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/tests",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should return parsed JSON response", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(testsMock));

      const result = await api.listTests();

      expect(result).toEqual(testsMock);
    });

    it("should return empty array when no tests exist", async () => {
      fetchMock.mockResponseOnce(JSON.stringify([]));

      const result = await api.listTests();

      expect(result).toEqual([]);
    });

    it("should throw ToolError on HTTP error", async () => {
      fetchMock.mockResponseOnce("Internal Server Error", { status: 500 });

      await expect(api.listTests()).rejects.toThrow(
        "Failed to list Functional Testing tests",
      );
    });

    it("should map network errors to an unreachable message", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(api.listTests()).rejects.toThrow(UNREACHABLE_MESSAGE);
    });
  });

  describe("runTest", () => {
    const executionMock = { executionId: "42", status: "running" };

    it("should call the correct endpoint with POST method and X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      await api.runTest({ testId: "94" });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/tests/94/executions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should return parsed JSON response", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      const result = await api.runTest({ testId: "94" });

      expect(result).toEqual(executionMock);
    });

    it("should throw ToolError when testId is missing", async () => {
      await expect(api.runTest({ testId: "" })).rejects.toThrow(
        "testId argument is required",
      );
    });

    it("should throw ToolError on HTTP error", async () => {
      fetchMock.mockResponseOnce("Not Found", { status: 404 });

      await expect(api.runTest({ testId: "94" })).rejects.toThrow(
        "Failed to run test",
      );
    });

    it("should map network errors to an unreachable message", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(api.runTest({ testId: "94" })).rejects.toThrow(
        UNREACHABLE_MESSAGE,
      );
    });
  });

  describe("getTestExecution", () => {
    const executionMock = { executionId: "42", status: "passed" };

    it("should call the correct endpoint with GET method and X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      await api.getTestExecution({ executionId: "42" });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/executions/42",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should return parsed JSON response", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      const result = await api.getTestExecution({ executionId: "42" });

      expect(result).toEqual(executionMock);
    });

    it("should strip videoUrl from nested test run", async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({
          ...executionMock,
          tests: [
            {
              testId: 1,
              run: {
                runId: 10,
                status: "passed",
                videoUrl: "https://cdn.reflect.run/video/42.mp4",
              },
            },
          ],
        }),
      );

      const result = await api.getTestExecution({ executionId: "42" });
      const tests = (result as Record<string, unknown>).tests as Record<
        string,
        unknown
      >[];
      const run = tests[0].run as Record<string, unknown>;

      expect(run.videoUrl).toBeUndefined();
      expect(run.runId).toBe(10);
      expect((result as Record<string, unknown>).executionId).toBe("42");
    });

    it("should throw ToolError when executionId is missing", async () => {
      await expect(api.getTestExecution({ executionId: "" })).rejects.toThrow(
        "executionId argument is required",
      );
    });

    it("should throw ToolError on HTTP error", async () => {
      fetchMock.mockResponseOnce("Internal Server Error", { status: 500 });

      await expect(api.getTestExecution({ executionId: "42" })).rejects.toThrow(
        "Failed to get test status",
      );
    });

    it("should map network errors to an unreachable message", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(api.getTestExecution({ executionId: "42" })).rejects.toThrow(
        UNREACHABLE_MESSAGE,
      );
    });
  });

  describe("listSuiteExecutions", () => {
    const suiteExecutionsMock = {
      suiteId: "regression-tests",
      executions: {
        data: [
          { executionId: 12, status: "pending", isFinished: false },
          { executionId: 47, status: "passed", isFinished: true },
          { executionId: 30, status: "failed", isFinished: true },
        ],
      },
    };

    it("should call the correct endpoint with GET method and X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(suiteExecutionsMock));

      await api.listSuiteExecutions({ suiteId: "regression-tests" });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/suites/regression-tests/executions",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should return executions in the order the API returns them", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(suiteExecutionsMock));

      const result = (await api.listSuiteExecutions({
        suiteId: "regression-tests",
      })) as typeof suiteExecutionsMock;

      expect(result.executions.data.map((e) => e.executionId)).toEqual([
        12, 47, 30,
      ]);
    });

    it("should return empty list as-is when no executions exist", async () => {
      const empty = { suiteId: "regression-tests", executions: { data: [] } };
      fetchMock.mockResponseOnce(JSON.stringify(empty));

      const result = await api.listSuiteExecutions({
        suiteId: "regression-tests",
      });

      expect(result).toEqual(empty);
    });

    it("should throw ToolError when suiteId is missing", async () => {
      await expect(api.listSuiteExecutions({ suiteId: "" })).rejects.toThrow(
        "suiteId argument is required",
      );
    });

    it("should map 404 to a suite-not-found message", async () => {
      fetchMock.mockResponseOnce("Not Found", { status: 404 });

      await expect(
        api.listSuiteExecutions({ suiteId: "missing" }),
      ).rejects.toThrow(
        "Test suite not found. Verify the suiteId is correct and belongs to your workspace.",
      );
    });

    it("should fall back to a generic message for other HTTP errors", async () => {
      fetchMock.mockResponseOnce("Boom", { status: 500 });

      await expect(
        api.listSuiteExecutions({ suiteId: "regression-tests" }),
      ).rejects.toThrow("Failed to list suite executions: 500");
    });

    it("should map network errors to an unreachable message", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(
        api.listSuiteExecutions({ suiteId: "regression-tests" }),
      ).rejects.toThrow(UNREACHABLE_MESSAGE);
    });
  });

  describe("cancelSuiteExecution", () => {
    const cancelledMock = {
      executionId: 47,
      status: "cancelled",
      isFinished: true,
    };

    it("should call the correct endpoint with PATCH method and X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(cancelledMock));

      await api.cancelSuiteExecution({
        suiteId: "regression-tests",
        executionId: "47",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/suites/regression-tests/executions/47/cancel",
        expect.objectContaining({
          method: "PATCH",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should return parsed JSON response", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(cancelledMock));

      const result = await api.cancelSuiteExecution({
        suiteId: "regression-tests",
        executionId: "47",
      });

      expect(result).toEqual(cancelledMock);
    });

    it("should throw ToolError when suiteId is missing", async () => {
      await expect(
        api.cancelSuiteExecution({ suiteId: "", executionId: "47" }),
      ).rejects.toThrow("suiteId argument is required");
    });

    it("should throw ToolError when executionId is missing", async () => {
      await expect(
        api.cancelSuiteExecution({
          suiteId: "regression-tests",
          executionId: "",
        }),
      ).rejects.toThrow("executionId argument is required");
    });

    it("should map 404 to a not-found message", async () => {
      fetchMock.mockResponseOnce("Not Found", { status: 404 });

      await expect(
        api.cancelSuiteExecution({ suiteId: "missing", executionId: "47" }),
      ).rejects.toThrow(
        "Suite execution not found. Verify the suiteId and executionId are correct and belong to your workspace.",
      );
    });

    it("should map 409 to an already-finished message", async () => {
      fetchMock.mockResponseOnce("Conflict", { status: 409 });

      await expect(
        api.cancelSuiteExecution({
          suiteId: "regression-tests",
          executionId: "47",
        }),
      ).rejects.toThrow(
        "Suite execution cannot be cancelled because it has already finished.",
      );
    });

    it("should fall back to a generic message for other HTTP errors", async () => {
      fetchMock.mockResponseOnce("Boom", { status: 500 });

      await expect(
        api.cancelSuiteExecution({
          suiteId: "regression-tests",
          executionId: "47",
        }),
      ).rejects.toThrow("Failed to cancel suite execution: 500");
    });

    it("should map network errors to an unreachable message", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(
        api.cancelSuiteExecution({
          suiteId: "regression-tests",
          executionId: "47",
        }),
      ).rejects.toThrow(UNREACHABLE_MESSAGE);
    });
  });

  describe("ftFetch authentication errors", () => {
    it("should map 401 responses to an auth-failed message", async () => {
      fetchMock.mockResponseOnce("Unauthorized", { status: 401 });

      await expect(api.listTests()).rejects.toThrow(AUTH_FAILED_MESSAGE);
    });

    it("should map 403 responses to an auth-failed message", async () => {
      fetchMock.mockResponseOnce("Forbidden", { status: 403 });

      await expect(api.listTests()).rejects.toThrow(AUTH_FAILED_MESSAGE);
    });
  });

  describe("listSuites", () => {
    it("should call the correct endpoint with X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(suitesResponseMock));

      await api.listSuites();

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/suites",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should return parsed JSON response", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(suitesResponseMock));

      const result = await api.listSuites();

      expect(result).toEqual(suitesResponseMock);
    });

    it("should return an empty suites list when no suites exist", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ suites: [] }));

      const result = await api.listSuites();

      expect(result).toEqual({ suites: [] });
    });

    it("should throw an authentication error on 401", async () => {
      fetchMock.mockResponseOnce("Unauthorized", { status: 401 });

      await expect(api.listSuites()).rejects.toThrow(
        "Authentication failed. Verify your API token is valid and has not expired.",
      );
    });

    it("should throw an authentication error on 403", async () => {
      fetchMock.mockResponseOnce("Forbidden", { status: 403 });

      await expect(api.listSuites()).rejects.toThrow(
        "Authentication failed. Verify your API token is valid and has not expired.",
      );
    });

    it("should throw an error with the response status on other HTTP errors", async () => {
      fetchMock.mockResponseOnce("Server Error", { status: 503 });

      await expect(api.listSuites()).rejects.toThrow(
        "Failed to list Functional Testing suites",
      );
    });

    it("should throw a service-unavailable error on network failure", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(api.listSuites()).rejects.toThrow(
        "Swagger Functional Testing service is currently unreachable. Retry after a moment.",
      );
    });
  });

  describe("runSuite", () => {
    const executionMock = { executionId: "7", status: "pending" };

    it("should call the correct endpoint with POST method and X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      await api.runSuite({ suiteId: "checkout-suite" });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/suites/checkout-suite/executions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should not send a request body when no tunnelAgentName is provided", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      await api.runSuite({ suiteId: "checkout-suite" });

      const [, init] = fetchMock.mock.calls[0];
      expect((init as RequestInit | undefined)?.body).toBeUndefined();
    });

    it("should send tunnel agent override body when tunnelAgentName is provided", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      await api.runSuite({
        suiteId: "checkout-suite",
        tunnelAgentName: "my-tunnel",
      });

      const [, init] = fetchMock.mock.calls[0];
      expect((init as RequestInit | undefined)?.body).toBe(
        JSON.stringify({
          overrides: { agent: { name: "my-tunnel" } },
        }),
      );
    });

    it("should return parsed JSON response", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      const result = await api.runSuite({ suiteId: "checkout-suite" });

      expect(result).toEqual(executionMock);
    });

    it("should strip url field from response", async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({
          ...executionMock,
          url: "https://app.reflect.run/suites/checkout-suite/executions/7",
        }),
      );

      const result = await api.runSuite({ suiteId: "checkout-suite" });

      expect((result as Record<string, unknown>).url).toBeUndefined();
    });

    it("should throw ToolError when suiteId is missing", async () => {
      await expect(api.runSuite({ suiteId: "" })).rejects.toThrow(
        "suiteId argument is required",
      );
    });

    it("should throw an authentication error on 401", async () => {
      fetchMock.mockResponseOnce("Unauthorized", { status: 401 });

      await expect(api.runSuite({ suiteId: "checkout-suite" })).rejects.toThrow(
        "Authentication failed. Verify your API token is valid and has not expired.",
      );
    });

    it("should throw an authentication error on 403", async () => {
      fetchMock.mockResponseOnce("Forbidden", { status: 403 });

      await expect(api.runSuite({ suiteId: "checkout-suite" })).rejects.toThrow(
        "Authentication failed. Verify your API token is valid and has not expired.",
      );
    });

    it("should throw ToolError on HTTP error", async () => {
      fetchMock.mockResponseOnce("Not Found", { status: 404 });

      await expect(api.runSuite({ suiteId: "checkout-suite" })).rejects.toThrow(
        "Failed to run suite",
      );
    });

    it("should throw a service-unavailable error on network failure", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(api.runSuite({ suiteId: "checkout-suite" })).rejects.toThrow(
        "Swagger Functional Testing service is currently unreachable. Retry after a moment.",
      );
    });
  });

  describe("getSuiteExecution", () => {
    const suiteExecutionMock = {
      suiteId: "checkout-suite",
      executionId: "7",
      isFinished: true,
      status: "passed",
      tests: [],
    };

    it("should call the correct endpoint with GET method and X-API-KEY header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(suiteExecutionMock));

      await api.getSuiteExecution({
        suiteId: "checkout-suite",
        executionId: "7",
      });

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/suites/checkout-suite/executions/7",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        }),
      );
    });

    it("should return parsed JSON response", async () => {
      fetchMock.mockResponseOnce(JSON.stringify(suiteExecutionMock));

      const result = await api.getSuiteExecution({
        suiteId: "checkout-suite",
        executionId: "7",
      });

      expect(result).toEqual(suiteExecutionMock);
    });

    it("should strip url field from response", async () => {
      fetchMock.mockResponseOnce(
        JSON.stringify({
          ...suiteExecutionMock,
          url: "https://app.reflect.run/suites/checkout-suite/executions/7",
        }),
      );

      const result = await api.getSuiteExecution({
        suiteId: "checkout-suite",
        executionId: "7",
      });

      expect((result as Record<string, unknown>).url).toBeUndefined();
    });

    it("should strip videoUrl from each run in tests.data array", async () => {
      const mockWithTests = {
        ...suiteExecutionMock,
        tests: {
          data: [
            {
              id: "test-1",
              status: "passed",
              runs: [
                { runId: 1, videoUrl: "https://cdn.reflect.run/video/1.mp4" },
              ],
            },
            {
              id: "test-2",
              status: "failed",
              runs: [
                { runId: 2, videoUrl: "https://cdn.reflect.run/video/2.mp4" },
              ],
            },
          ],
        },
      };
      fetchMock.mockResponseOnce(JSON.stringify(mockWithTests));

      const result = await api.getSuiteExecution({
        suiteId: "checkout-suite",
        executionId: "7",
      });

      const testsData = (
        (result as Record<string, unknown>).tests as Record<string, unknown>
      ).data as Record<string, unknown>[];
      const runs0 = testsData[0].runs as Record<string, unknown>[];
      const runs1 = testsData[1].runs as Record<string, unknown>[];
      expect(runs0[0].videoUrl).toBeUndefined();
      expect(runs1[0].videoUrl).toBeUndefined();
      expect(testsData[0].id).toBe("test-1");
      expect(testsData[1].id).toBe("test-2");
    });

    it("should throw ToolError when suiteId is missing", async () => {
      await expect(
        api.getSuiteExecution({ suiteId: "", executionId: "7" }),
      ).rejects.toThrow("suiteId argument is required");
    });

    it("should throw ToolError when executionId is missing", async () => {
      await expect(
        api.getSuiteExecution({ suiteId: "checkout-suite", executionId: "" }),
      ).rejects.toThrow("executionId argument is required");
    });

    it("should throw an authentication error on 401", async () => {
      fetchMock.mockResponseOnce("Unauthorized", { status: 401 });

      await expect(
        api.getSuiteExecution({
          suiteId: "checkout-suite",
          executionId: "7",
        }),
      ).rejects.toThrow(
        "Authentication failed. Verify your API token is valid and has not expired.",
      );
    });

    it("should throw an authentication error on 403", async () => {
      fetchMock.mockResponseOnce("Forbidden", { status: 403 });

      await expect(
        api.getSuiteExecution({
          suiteId: "checkout-suite",
          executionId: "7",
        }),
      ).rejects.toThrow(
        "Authentication failed. Verify your API token is valid and has not expired.",
      );
    });

    it("should throw ToolError on HTTP error", async () => {
      fetchMock.mockResponseOnce("Internal Server Error", { status: 500 });

      await expect(
        api.getSuiteExecution({
          suiteId: "checkout-suite",
          executionId: "7",
        }),
      ).rejects.toThrow("Failed to get suite execution status");
    });

    it("should throw a service-unavailable error on network failure", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(
        api.getSuiteExecution({
          suiteId: "checkout-suite",
          executionId: "7",
        }),
      ).rejects.toThrow(
        "Swagger Functional Testing service is currently unreachable. Retry after a moment.",
      );
    });
  });

  describe("getFtHeaders", () => {
    it("should return headers with X-API-KEY and Content-Type", () => {
      const headers = api.getFtHeaders();

      expect(headers["X-API-KEY"]).toBe("test-api-key");
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["User-Agent"]).toBe("SmartBear MCP Server/test");
    });

    it("should throw ToolError when no token is available", () => {
      const apiWithNoToken = new FunctionalTestingAPI(
        () => null,
        "SmartBear MCP Server/test",
      );

      expect(() => apiWithNoToken.getFtHeaders()).toThrow(
        "Swagger Functional Testing API token not found",
      );
    });
  });
});
