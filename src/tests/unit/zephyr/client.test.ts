import { describe, expect, it, vi } from "vitest";
import { ZephyrClient } from "../../../zephyr/client";
import { ApiClient } from "../../../zephyr/common/api-client";

describe("ZephyrClient", () => {
  it("should set name and prefix", () => {
    const client = new ZephyrClient();
    expect(client.name).toBe("Zephyr");
    expect(client.toolPrefix).toBe("zephyr");
    expect(client.configPrefix).toBe("Zephyr");
  });

  it("should initialize ApiClient with default baseUrl", async () => {
    const client = new ZephyrClient();
    await client.configure({} as any, { api_token: "token" });
    expect(client.getApiClient()).toBeInstanceOf(ApiClient);
  });

  it("should initialize ApiClient with custom baseUrl", async () => {
    const client = new ZephyrClient();
    await client.configure({} as any, {
      api_token: "token",
      base_url: "http://custom",
    });
    expect(client.getApiClient()).toBeInstanceOf(ApiClient);
  });

  it("should register tools and call register", async () => {
    const client = new ZephyrClient();
    await client.configure({} as any, { api_token: "token" });
    const register = vi.fn();
    const getInput = vi.fn();
    client.registerTools(register, getInput);
    expect(register).toHaveBeenCalled();
    expect(register.mock.calls[0][0].title).toBe("Get Projects");
  });
});
