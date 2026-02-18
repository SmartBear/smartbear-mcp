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
      status: 200,
      headers: {
        get: (name: string) => {
          if (name === "content-type") return "application/json";
          if (name === "content-length") return "13";
          return null;
        },
      },
      text: () => Promise.resolve(JSON.stringify(mockJson)),
    });
    const result = await apiClient.get("/projects");
    expect(result).toEqual(mockJson);
  });

  it("should fetch and return JSON when post", async () => {
    const mockJson = { id: 1, key: "SA-T1" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => {
          if (name === "content-type") return "application/json";
          if (name === "content-length") return "20";
          return null;
        },
      },
      text: () => Promise.resolve(JSON.stringify(mockJson)),
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
      status: 200,
      headers: {
        get: (name: string) => {
          if (name === "content-type") return "application/json";
          if (name === "content-length") return "2";
          return null;
        },
      },
      text: () => Promise.resolve("{}"),
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

  it("should handle empty response body (204 No Content)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      headers: {
        get: (name: string) => {
          if (name === "content-length") return "0";
          return null;
        },
      },
      text: () => Promise.resolve(""),
    });
    const result = await apiClient.put("/testcases/SA-T10", {
      name: "Updated",
    });
    expect(result).toEqual({});
  });

  it("should handle empty response body with content-length 0", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => {
          if (name === "content-length") return "0";
          if (name === "content-type") return "application/json";
          return null;
        },
      },
      text: () => Promise.resolve(""),
    });
    const result = await apiClient.get("/testcases/SA-T10");
    expect(result).toEqual({});
  });

  it("should handle response with missing content-type header but valid JSON", async () => {
    const mockJson = { id: 1, key: "SA-T1" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => {
          if (name === "content-length") return "20";
          return null; // No content-type header
        },
      },
      text: () => Promise.resolve(JSON.stringify(mockJson)),
    });
    const result = await apiClient.get("/testcases/SA-T1");
    expect(result).toEqual(mockJson);
  });

  it("should handle non-JSON response gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => {
          if (name === "content-type") return "text/plain";
          if (name === "content-length") return "5";
          return null;
        },
      },
      text: () => Promise.resolve("Hello"),
    });
    const result = await apiClient.get("/health");
    expect(result).toEqual({ data: "Hello" });
  });
});
