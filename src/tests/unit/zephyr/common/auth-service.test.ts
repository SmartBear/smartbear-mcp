import { describe, expect, it } from "vitest";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../../../../common/info";
import { AuthService } from "../../../../zephyr/common/auth-service";

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
      "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
      "zscale-source": "smartbear-mcp",
    });
  });
});
