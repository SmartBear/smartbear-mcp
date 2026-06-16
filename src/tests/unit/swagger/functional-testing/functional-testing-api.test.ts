import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import {
  FunctionalTestingAPI,
  FunctionalTestingApiEnv,
} from "../../../../swagger/client/functional-testing-api";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const testsMock = [
  { id: "test-1", name: "Login Test" },
  { id: "test-2", name: "Checkout Test" },
];

describe("FunctionalTestingAPI", () => {
  let api: FunctionalTestingAPI;

  beforeEach(() => {
    fetchMock.resetMocks();
    api = new FunctionalTestingAPI(
      () => "test-api-key",
      "SmartBear MCP Server/test",
      FunctionalTestingApiEnv.Production,
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
      fetchMock.mockResponseOnce("Unauthorized", { status: 401 });

      await expect(api.listTests()).rejects.toThrow(
        "Failed to list Functional Testing tests",
      );
    });

    it("should propagate network errors", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(api.listTests()).rejects.toThrow("Network error");
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

    it("should propagate network errors", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(api.runTest({ testId: "94" })).rejects.toThrow(
        "Network error",
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

    it("should propagate network errors", async () => {
      fetchMock.mockRejectOnce(new Error("Network error"));

      await expect(api.getTestExecution({ executionId: "42" })).rejects.toThrow(
        "Network error",
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
