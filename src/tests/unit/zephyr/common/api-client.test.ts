import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "../../../../zephyr/common/api-client";
import { AuthService } from "../../../../zephyr/common/auth-service";

describe("ApiClient", () => {
  const token = "test-token";
  const baseUrl = "https://api.zephyrscale.smartbear.com/v2";
  const apiClient = new ApiClient(token, baseUrl);

  it("should initialize with trimmed baseUrl and default headers", () => {
    const apiClient = new ApiClient(token, "https://a.url.com/");
    expect(apiClient.baseUrl).toBe("https://a.url.com");
    expect(apiClient.defaultHeaders).toEqual(
      new AuthService(token).getAuthHeaders(),
    );
  });

  it("should build correct URL with params", () => {
    const url = apiClient.getUrl("/projects", { maxResults: 5, startAt: 1 });
    expect(url).toBe(`${baseUrl}/projects?maxResults=5&startAt=1`);
  });

  it("should build correct URL with undefined params", () => {
    const url = apiClient.getUrl("/projects", { maxResults: undefined });
    expect(url).toBe(`${baseUrl}/projects`);
  });

  it("should build correct URL with boolean and number params", () => {
    const url = apiClient.getUrl("/testexecutions", {
      onlyLastExecutions: true,
      limit: 2,
    });
    expect(url).toBe(
      `${baseUrl}/testexecutions?onlyLastExecutions=true&limit=2`,
    );
  });

  it("should build correct URL with no params", () => {
    const url = apiClient.getUrl("/projects");
    expect(url).toBe(`${baseUrl}/projects`);
  });

  it("should handle fetch errors", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    await expect(apiClient.get("/projects")).rejects.toThrow("Network error");
  });

  it("should fetch and return JSON", async () => {
    const mockJson = { foo: "bar" };
    global.fetch = vi.fn().mockResolvedValue({ json: () => mockJson });
    const result = await apiClient.get("/projects");
    expect(result).toEqual(mockJson);
  });

  it("should handle fetch returning non-JSON", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      json: () => {
        throw new Error("Invalid JSON");
      },
    });
    await expect(apiClient.get("/projects")).rejects.toThrow("Invalid JSON");
  });
});
