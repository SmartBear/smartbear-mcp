import { beforeEach, describe, expect, it } from "vitest";
import { requestContextStorage } from "../../../common/request-context";
import { LoadNinjaClient } from "../../../loadninja/client";

describe("LoadNinjaClient", () => {
  let client: LoadNinjaClient;

  beforeEach(() => {
    client = new LoadNinjaClient();
  });

  it("capabilityPrefix is 'loadninja'", () => {
    expect(client.capabilityPrefix).toBe("loadninja");
  });

  it("configPrefix is 'LoadNinja'", () => {
    expect(client.configPrefix).toBe("LoadNinja");
  });

  it("isConfigured() returns false before configure()", () => {
    expect(client.isConfigured()).toBe(false);
  });

  it("isConfigured() returns true after configure() with api_key", async () => {
    await client.configure({} as any, { api_key: "test-key" });
    expect(client.isConfigured()).toBe(true);
  });

  it("getBaseUrl() returns default URL when api_base_url is omitted", async () => {
    await client.configure({} as any, { api_key: "key" });
    expect(client.getBaseUrl()).toBe("https://api.loadninja.com/v1");
  });

  it("getBaseUrl() returns custom URL when api_base_url is set", async () => {
    await client.configure({} as any, {
      api_key: "key",
      api_base_url: "http://localhost:4000",
    });
    expect(client.getBaseUrl()).toBe("http://localhost:4000");
  });

  describe("getAuthToken()", () => {
    it("returns token from authorization header", () => {
      const token = requestContextStorage.run(
        { headers: { authorization: "my-api-key" } },
        () => client.getAuthToken(),
      );
      expect(token).toBe("my-api-key");
    });

    it("request-context header wins over configured token", async () => {
      await client.configure({} as any, { api_key: "configured-key" });
      const token = requestContextStorage.run(
        { headers: { authorization: "header-key" } },
        () => client.getAuthToken(),
      );
      expect(token).toBe("header-key");
    });

    it("falls back to configured api_key when no header", async () => {
      await client.configure({} as any, { api_key: "configured-key" });
      const token = requestContextStorage.run({ headers: {} }, () =>
        client.getAuthToken(),
      );
      expect(token).toBe("configured-key");
    });

    it("returns null when neither header nor configured key present", () => {
      const token = requestContextStorage.run({ headers: {} }, () =>
        client.getAuthToken(),
      );
      expect(token).toBeNull();
    });
  });

  describe("getHeaders()", () => {
    it("returns authorization header with raw API key", async () => {
      await client.configure({} as any, { api_key: "my-key" });
      const headers = requestContextStorage.run({ headers: {} }, () =>
        client.getHeaders(),
      );
      expect(headers.authorization).toBe("my-key");
      expect(headers["Content-Type"]).toBe("application/json");
      expect(headers.Accept).toBe("application/json");
    });

    it("throws when no token available", () => {
      expect(() =>
        requestContextStorage.run({ headers: {} }, () => client.getHeaders()),
      ).toThrow("LoadNinja API key not found");
    });
  });
});
