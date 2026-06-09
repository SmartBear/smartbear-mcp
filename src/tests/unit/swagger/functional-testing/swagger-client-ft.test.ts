import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { requestContextStorage } from "../../../../common/request-context";
import { SwaggerClient } from "../../../../swagger/client";

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
      await client.configure({} as any, { api_key: "swagger-key" });

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

  describe("registerTools — conditional FT tool registration", () => {
    it("should not register FT tools when no FT token configured", async () => {
      await client.configure({} as any, { api_key: "swagger-key" });

      const mockRegister = vi.fn();
      await client.registerTools(mockRegister, vi.fn());

      const registeredTitles = mockRegister.mock.calls.map(
        (call) => call[0].title,
      );
      expect(registeredTitles).not.toContain("List Tests");
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
});
