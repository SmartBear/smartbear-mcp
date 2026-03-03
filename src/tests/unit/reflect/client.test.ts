import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReflectClient } from "../../../reflect/client";

describe("ReflectClient", () => {
  let client: ReflectClient;

  beforeEach(() => {
    client = new ReflectClient();
  });

  it("should not be configured before configure()", () => {
    expect(client.isConfigured()).toBe(false);
  });

  it("should be configured after configure()", async () => {
    await client.configure({} as any, { api_token: "test-token" });
    expect(client.isConfigured()).toBe(true);
  });

  it("should expose api token after configure()", async () => {
    await client.configure({} as any, { api_token: "my-api-key" });
    expect(client.getApiToken()).toBe("my-api-key");
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
});
