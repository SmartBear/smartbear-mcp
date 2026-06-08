import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestContextStorage } from "../../../common/request-context";
import { FunctionalTestingClient } from "../../../functional-testing/client";

describe("FunctionalTestingClient", () => {
  let client: FunctionalTestingClient;

  beforeEach(() => {
    client = new FunctionalTestingClient();
  });

  it("should have correct capabilityPrefix", () => {
    expect(client.capabilityPrefix).toBe("functional_testing");
  });

  it("should have correct configPrefix", () => {
    expect(client.configPrefix).toBe("Swagger-Functional-Testing");
  });

  it("should not be configured before configure() and without request header", () => {
    const result = requestContextStorage.run({ headers: {} }, () =>
      client.isConfigured(),
    );
    expect(result).toBe(false);
  });

  it("should be configured after configure() with api_token", async () => {
    await client.configure({} as any, { api_token: "test-token" });
    expect(client.isConfigured()).toBe(true);
  });

  it("should be configured when X-API-KEY header is present in request context", () => {
    const result = requestContextStorage.run(
      { headers: { "X-API-KEY": "ctx-token" } },
      () => client.isConfigured(),
    );
    expect(result).toBe(true);
  });

  describe("getAuthToken", () => {
    it("should return token from request context header", () => {
      const result = requestContextStorage.run(
        { headers: { "X-API-KEY": "ctx-token" } },
        () => client.getAuthToken(),
      );
      expect(result).toBe("ctx-token");
    });

    it("should fall back to configured api_token when no request header", async () => {
      await client.configure({} as any, { api_token: "static-token" });
      const result = requestContextStorage.run({ headers: {} }, () =>
        client.getAuthToken(),
      );
      expect(result).toBe("static-token");
    });

    it("should return null when no token available", () => {
      const result = requestContextStorage.run({ headers: {} }, () =>
        client.getAuthToken(),
      );
      expect(result).toBeNull();
    });

    it("should prefer request context header over configured api_token", async () => {
      await client.configure({} as any, { api_token: "static-token" });
      const result = requestContextStorage.run(
        { headers: { "X-API-KEY": "ctx-token" } },
        () => client.getAuthToken(),
      );
      expect(result).toBe("ctx-token");
    });
  });

  describe("hasAuth", () => {
    it("should return false when no token available", () => {
      const result = requestContextStorage.run({ headers: {} }, () =>
        client.hasAuth(),
      );
      expect(result).toBe(false);
    });

    it("should return true when api_token is configured", async () => {
      await client.configure({} as any, { api_token: "my-token" });
      expect(client.hasAuth()).toBe(true);
    });

    it("should return true when X-API-KEY header is present", () => {
      const result = requestContextStorage.run(
        { headers: { "X-API-KEY": "ctx-token" } },
        () => client.hasAuth(),
      );
      expect(result).toBe(true);
    });
  });

  describe("registerTools", () => {
    it("should register ListFunctionalTestingTests tool", async () => {
      await client.configure({} as any, { api_token: "test-token" });

      const mockRegister = vi.fn();
      const mockGetInput = vi.fn();
      await client.registerTools(mockRegister, mockGetInput);

      expect(mockRegister).toHaveBeenCalledTimes(1);
      expect(mockRegister.mock.calls[0][0].title).toBe("List Tests");
    });
  });

  describe("getHeaders", () => {
    it("should return headers with token from configure()", async () => {
      await client.configure({} as any, { api_token: "test-token" });
      const headers = requestContextStorage.run({ headers: {} }, () =>
        client.getHeaders(),
      );
      expect(headers["X-API-KEY"]).toBe("test-token");
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["User-Agent"]).toMatch(/SmartBear MCP Server/);
    });

    it("should throw when no token is available", () => {
      expect(() =>
        requestContextStorage.run({ headers: {} }, () => client.getHeaders()),
      ).toThrow("Swagger Functional Testing API token not found");
    });
  });
});
