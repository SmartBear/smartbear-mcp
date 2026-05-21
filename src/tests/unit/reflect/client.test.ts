import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReflectClient } from "../../../reflect/client";

describe("ReflectClient", () => {
  let client: ReflectClient;

  beforeEach(() => {
    client = new ReflectClient();
  });

  it("should not be configured by default", () => {
    expect(client.isConfigured()).toBe(false);
  });

  it("should be configured after configure()", async () => {
    await client.configure({} as any, {} as any);
    expect(client.isConfigured()).toBe(true);
  });

  it("should return undefined for unregistered session state", () => {
    expect(client.getSessionState("unknown-session")).toBeUndefined();
  });

  it("should return false for unregistered session connection", () => {
    expect(client.isSessionConnected("unknown-session")).toBe(false);
  });

  it("should register and retrieve connection", () => {
    const mockWs = { isConnected: vi.fn().mockReturnValue(true) } as any;
    client.registerConnection("session-1", mockWs, {
      platform: "web",
      test: { name: "Test 1" },
    });

    expect(client.isSessionConnected("session-1")).toBe(true);
    expect(client.getConnectedSession("session-1")).toBe(mockWs);
    expect(client.getSessionState("session-1")).toEqual({
      platform: "web",
      test: { name: "Test 1" },
    });
  });

  it("should have correct tool prefix", () => {
    expect(client.capabilityPrefix).toBe("reflect");
  });

  it("should have correct config prefix", () => {
    expect(client.configPrefix).toBe("Reflect");
  });

  describe("isOAuthRequest", () => {
    it("should return false when api_token is set", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "api_token") return "my-api-token";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      expect(client.isOAuthRequest()).toBe(false);
    });

    it("should return false when X-API-KEY is set", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "X-API-KEY") return "my-api-key";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      expect(client.isOAuthRequest()).toBe(false);
    });

    it("should return true when only Authorization header is set", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "Authorization") return "Bearer oauth-token";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      expect(client.isOAuthRequest()).toBe(true);
    });

    it("should return false when no auth is set", async () => {
      const mockServer = {
        getEnv: vi.fn(() => undefined),
      } as any;
      await client.configure(mockServer, {});
      expect(client.isOAuthRequest()).toBe(false);
    });

    it("should return false when X-API-KEY is present alongside Authorization", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "X-API-KEY") return "my-api-key";
          if (key === "Authorization") return "Bearer oauth-token";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      expect(client.isOAuthRequest()).toBe(false);
    });
  });

  describe("getAuthHeader", () => {
    it("should return Authorization Bearer header for OAuth request", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "Authorization") return "oauth-token";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      expect(client.getAuthHeader()).toEqual({
        Authorization: "Bearer oauth-token",
      });
    });

    it("should return X-API-KEY header when using API key", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "api_token") return "my-api-key";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      expect(client.getAuthHeader()).toEqual({ "X-API-KEY": "my-api-key" });
    });

    it("should throw when no token is available", async () => {
      const mockServer = {
        getEnv: vi.fn(() => undefined),
      } as any;
      await client.configure(mockServer, {});
      expect(() => client.getAuthHeader()).toThrow();
    });
  });

  describe("getHeaders", () => {
    it("should include Content-Type and User-Agent alongside auth header", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "api_token") return "my-api-key";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      const headers = client.getHeaders();
      expect(headers).toEqual(
        expect.objectContaining({
          "X-API-KEY": "my-api-key",
          "Content-Type": "application/json",
        }),
      );
      expect(headers["User-Agent"]).toMatch(/^SmartBear MCP Server\//);
    });

    it("should use Bearer auth header for OAuth requests", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "Authorization") return "oauth-token";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      const headers = client.getHeaders();
      expect(headers).toEqual(
        expect.objectContaining({
          Authorization: "Bearer oauth-token",
          "Content-Type": "application/json",
        }),
      );
      expect(headers["User-Agent"]).toMatch(/^SmartBear MCP Server\//);
    });

    it("should not contain X-API-KEY when using OAuth", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "Authorization") return "oauth-token";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      const headers = client.getHeaders();
      expect(headers["X-API-KEY"]).toBeUndefined();
    });
  });
});
