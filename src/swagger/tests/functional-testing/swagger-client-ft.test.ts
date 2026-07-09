import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { requestContextStorage } from "../../../common/request-context";
import { SwaggerClient } from "../../client";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("SwaggerClient — Functional Testing integration", () => {
  let client: SwaggerClient;

  beforeEach(() => {
    fetchMock.resetMocks();
    client = new SwaggerClient();
  });

  describe("getFtAuthToken", () => {
    it("should return token from configure()", async () => {
      await client.configure({} as any, {
        api_key: "swagger-key",
        functional_testing_api_token: "ft-token",
      });

      const result = requestContextStorage.run({ headers: {} }, () =>
        client.getFtAuthToken(),
      );
      expect(result).toBe("ft-token");
    });

    it("should return token from X-API-KEY request header", async () => {
      await client.configure({} as any, {
        api_key: "swagger-key",
        functional_testing_api_token: "static-token",
      });

      const result = requestContextStorage.run(
        { headers: { "X-API-KEY": "header-ft-token" } },
        () => client.getFtAuthToken(),
      );
      expect(result).toBe("header-ft-token");
    });

    it("should prefer request header over configured token", async () => {
      await client.configure({} as any, {
        api_key: "swagger-key",
        functional_testing_api_token: "static-token",
      });

      const result = requestContextStorage.run(
        { headers: { "X-API-KEY": "header-token" } },
        () => client.getFtAuthToken(),
      );
      expect(result).toBe("header-token");
    });

    it("should return null when no FT token available", async () => {
      await client.configure({} as any, { api_key: "swagger-key" });

      const result = requestContextStorage.run({ headers: {} }, () =>
        client.getFtAuthToken(),
      );
      expect(result).toBeNull();
    });

    it("should not interfere with Swagger getAuthToken", async () => {
      await client.configure({} as any, {
        api_key: "swagger-key",
        functional_testing_api_token: "ft-token",
      });

      const ftToken = requestContextStorage.run({ headers: {} }, () =>
        client.getFtAuthToken(),
      );
      const swaggerToken = requestContextStorage.run({ headers: {} }, () =>
        client.getAuthToken(),
      );

      expect(ftToken).toBe("ft-token");
      expect(swaggerToken).toBe("swagger-key");
    });
  });

  describe("isConfigured", () => {
    it("should return false when neither api_key nor FT token is configured", async () => {
      await client.configure({} as any, {});

      expect(client.isConfigured()).toBe(false);
    });

    it("should return true when only api_key is configured", async () => {
      await client.configure({} as any, { api_key: "swagger-key" });

      expect(client.isConfigured()).toBe(true);
    });

    it("should return true when only FT token is configured", async () => {
      await client.configure({} as any, {
        functional_testing_api_token: "ft-token",
      });

      expect(client.isConfigured()).toBe(true);
    });

    it("should return true when both api_key and FT token are configured", async () => {
      await client.configure({} as any, {
        api_key: "swagger-key",
        functional_testing_api_token: "ft-token",
      });

      expect(client.isConfigured()).toBe(true);
    });
  });

  describe("registerTools — conditional FT tool registration", () => {
    it("should not register FT tools when no FT token configured", async () => {
      await client.configure({} as any, { api_key: "swagger-key" });

      const mockRegister = vi.fn();
      await client.registerTools(mockRegister, vi.fn());

      const registeredTitles = mockRegister.mock.calls.map(
        (call) => call[0].title,
      );
      expect(registeredTitles).not.toContain("List Tests");
      expect(registeredTitles).not.toContain("List Suites");
    });

    it("should register FT tools when FT token is configured", async () => {
      await client.configure({} as any, {
        api_key: "swagger-key",
        functional_testing_api_token: "ft-token",
      });

      const mockRegister = vi.fn();
      await client.registerTools(mockRegister, vi.fn());

      const registeredTitles = mockRegister.mock.calls.map(
        (call) => call[0].title,
      );
      expect(registeredTitles).toContain("List Tests");
      expect(registeredTitles).toContain("List Suites");
    });

    it("should not affect existing Swagger tools when FT token is absent", async () => {
      await client.configure({} as any, { api_key: "swagger-key" });

      const mockRegister = vi.fn();
      await client.registerTools(mockRegister, vi.fn());

      const registeredTitles = mockRegister.mock.calls.map(
        (call) => call[0].title,
      );
      expect(registeredTitles).toContain("List Portals");
      expect(registeredTitles).toContain("Search APIs and Domains");
    });

    it("should register only FT tools when only FT token is configured", async () => {
      await client.configure({} as any, {
        functional_testing_api_token: "ft-token",
      });

      const mockRegister = vi.fn();
      await client.registerTools(mockRegister, vi.fn());

      const registeredTitles = mockRegister.mock.calls.map(
        (call) => call[0].title,
      );
      expect(registeredTitles).toContain("List Tests");
      expect(registeredTitles).toContain("List Suites");
      expect(registeredTitles).not.toContain("List Portals");
      expect(registeredTitles).not.toContain("Search APIs and Domains");
    });

    it("should register all tools when both api_key and FT token are configured", async () => {
      await client.configure({} as any, {
        api_key: "swagger-key",
        functional_testing_api_token: "ft-token",
      });

      const mockRegister = vi.fn();
      await client.registerTools(mockRegister, vi.fn());

      const registeredTitles = mockRegister.mock.calls.map(
        (call) => call[0].title,
      );
      expect(registeredTitles).toContain("List Tests");
      expect(registeredTitles).toContain("List Portals");
      expect(registeredTitles).toContain("Search APIs and Domains");
    });
  });

  describe("listFunctionalTestingTests", () => {
    it("should call api.reflect.run and return results", async () => {
      const testsMock = [{ id: "test-1", name: "Login Test" }];
      fetchMock.mockResponseOnce(JSON.stringify(testsMock));

      await client.configure({} as any, {
        api_key: "swagger-key",
        functional_testing_api_token: "ft-token",
      });

      const result = await requestContextStorage.run({ headers: {} }, () =>
        client.listFunctionalTestingTests(),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/tests",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ "X-API-KEY": "ft-token" }),
        }),
      );
      expect(result).toEqual(testsMock);
    });
  });

  describe("listFunctionalTestingSuiteExecutions", () => {
    it("should register the List Suite Executions tool when FT token is configured", async () => {
      await client.configure({} as any, {
        functional_testing_api_token: "ft-token",
      });

      const mockRegister = vi.fn();
      await client.registerTools(mockRegister, vi.fn());

      const registeredTitles = mockRegister.mock.calls.map(
        (call) => call[0].title,
      );
      expect(registeredTitles).toContain("List Suite Executions");
    });

    it("should call the suite executions endpoint and return results", async () => {
      const suiteExecutionsMock = {
        suiteId: "regression-tests",
        executions: {
          data: [
            { executionId: 12, status: "pending" },
            { executionId: 47, status: "passed" },
          ],
        },
      };
      fetchMock.mockResponseOnce(JSON.stringify(suiteExecutionsMock));

      await client.configure({} as any, {
        api_key: "swagger-key",
        functional_testing_api_token: "ft-token",
      });

      const result = (await requestContextStorage.run({ headers: {} }, () =>
        client.listFunctionalTestingSuiteExecutions({
          suiteId: "regression-tests",
        }),
      )) as typeof suiteExecutionsMock;

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/suites/regression-tests/executions",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ "X-API-KEY": "ft-token" }),
        }),
      );
      expect(result.executions.data.map((e) => e.executionId)).toEqual([
        12, 47,
      ]);
    });
  });

  describe("listFunctionalTestingSuites", () => {
    it("should call api.reflect.run and return results", async () => {
      const suitesMock = [{ id: "suite-1", name: "Smoke Suite" }];
      fetchMock.mockResponseOnce(JSON.stringify(suitesMock));

      await client.configure({} as any, {
        api_key: "swagger-key",
        functional_testing_api_token: "ft-token",
      });

      const result = await requestContextStorage.run({ headers: {} }, () =>
        client.listFunctionalTestingSuites(),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/suites",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ "X-API-KEY": "ft-token" }),
        }),
      );
      expect(result).toEqual(suitesMock);
    });

    it("should throw when FT API is not configured", async () => {
      await client.configure({} as any, { api_key: "swagger-key" });

      await expect(client.listFunctionalTestingSuites()).rejects.toThrow(
        "Functional Testing API not configured",
      );
    });
  });

  describe("runFunctionalTestingSuite", () => {
    it("should POST to suite executions endpoint and return result", async () => {
      const executionMock = { executionId: "42", status: "pending" };
      fetchMock.mockResponseOnce(JSON.stringify(executionMock));

      await client.configure({} as any, {
        api_key: "swagger-key",
        functional_testing_api_token: "ft-token",
      });

      const result = await requestContextStorage.run({ headers: {} }, () =>
        client.runFunctionalTestingSuite({ suiteId: "checkout-suite" }),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/suites/checkout-suite/executions",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({ "X-API-KEY": "ft-token" }),
        }),
      );
      expect(result).toEqual(executionMock);
    });
  });

  describe("getFunctionalTestingSuiteExecution", () => {
    it("should GET suite execution endpoint and return result", async () => {
      const suiteExecutionMock = {
        suiteId: "checkout-suite",
        executionId: "42",
        isFinished: true,
        status: "passed",
        tests: [],
      };
      fetchMock.mockResponseOnce(JSON.stringify(suiteExecutionMock));

      await client.configure({} as any, {
        api_key: "swagger-key",
        functional_testing_api_token: "ft-token",
      });

      const result = await requestContextStorage.run({ headers: {} }, () =>
        client.getFunctionalTestingSuiteExecution({
          suiteId: "checkout-suite",
          executionId: "42",
        }),
      );

      expect(fetchMock).toHaveBeenCalledWith(
        "https://api.reflect.run/v1/suites/checkout-suite/executions/42",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({ "X-API-KEY": "ft-token" }),
        }),
      );
      expect(result).toEqual(suiteExecutionMock);
    });
  });
});
