import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../../common/tools";
import { ApiClient } from "../../http/api-client";

// Mock fetch globally
global.fetch = vi.fn();

describe("ApiClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create instance with string token", () => {
    const client = new ApiClient("test-token", "https://example.com");
    expect(client).toBeInstanceOf(ApiClient);
  });

  it("should create instance with token provider function", () => {
    const tokenProvider = () => "test-token";
    const client = new ApiClient(tokenProvider, "https://example.com");
    expect(client).toBeInstanceOf(ApiClient);
  });

  it("should trim trailing slash from baseUrl", () => {
    const client = new ApiClient("token", "https://example.com/");
    const url = client.getUrl("/endpoint");
    expect(url).toBe("https://example.com/endpoint");
  });

  it("should construct URL without query params", () => {
    const client = new ApiClient("token", "https://api.example.com");
    const url = client.getUrl("/projects");
    expect(url).toBe("https://api.example.com/projects");
  });

  it("should construct URL with query params", () => {
    const client = new ApiClient("token", "https://api.example.com");
    const url = client.getUrl("/projects", { maxResults: 10, startAt: 0 });
    expect(url).toContain("maxResults=10");
    expect(url).toContain("startAt=0");
  });

  it("should skip undefined query params", () => {
    const client = new ApiClient("token", "https://api.example.com");
    const url = client.getUrl("/projects", {
      maxResults: 10,
      search: undefined,
    });
    expect(url).toContain("maxResults=10");
    expect(url).not.toContain("search");
  });

  it("should handle boolean query params", () => {
    const client = new ApiClient("token", "https://api.example.com");
    const url = client.getUrl("/projects", { qmetryEnabled: true });
    expect(url).toContain("qmetryEnabled=true");
  });

  it("should throw error when token is not available", () => {
    const tokenProvider = () => null;
    const client = new ApiClient(tokenProvider, "https://api.example.com");

    expect(() => {
      // Access private method through any type
      (client as any).getHeaders();
    }).toThrow(ToolError);
  });

  it("should handle successful GET request", async () => {
    const mockResponse = { data: "test" };
    const mockText = JSON.stringify(mockResponse);
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => (name === "content-length" ? "100" : null),
      },
      text: async () => mockText,
      json: async () => mockResponse,
    });

    const client = new ApiClient("token", "https://api.example.com");
    const result = await client.get("/endpoint");

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/endpoint",
      expect.objectContaining({
        method: "GET",
        headers: expect.any(Object),
      }),
    );
  });

  it("should handle successful POST request", async () => {
    const mockResponse = { success: true };
    const requestBody = { name: "test" };
    const mockText = JSON.stringify(mockResponse);

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => (name === "content-length" ? "100" : null),
      },
      text: async () => mockText,
      json: async () => mockResponse,
    });

    const client = new ApiClient("token", "https://api.example.com");
    const result = await client.post("/endpoint", requestBody);

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/endpoint",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(requestBody),
      }),
    );
  });

  it("should handle successful PUT request", async () => {
    const mockResponse = { updated: true };
    const requestBody = { name: "updated" };
    const mockText = JSON.stringify(mockResponse);

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: {
        get: (name: string) => (name === "content-length" ? "100" : null),
      },
      text: async () => mockText,
      json: async () => mockResponse,
    });

    const client = new ApiClient("token", "https://api.example.com");
    const result = await client.put("/endpoint", requestBody);

    expect(result).toEqual(mockResponse);
  });

  it("should handle 204 No Content response", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: {
        get: (name: string) => (name === "content-length" ? "0" : null),
      },
      text: async () => "",
      json: async () => ({}),
    });

    const client = new ApiClient("token", "https://api.example.com");
    const result = await client.post("/endpoint", {});

    expect(result).toEqual({});
  });

  it("should throw ToolError on failed request", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 400,
      headers: {
        get: () => null,
      },
      text: async () => "Bad Request",
    });

    const client = new ApiClient("token", "https://api.example.com");

    await expect(client.get("/endpoint")).rejects.toThrow(ToolError);
  });

  it("should handle network errors", async () => {
    (global.fetch as any).mockRejectedValueOnce(new Error("Network error"));

    const client = new ApiClient("token", "https://api.example.com");

    await expect(client.get("/endpoint")).rejects.toThrow("Network error");
  });
});
