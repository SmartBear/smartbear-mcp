import { describe, expect, it, vi } from "vitest";
import { ZephyrClient } from "../../../zephyr/client";

describe("ZephyrClient", () => {
  it("should initialize with default name and prefix", () => {
    const client = new ZephyrClient("token");
    expect(client.name).toBe("Zephyr Test Management for Jira");
    expect(client.prefix).toBe("zephyr");
  });

  it("should register tools and call handler", async () => {
    const register = vi.fn();
    const getInput = vi.fn();
    const client = new ZephyrClient("token");
    client["projectTools"].getProjects = vi
      .fn()
      .mockResolvedValue({ foo: "bar" });
    client.registerTools(register, getInput);
    expect(register).toHaveBeenCalled();
    // Simulate handler call
    const toolDef = register.mock.calls[0][0];
    const handler = register.mock.calls[0][1];
    const result = await handler({ maxResults: 5, startAt: 1 }, {});
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify({ foo: "bar" }) }],
    });
  });
});
