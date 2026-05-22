import { describe, expect, it } from "vitest";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../../../../common/info";
import {
  CONTENT_TYPES,
  HTTP_HEADERS,
} from "../../../../qtm4j/config/constants";
import { AuthService } from "../../../../qtm4j/http/auth-service";

describe("AuthService", () => {
  it("should create instance with api key", () => {
    const authService = new AuthService("test-api-key");
    expect(authService).toBeInstanceOf(AuthService);
  });

  it("should trim whitespace from api key", () => {
    const authService = new AuthService("  test-api-key  ");
    const headers = authService.getAuthHeaders();
    expect(headers[HTTP_HEADERS.API_KEY]).toBe("test-api-key");
  });

  it("should return auth headers with api key", () => {
    const authService = new AuthService("test-api-key-123");
    const headers = authService.getAuthHeaders();

    expect(headers[HTTP_HEADERS.API_KEY]).toBe("test-api-key-123");
    expect(headers[HTTP_HEADERS.CONTENT_TYPE]).toBe(CONTENT_TYPES.JSON);
    expect(headers[HTTP_HEADERS.USER_AGENT]).toBe(
      `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
    );
    expect(headers[HTTP_HEADERS.ACCEPT]).toBe(CONTENT_TYPES.JSON);
  });

  it("should include all required headers", () => {
    const authService = new AuthService("my-key");
    const headers = authService.getAuthHeaders();

    expect(headers).toHaveProperty(HTTP_HEADERS.API_KEY);
    expect(headers).toHaveProperty(HTTP_HEADERS.CONTENT_TYPE);
    expect(headers).toHaveProperty(HTTP_HEADERS.USER_AGENT);
    expect(headers).toHaveProperty(HTTP_HEADERS.ACCEPT);
  });
});
