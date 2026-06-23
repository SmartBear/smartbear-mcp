import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../../../../common/tools";
import { ApiClient } from "../../../../qtm4j/http/api-client";

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

  it("should return empty object for empty text response", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => "   ",
    });

    const client = new ApiClient("token", "https://api.example.com");
    const result = await client.get("/endpoint");

    expect(result).toEqual({});
  });

  it("should return wrapped text for non-JSON response", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => "100" },
      text: async () => "plain text response",
    });

    const client = new ApiClient("token", "https://api.example.com");
    const result = await client.get("/endpoint");

    expect(result).toEqual({ data: "plain text response" });
  });

  it("should return empty object for 204 No Content by status check", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: { get: () => null },
      text: async () => "",
    });

    const client = new ApiClient("token", "https://api.example.com");
    const result = await client.get("/endpoint");

    expect(result).toEqual({});
  });

  it("skipAnalytics() returns new ApiClient instance", () => {
    const client = new ApiClient("token", "https://api.example.com");
    const skipped = client.skipAnalytics();

    expect(skipped).toBeInstanceOf(ApiClient);
    expect(skipped).not.toBe(client);
  });

  it("skipAnalytics() instance sends skipAnalytics: true in headers", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => "10" },
      text: async () => "{}",
    });

    const client = new ApiClient("token", "https://api.example.com");
    const skipped = client.skipAnalytics();
    await skipped.get("/endpoint");

    const calledHeaders = (global.fetch as any).mock.calls[0][1].headers;
    expect(calledHeaders).toMatchObject({ "X-Skip-Tracking": "true" });
  });

  it("regular client sends skipAnalytics: false in headers", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => "10" },
      text: async () => "{}",
    });

    const client = new ApiClient("token", "https://api.example.com");
    await client.get("/endpoint");

    const calledHeaders = (global.fetch as any).mock.calls[0][1].headers;
    expect(calledHeaders).toMatchObject({ "X-Skip-Tracking": "false" });
  });

  it("should throw ToolError when automation token is not available", () => {
    const client = new ApiClient("token", "https://api.example.com");

    expect(() => {
      (client as any).getAutomationHeaders();
    }).toThrow(ToolError);
  });

  it("should perform successful getAutomation request", async () => {
    const mockResponse = { data: [] };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => "10" },
      text: async () => JSON.stringify(mockResponse),
    });

    const client = new ApiClient(
      "token",
      "https://api.example.com",
      () => "automation-key",
    );
    const result = await client.getAutomation("/automation", { page: 1 });

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("page=1"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("should perform successful postAutomation request", async () => {
    const mockResponse = { trackingId: "abc-123" };
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => "20" },
      text: async () => JSON.stringify(mockResponse),
    });

    const client = new ApiClient(
      "token",
      "https://api.example.com",
      () => "automation-key",
    );
    const result = await client.postAutomation("/import", { format: "junit" });

    expect(result).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/import"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("should perform successful delete request", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 204,
      headers: { get: () => null },
      text: async () => "",
    });

    const client = new ApiClient("token", "https://api.example.com");
    const result = await client.delete("/resource/1");

    expect(result).toEqual({});
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/resource/1"),
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("should perform delete request with body", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => "10" },
      text: async () => "{}",
    });

    const client = new ApiClient("token", "https://api.example.com");
    await client.delete("/resource/1", { ids: [1, 2] });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ body: JSON.stringify({ ids: [1, 2] }) }),
    );
  });

  it("should perform successful uploadFileMultipart request", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      status: 200,
    });

    const client = new ApiClient("token", "https://api.example.com");
    await expect(
      client.uploadFileMultipart(
        "https://s3.example.com/upload",
        Buffer.from("data"),
      ),
    ).resolves.not.toThrow();
  });

  it("should throw ToolError when uploadFileMultipart returns non-ok response", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 403,
      text: async () => "Request has expired",
    });

    const client = new ApiClient("token", "https://api.example.com");
    await expect(
      client.uploadFileMultipart(
        "https://s3.example.com/upload",
        Buffer.from("data"),
      ),
    ).rejects.toThrow(ToolError);
  });
});
