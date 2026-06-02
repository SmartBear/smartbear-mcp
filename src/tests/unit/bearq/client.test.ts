import { beforeEach, describe, expect, it, vi } from "vitest";
import { BearQClient } from "../../../bearq/client";

describe("BearQClient", () => {
  let client: BearQClient;

  beforeEach(() => {
    client = new BearQClient();
  });

  it("isConfigured() is false by default", () => {
    expect(client.isConfigured()).toBe(false);
  });

  it("capabilityPrefix is 'bearq'", () => {
    expect(client.capabilityPrefix).toBe("bearq");
  });

  it("configPrefix is 'BearQ'", () => {
    expect(client.configPrefix).toBe("BearQ");
  });

  it("getBaseUrl() returns default URL when api_base_url is omitted", async () => {
    await client.configure({} as any, {});
    expect(client.getBaseUrl()).toBe("https://api.bearq.smartbear.com");
  });

  it("getBaseUrl() returns custom URL when api_base_url is set", async () => {
    await client.configure({} as any, {
      api_base_url: "http://localhost:4000",
    });
    expect(client.getBaseUrl()).toBe("http://localhost:4000");
  });

  describe("getAuthToken()", () => {
    it("returns token from Authorization header", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "authorization") return "oauth-token";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      const token = client.getAuthToken();
      expect(token).toBe("oauth-token");
    });

    it("api_token wins over configured token", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "api_token") return "choose-me";
          if (key === "authorization") return "not-me";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      const token = client.getAuthToken();
      expect(token).toBe("choose-me");
    });
  });

  describe("getHeaders()", () => {
    it("returns Authorization Bearer header when token is configured", async () => {
      const mockServer = {
        getEnv: vi.fn((key: string) => {
          if (key === "authorization") return "my-token";
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      expect(client.getHeaders().Authorization).toBe("Bearer my-token");
    });

    it("throws 'BearQ API token not found' when no token available", async () => {
      const mockServer = {
        getEnv: vi.fn((_key: string) => {
          return undefined;
        }),
      } as any;
      await client.configure(mockServer, {});
      expect(() => client.getHeaders()).toThrow("BearQ API token not found");
    });
  });
});
