import { describe, expect, it, vi } from "vitest";
import { Qtm4jClient } from "../../../qtm4j/client";
import { ApiClient } from "../../../qtm4j/http/api-client";

describe("Qtm4jClient", () => {
  it("should set name and prefix", () => {
    const client = new Qtm4jClient();
    expect(client.name).toBe("QTM4J");
    expect(client.toolPrefix).toBe("qtm4j");
    expect(client.configPrefix).toBe("Qtm4j");
  });

  it("should initialize ApiClient with default baseUrl", async () => {
    const client = new Qtm4jClient();
    await client.configure({} as any, { api_key: "token" } as any);
    expect(client.getApiClient()).toBeInstanceOf(ApiClient);
  });

  it("should initialize ApiClient with custom baseUrl", async () => {
    const client = new Qtm4jClient();
    await client.configure({} as any, {
      api_key: "token",
      base_url: "https://custom.qtm4j.com",
    });
    expect(client.getApiClient()).toBeInstanceOf(ApiClient);
  });

  it("should check if client is configured", async () => {
    const client = new Qtm4jClient();
    expect(client.isConfigured()).toBe(false);
    await client.configure({} as any, { api_key: "token" } as any);
    expect(client.isConfigured()).toBe(true);
  });

  it("should throw error when getApiClient is called before configure", () => {
    const client = new Qtm4jClient();
    expect(() => client.getApiClient()).toThrow(
      "QTM4J client not configured. Please set API key.",
    );
  });

  it("should register tools and call register", async () => {
    const client = new Qtm4jClient();
    await client.configure({} as any, { api_key: "token" } as any);
    const register = vi.fn();
    const getInput = vi.fn();
    await client.registerTools(register, getInput);
    expect(register).toHaveBeenCalled();
    expect(register.mock.calls[0][0].title).toBe("Get Projects");
  });

  it("should get auth token from configuration", async () => {
    const client = new Qtm4jClient();
    await client.configure({} as any, { api_key: "test-token-123" } as any);
    const token = client.getAuthToken();
    expect(token).toBe("test-token-123");
  });
});
