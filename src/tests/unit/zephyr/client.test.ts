import { describe, expect, it, vi } from "vitest";
import { ZephyrClient } from "../../../zephyr/client";
import { ApiClient } from "../../../zephyr/common/api-client";

describe("ZephyrClient", () => {
  it("should set name and prefix", () => {
    const client = new ZephyrClient("token");
    expect(client.name).toBe("Zephyr");
    expect(client.prefix).toBe("zephyr");
  });

  it("should initialize ApiClient with default baseUrl", () => {
    const client = new ZephyrClient("token");
    expect(client.apiClient).toBeInstanceOf(ApiClient);
  });

  it("should initialize ApiClient with custom baseUrl", () => {
    const client = new ZephyrClient("token", "http://custom");
    expect(client.apiClient).toBeInstanceOf(ApiClient);
  });

  it("should register tools and call register", () => {
    const client = new ZephyrClient("token");
    const register = vi.fn();
    const getInput = vi.fn();
    client.registerTools(register, getInput);
    expect(register).toHaveBeenCalled();
    expect(register.mock.calls[0][0].title).toBe("Get Projects");
  });
});
