import { beforeEach, describe, expect, it, vi } from "vitest";
import { getProjectInfo } from "../../../../qmetry/client/project.js";

describe("getProjectInfo", () => {
  const token = "fake-token";
  const baseUrl = "https://qmetry.example";
  const projectKey = "TEST_PROJECT";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should call fetch with correct URL and headers", async () => {
    const mockResponse = { id: 1, name: "Project A" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getProjectInfo(token, baseUrl, projectKey);

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/admin/project/getinfo`,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          apikey: token,
          project: projectKey,
          "User-Agent": expect.stringContaining("SmartBear MCP Server"),
        }),
      }),
    );

    expect(result).toEqual(mockResponse);
  });

  it("should throw error on non-OK response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Server error",
    });

    await expect(getProjectInfo(token, baseUrl, projectKey)).rejects.toThrow(
      /QMetry API request failed \(500\)/,
    );
  });

  it("should use default project key when not provided", async () => {
    const mockResponse = { id: 2, name: "Default Project" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await getProjectInfo(token, baseUrl);

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/admin/project/getinfo`,
      expect.objectContaining({
        headers: expect.objectContaining({
          project: "default", // from QMETRY_DEFAULTS
        }),
      }),
    );
  });
});
