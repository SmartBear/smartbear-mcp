import { describe, expect, it, vi } from "vitest";
import { AuthService } from "../../../../zephyr/common/auth-service";

vi.mock("../../../../common/config.js", async () => {
  const actual = await vi.importActual("../../../../common/config.js");
  return {
    ...actual,
    getUserAgent: vi.fn().mockReturnValue("smartbear-mcp-server/1.0.0"),
  };
});

describe("AuthService", () => {
  it("should trim and store the bearer token", () => {
    const service = new AuthService("  token  ");
    expect(service.bearerToken).toBe("token");
  });

  it("should return correct auth headers", () => {
    const token = "abc123";
    const service = new AuthService(token);
    const headers = service.getAuthHeaders();
    expect(headers).toEqual({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": `smartbear-mcp-server/1.0.0`,
      "zscale-source": "smartbear-mcp",
    });
  });
});
