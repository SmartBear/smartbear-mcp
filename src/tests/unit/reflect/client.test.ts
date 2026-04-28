import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestContextStorage } from "../../../common/request-context";
import { ReflectClient } from "../../../reflect/client";

describe("ReflectClient", () => {
  let client: ReflectClient;

  beforeEach(() => {
    client = new ReflectClient();
  });

  it("should be configured by default to support dynamic OAuth tokens", () => {
    expect(client.isConfigured()).toBe(true);
  });

  it("should be configured after configure()", async () => {
    await client.configure({} as any, { api_token: "test-token" });
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
    client.registerConnection("session-1", mockWs, { platform: "web" });

    expect(client.isSessionConnected("session-1")).toBe(true);
    expect(client.getConnectedSession("session-1")).toBe(mockWs);
    expect(client.getSessionState("session-1")).toEqual({ platform: "web" });
  });

  it("should have correct tool prefix", () => {
    expect(client.toolPrefix).toBe("reflect");
  });

  it("should have correct config prefix", () => {
    expect(client.configPrefix).toBe("Reflect");
  });

  describe("isOAuthRequest", () => {
    it("should return true when Authorization header starts with Bearer", () => {
      const result = requestContextStorage.run(
        { headers: { Authorization: "Bearer oauth-token" } },
        () => client.isOAuthRequest(),
      );
      expect(result).toBe(true);
    });

    it("should return true when authorization header uses lowercase bearer scheme", () => {
      const result = requestContextStorage.run(
        { headers: { authorization: "bearer oauth-token" } },
        () => client.isOAuthRequest(),
      );
      expect(result).toBe(true);
    });

    it("should return false when no Authorization header", () => {
      const result = requestContextStorage.run({ headers: {} }, () =>
        client.isOAuthRequest(),
      );
      expect(result).toBe(false);
    });

    it("should return false when Authorization header does not start with Bearer", () => {
      const result = requestContextStorage.run(
        { headers: { Authorization: "Basic abc123" } },
        () => client.isOAuthRequest(),
      );
      expect(result).toBe(false);
    });

    it("should return false when Reflect-Api-Token is present alongside Authorization Bearer", () => {
      const result = requestContextStorage.run(
        {
          headers: {
            "Reflect-Api-Token": "my-api-token",
            Authorization: "Bearer oauth-token",
          },
        },
        () => client.isOAuthRequest(),
      );
      expect(result).toBe(false);
    });
  });

  describe("getAuthHeader", () => {
    it("should return Authorization Bearer header for OAuth request", () => {
      const result = requestContextStorage.run(
        { headers: { Authorization: "Bearer oauth-token" } },
        () => client.getAuthHeader(),
      );
      expect(result).toEqual({ Authorization: "Bearer oauth-token" });
    });

    it("should return X-API-KEY header when using API key header", () => {
      const result = requestContextStorage.run(
        { headers: { "X-API-KEY": "my-api-key" } },
        () => client.getAuthHeader(),
      );
      expect(result).toEqual({ "X-API-KEY": "my-api-key" });
    });

    it("should return X-API-KEY header when falling back to configured token", async () => {
      await client.configure({} as any, { api_token: "configured-token" });
      const result = requestContextStorage.run({ headers: {} }, () =>
        client.getAuthHeader(),
      );
      expect(result).toEqual({ "X-API-KEY": "configured-token" });
    });

    it("should throw when no token is available", () => {
      expect(() =>
        requestContextStorage.run({ headers: {} }, () =>
          client.getAuthHeader(),
        ),
      ).toThrow("Reflect API token not found");
    });
  });
});
