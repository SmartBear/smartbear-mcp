import { describe, expect, it } from "vitest";
import { USER_AGENT } from "../../../common/info";
import { AuthService } from "../../common/auth-service";

describe("AuthService", () => {
  it("should trim and store the bearer token", () => {
    const service = new AuthService("  token  ");
    // biome-ignore lint/complexity/useLiteralKeys: Access for test purposes
    expect(service["bearerToken"]).toBe("token");
  });

  it("should return correct auth headers", () => {
    const token = "abc123";
    const service = new AuthService(token);
    const headers = service.getAuthHeaders();
    expect(headers).toEqual({
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
      "zscale-source": "smartbear-mcp",
    });
  });
});
