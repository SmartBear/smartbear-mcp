import { beforeEach, describe, expect, it, vi } from "vitest";
import { Qtm4jClient } from "./client";
import { ApiClient } from "./http/api-client";

vi.mock("../common/request-context", () => ({
  getRequestHeader: vi.fn().mockReturnValue(null),
}));

import { getRequestHeader } from "../common/request-context";

describe("Qtm4jClient", () => {
  beforeEach(() => {
    vi.mocked(getRequestHeader).mockReturnValue(undefined);
  });

  it("should set name and prefix", () => {
    const client = new Qtm4jClient();
    expect(client.name).toBe("QTM4J");
    expect(client.capabilityPrefix).toBe("qtm4j");
    expect(client.configPrefix).toBe("Qtm4j");
  });

  it("should initialize ApiClient with default baseUrl", async () => {
    const client = new Qtm4jClient();
    await client.configure(
      { getCache: () => undefined } as any,
      { api_key: "token" } as any,
    );
    expect(client.getApiClient()).toBeInstanceOf(ApiClient);
  });

  it("should initialize ApiClient with custom baseUrl", async () => {
    const client = new Qtm4jClient();
    await client.configure({ getCache: () => undefined } as any, {
      api_key: "token",
      base_url: "https://custom.qtm4j.com",
    });
    expect(client.getApiClient()).toBeInstanceOf(ApiClient);
  });

  it("should check if client is configured", async () => {
    const client = new Qtm4jClient();
    expect(client.isConfigured()).toBe(false);
    await client.configure(
      { getCache: () => undefined } as any,
      { api_key: "token" } as any,
    );
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
    await client.configure(
      { getCache: () => undefined } as any,
      { api_key: "token" } as any,
    );
    const register = vi.fn();
    const getInput = vi.fn();
    await client.registerTools(register, getInput);
    expect(register).toHaveBeenCalled();
    expect(register.mock.calls[0][0].title).toBe("Get Projects");
  });

  it("should throw error when getResolverRegistry is called before configure", () => {
    const client = new Qtm4jClient();
    expect(() => client.getResolverRegistry()).toThrow(
      "QTM4J client not configured. Please set API key.",
    );
  });

  it("should return ResolverRegistry after configure", async () => {
    const client = new Qtm4jClient();
    await client.configure(
      { getCache: () => undefined } as any,
      { api_key: "token" } as any,
    );
    expect(client.getResolverRegistry()).toBeDefined();
  });

  it("should throw when requireProjectContext called with no context set", async () => {
    const client = new Qtm4jClient();
    await client.configure(
      { getCache: () => undefined } as any,
      { api_key: "token" } as any,
    );
    expect(() => client.requireProjectContext()).toThrow(
      "No active project set",
    );
  });

  it("should return null from getAuthToken when not configured", () => {
    const client = new Qtm4jClient();
    expect(client.getAuthToken()).toBeNull();
  });

  it("should get auth token from configuration", async () => {
    const client = new Qtm4jClient();
    await client.configure(
      { getCache: () => undefined } as any,
      { api_key: "test-token-123" } as any,
    );
    const token = client.getAuthToken();
    expect(token).toBe("test-token-123");
  });

  it("should prefer request header token over configured api key", async () => {
    vi.mocked(getRequestHeader).mockReturnValue("header-token");
    const client = new Qtm4jClient();
    await client.configure(
      { getCache: () => undefined } as any,
      { api_key: "config-token" } as any,
    );
    expect(client.getAuthToken()).toBe("header-token");
  });

  it("should strip Bearer prefix from Authorization header", async () => {
    vi.mocked(getRequestHeader).mockReturnValue("Bearer my-bearer-token");
    const client = new Qtm4jClient();
    await client.configure(
      { getCache: () => undefined } as any,
      { api_key: "config-token" } as any,
    );
    expect(client.getAuthToken()).toBe("my-bearer-token");
  });

  it("should handle array header value by using first element", async () => {
    vi.mocked(getRequestHeader).mockReturnValue(["array-token", "other"]);
    const client = new Qtm4jClient();
    await client.configure(
      { getCache: () => undefined } as any,
      { api_key: "config-token" } as any,
    );
    expect(client.getAuthToken()).toBe("array-token");
  });

  it("should return null from getAutomationApiKey when not configured", async () => {
    vi.mocked(getRequestHeader).mockReturnValue(undefined);
    const client = new Qtm4jClient();
    await client.configure(
      { getCache: () => undefined } as any,
      { api_key: "token" } as any,
    );
    expect(client.getAutomationApiKey()).toBeNull();
  });

  it("should return automation api key from configuration", async () => {
    vi.mocked(getRequestHeader).mockReturnValue(undefined);
    const client = new Qtm4jClient();
    await client.configure(
      { getCache: () => undefined } as any,
      { api_key: "token", automation_api_key: "auto-key-123" } as any,
    );
    expect(client.getAutomationApiKey()).toBe("auto-key-123");
  });

  it("should prefer automation header over configured automation api key", async () => {
    vi.mocked(getRequestHeader).mockImplementation((key: string) =>
      key === "Qtm4j-Automation-Api-Key" ? "header-auto-key" : undefined,
    );
    const client = new Qtm4jClient();
    await client.configure(
      { getCache: () => undefined } as any,
      { api_key: "token", automation_api_key: "config-auto-key" } as any,
    );
    expect(client.getAutomationApiKey()).toBe("header-auto-key");
  });

  it("should handle array automation header by using first element", async () => {
    vi.mocked(getRequestHeader).mockImplementation((key: string) =>
      key === "Qtm4j-Automation-Api-Key"
        ? ["array-auto-key", "other"]
        : undefined,
    );
    const client = new Qtm4jClient();
    await client.configure(
      { getCache: () => undefined } as any,
      { api_key: "token" } as any,
    );
    expect(client.getAutomationApiKey()).toBe("array-auto-key");
  });
});
