import { beforeEach, describe, expect, it } from "vitest";
import { requestContextStorage } from "../common/request-context.ts";
import type { SmartBearMcpServer } from "../common/server.ts";
import { BearqClient } from "./client.ts";

describe("BearqClient", () => {
  let client: BearqClient;

  beforeEach(() => {
    client = new BearqClient();
  });

  it("isConfigured() is true by default", () => {
    expect(client.isConfigured()).toBe(true);
  });

  it("capabilityPrefix is 'bearq'", () => {
    expect(client.capabilityPrefix).toBe("bearq");
  });

  it("configPrefix is 'BearQ'", () => {
    expect(client.configPrefix).toBe("BearQ");
  });

  it("getBaseUrl() returns default URL when api_base_url is omitted", async () => {
    await client.configure({} as unknown as SmartBearMcpServer, {
      api_token: "tok",
    });
    expect(client.getBaseUrl()).toBe("https://api.bearq.smartbear.com");
  });

  it("getBaseUrl() returns custom URL when api_base_url is set", async () => {
    await client.configure({} as unknown as SmartBearMcpServer, {
      api_token: "tok",
      api_base_url: "http://localhost:4000",
    });
    expect(client.getBaseUrl()).toBe("http://localhost:4000");
  });

  // biome-ignore lint/security/noSecrets: false positive, this is a test suite name, not a secret
  describe("getAuthToken()", () => {
    it("returns token from Authorization header (strips 'Bearer ' prefix)", () => {
      const token = requestContextStorage.run(
        { headers: { authorization: "Bearer header-token" } },
        () => client.getAuthToken(),
      );
      expect(token).toBe("header-token");
    });

    it("request-context header wins over configured token", async () => {
      await client.configure({} as unknown as SmartBearMcpServer, {
        api_token: "configured-token",
      });
      const token = requestContextStorage.run(
        { headers: { authorization: "Bearer header-token" } },
        () => client.getAuthToken(),
      );
      expect(token).toBe("header-token");
    });

    it("falls back to configured token when no header", async () => {
      await client.configure({} as unknown as SmartBearMcpServer, {
        api_token: "configured-token",
      });
      const token = requestContextStorage.run({ headers: {} }, () =>
        client.getAuthToken(),
      );
      expect(token).toBe("configured-token");
    });

    it("returns null when neither header nor configured token present", () => {
      const token = requestContextStorage.run({ headers: {} }, () =>
        client.getAuthToken(),
      );
      expect(token).toBeNull();
    });
  });

  describe("getHeaders()", () => {
    it("returns Authorization Bearer header when token is configured", async () => {
      await client.configure({} as unknown as SmartBearMcpServer, {
        api_token: "my-token",
      });
      const headers = requestContextStorage.run({ headers: {} }, () =>
        client.getHeaders(),
      );
      expect(headers.Authorization).toBe("Bearer my-token");
    });

    it("throws 'BearQ API token not found' when no token available", () => {
      expect(() =>
        requestContextStorage.run({ headers: {} }, () => client.getHeaders()),
      ).toThrow("BearQ API token not found");
    });
  });
});
