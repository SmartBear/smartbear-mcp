import { describe, expect, it, vi } from "vitest";
import { ToolError } from "../../../../common/tools";
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

  it("should handle fetch errors when post", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    await expect(apiClient.post("/testcases", {})).rejects.toThrow(
      "Network error",
    );
  });

  it("should fetch and return JSON", async () => {
    const mockJson = { foo: "bar" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => mockJson,
    });
    const result = await apiClient.get("/projects");
    expect(result).toEqual(mockJson);
  });

  it("should fetch and return JSON when post", async () => {
    const mockJson = { id: 1, key: "SA-T1" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => mockJson,
    });
    const result = await apiClient.post("/testcases", {
      name: "Test Case",
      projectKey: "SA",
    });
    expect(result).toEqual(mockJson);
  });

  it("should fetch with appropriate content header and body when post", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => {},
    });
    global.fetch = fetchMock;
    await apiClient.post("/testcases", { name: "Test Case", projectKey: "SA" });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ name: "Test Case", projectKey: "SA" }),
      }),
    );
  });

  it("should handle failing requests", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => "Unauthorized",
    });
    await expect(apiClient.get("/projects")).rejects.toThrow(
      new ToolError("Request failed with status 401: Unauthorized"),
    );
  });

  it("should handle failing requests when post", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: () => "Unauthorized",
    });
    await expect(
      apiClient.post("/testcases", { name: "Test Case", projectKey: "SA" }),
    ).rejects.toThrow(
      new ToolError("Request failed with status 401: Unauthorized"),
    );
  });
});
