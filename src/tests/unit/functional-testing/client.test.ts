import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("should not be configured before configure()", () => {
    expect(client.isConfigured()).toBe(false);
  });

  it("should be configured after configure()", async () => {
    await client.configure({} as any, {});
    expect(client.isConfigured()).toBe(true);
  });

  describe("getAuthToken", () => {
    it("should return token from api_token env var", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "api_token") return "my-api-token";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      expect(client.getAuthToken()).toBe("my-api-token");
    });

    it("should return token from X-API-KEY header", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "X-API-KEY") return "header-token";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      expect(client.getAuthToken()).toBe("header-token");
    });

    it("should return null when no token available", async () => {
      const mockServer = {
        getEnv: vi.fn(() => undefined),
      } as any;
      await client.configure(mockServer, {});
      expect(client.getAuthToken()).toBeNull();
    });

    it("should prefer api_token over X-API-KEY header", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "api_token") return "env-token";
          if (key === "X-API-KEY") return "header-token";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      expect(client.getAuthToken()).toBe("env-token");
    });
  });

  describe("hasAuth", () => {
    it("should return false when not configured", () => {
      expect(client.hasAuth()).toBe(false);
    });

    it("should return false when configured but no token", async () => {
      const mockServer = {
        getEnv: vi.fn(() => undefined),
      } as any;
      await client.configure(mockServer, {});
      expect(client.hasAuth()).toBe(false);
    });

    it("should return true when configured with token", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "api_token") return "my-token";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      expect(client.hasAuth()).toBe(true);
    });
  });

  describe("getHeaders", () => {
    it("should return headers with token", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "api_token") return "test-token";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      const headers = client.getHeaders();
      expect(headers["X-API-KEY"]).toBe("test-token");
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers["User-Agent"]).toMatch(/SmartBear MCP Server/);
    });

    it("should throw when no token is available", async () => {
      const mockServer = {
        getEnv: vi.fn(() => undefined),
      } as any;
      await client.configure(mockServer, {});
      expect(() => client.getHeaders()).toThrow(
        "Swagger Functional Testing API token not found",
      );
    });
  });
});