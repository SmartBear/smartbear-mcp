import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  getProjectInfo,
  getReleasesCycles,
} from "../../../../qmetry/client/project.js";

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

describe("getReleasesCycles", () => {
  const token = "fake-token";
  const baseUrl = "https://qmetry.example";
  const projectKey = "TEST_PROJECT";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should call fetch with correct URL and headers for default behavior (showArchive: false)", async () => {
    const mockResponse = {
      text: ".",
      children: [
        {
          projID: 12997,
          type: "Test Project",
          isArchived: false,
          children: [
            {
              relID: 75414,
              type: "Default Release",
              isArchived: false,
              children: [
                {
                  cyclID: 176734,
                  type: "Default Cycle",
                  isArchived: false,
                },
              ],
            },
          ],
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getReleasesCycles(token, baseUrl, projectKey);

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/admin/scope/tree`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: token,
          project: projectKey,
          "Content-Type": "application/json",
          "User-Agent": expect.stringContaining("SmartBear MCP Server"),
        }),
        body: JSON.stringify({ showArchive: false }),
      }),
    );

    expect(result).toEqual(mockResponse);
  });

  it("should call fetch with showArchive: true when explicitly provided", async () => {
    const mockResponse = {
      text: ".",
      children: [
        {
          projID: 12997,
          type: "Test Project",
          isArchived: false,
          children: [
            {
              relID: 75414,
              type: "Default Release",
              isArchived: false,
              children: [
                {
                  cyclID: 176734,
                  type: "Default Cycle",
                  isArchived: false,
                },
              ],
            },
            {
              relID: 75415,
              type: "Archived Release",
              isArchived: true,
              children: [
                {
                  cyclID: 176735,
                  type: "Archived Cycle",
                  isArchived: true,
                },
              ],
            },
          ],
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getReleasesCycles(token, baseUrl, projectKey, {
      showArchive: true,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/admin/scope/tree`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: token,
          project: projectKey,
          "Content-Type": "application/json",
          "User-Agent": expect.stringContaining("SmartBear MCP Server"),
        }),
        body: JSON.stringify({ showArchive: true }),
      }),
    );

    expect(result).toEqual(mockResponse);
  });

  it("should call fetch with showArchive: false when explicitly provided", async () => {
    const mockResponse = {
      text: ".",
      children: [
        {
          projID: 12997,
          type: "Test Project",
          isArchived: false,
          children: [
            {
              relID: 75414,
              type: "Default Release",
              isArchived: false,
              children: [
                {
                  cyclID: 176734,
                  type: "Default Cycle",
                  isArchived: false,
                },
              ],
            },
          ],
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getReleasesCycles(token, baseUrl, projectKey, {
      showArchive: false,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/admin/scope/tree`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: token,
          project: projectKey,
          "Content-Type": "application/json",
          "User-Agent": expect.stringContaining("SmartBear MCP Server"),
        }),
        body: JSON.stringify({ showArchive: false }),
      }),
    );

    expect(result).toEqual(mockResponse);
  });

  it("should use default project key when not provided", async () => {
    const mockResponse = {
      text: ".",
      children: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await getReleasesCycles(token, baseUrl);

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/admin/scope/tree`,
      expect.objectContaining({
        headers: expect.objectContaining({
          project: "default", // from QMETRY_DEFAULTS
        }),
      }),
    );
  });

  it("should use default base URL when not provided", async () => {
    const mockResponse = {
      text: ".",
      children: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await getReleasesCycles(token, "", projectKey);

    expect(global.fetch).toHaveBeenCalledWith(
      "https://testmanagement.qmetry.com/rest/admin/scope/tree", // from QMETRY_DEFAULTS
      expect.objectContaining({
        method: "POST",
      }),
    );
  });

  it("should handle empty payload object", async () => {
    const mockResponse = {
      text: ".",
      children: [],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getReleasesCycles(token, baseUrl, projectKey, {});

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/admin/scope/tree`,
      expect.objectContaining({
        body: JSON.stringify({ showArchive: false }), // default behavior
      }),
    );

    expect(result).toEqual(mockResponse);
  });

  it("should throw error on non-OK response", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    await expect(getReleasesCycles(token, baseUrl, projectKey)).rejects.toThrow(
      /QMetry API Authentication Failed/,
    );
  });

  it("should handle network errors", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await expect(getReleasesCycles(token, baseUrl, projectKey)).rejects.toThrow(
      "Network error",
    );
  });

  it("should handle complex hierarchical response data", async () => {
    const mockResponse = {
      text: ".",
      children: [
        {
          projID: 15266,
          type: "VK Testi",
          isArchived: false,
          isLocked: false,
          iconCls: "ad-project-ico",
          expanded: true,
          children: [
            {
              relID: 111840,
              type: "release 1",
              isLocked: false,
              scope: "release",
              isArchived: false,
              iconCls: "ad-release-ico",
              expanded: true,
              children: [
                {
                  cyclID: 226970,
                  type: "Default Cycle",
                  isLocked: false,
                  scope: "cycle",
                  isArchived: false,
                  iconCls: "ad-cycle-ico",
                  leaf: true,
                },
                {
                  cyclID: 226972,
                  type: "My_Cycle1.1",
                  isLocked: false,
                  scope: "cycle",
                  isArchived: false,
                  iconCls: "ad-cycle-ico",
                  leaf: true,
                },
              ],
            },
          ],
        },
      ],
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getReleasesCycles(token, baseUrl, projectKey, {
      showArchive: false,
    });

    expect(result).toEqual(mockResponse);
    expect((result as any).children[0].children[0].children).toHaveLength(2);
    expect((result as any).children[0].children[0].type).toBe("release 1");
  });
});
