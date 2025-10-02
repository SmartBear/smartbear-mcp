import { beforeEach, describe, expect, it, vi } from "vitest";
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
    expect(url).toBe("https://api.zephyrscale.smartbear.com/v2/projects");
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
});
