import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCycle,
  createRelease,
  getApiQuotaStatus,
  getBuilds,
  getPlatforms,
  getProjectInfo,
  getReleasesCycles,
  rankProjectSuggestions,
  resolveProjectFromInfo,
  suggestProjects,
  updateCycle,
} from "../client/project.js";

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
      text: async () => JSON.stringify(mockResponse),
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
      /QMetry API error 500: Server error/,
    );
  });

  it("should use default project key when not provided", async () => {
    const mockResponse = { id: 2, name: "Default Project" };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      text: async () => JSON.stringify(mockResponse),
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
      text: async () => JSON.stringify(mockResponse),
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
      text: async () => JSON.stringify(mockResponse),
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
      text: async () => JSON.stringify(mockResponse),
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
      text: async () => JSON.stringify(mockResponse),
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
      text: async () => JSON.stringify(mockResponse),
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
      text: async () => JSON.stringify(mockResponse),
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
      /QMetry API error 401/,
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
      text: async () => JSON.stringify(mockResponse),
    });

    const result = await getReleasesCycles(token, baseUrl, projectKey, {
      showArchive: false,
    });

    expect(result).toEqual(mockResponse);
    expect((result as any).children[0].children[0].children).toHaveLength(2);
    expect((result as any).children[0].children[0].type).toBe("release 1");
  });
});

describe("getBuilds", () => {
  const token = "fake-token";
  const baseUrl = "https://qmetry.example";
  const projectKey = "TEST_PROJECT";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should call fetch with correct URL and headers for default payload", async () => {
    const mockResponse = {
      data: [
        {
          buildID: 12345,
          name: "Build 1.0",
          isArchived: false,
          createdDate: "01-01-2024 10:00:00",
          createdBy: "developer",
          projectID: 4811,
        },
      ],
      total: 1,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      text: async () => JSON.stringify(mockResponse),
    });

    const result = await getBuilds(token, baseUrl, projectKey, {});

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/admin/drop/list`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: token,
          project: projectKey,
          "Content-Type": "application/json",
          "User-Agent": expect.stringMatching(/SmartBear MCP Server/),
        }),
        body: expect.stringContaining('"start":0'),
      }),
    );

    expect(result).toEqual(mockResponse);
  });

  it("should call fetch with custom pagination and filter payload", async () => {
    const mockResponse = {
      data: [
        {
          buildID: 12346,
          name: "Build 2.0",
          isArchived: true,
          createdDate: "02-01-2024 10:00:00",
          createdBy: "developer",
          projectID: 4811,
        },
      ],
      total: 1,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      text: async () => JSON.stringify(mockResponse),
    });

    const customPayload = {
      start: 10,
      limit: 20,
      page: 2,
      filter: '[{"value":[1],"type":"list","field":"isArchived"}]',
    };

    const result = await getBuilds(token, baseUrl, projectKey, customPayload);

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/admin/drop/list`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: token,
          project: projectKey,
          "Content-Type": "application/json",
          "User-Agent": expect.stringMatching(/SmartBear MCP Server/),
        }),
        body: expect.stringContaining('"start":10'),
      }),
    );

    // Verify the body contains all the expected values
    const fetchCall = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body).toMatchObject({
      start: 10,
      limit: 20,
      page: 2,
      filter: '[{"value":[1],"type":"list","field":"isArchived"}]',
    });

    expect(result).toEqual(mockResponse);
  });
});

describe("getApiQuotaStatus", () => {
  const token = "fake-token";
  const baseUrl = "https://qmetry.example";
  const projectKey = "TEST_PROJECT";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should GET the quota status with scope 'default' header and no body", async () => {
    const mockResponse = {
      limitEnabled: true,
      hourly: {
        limit: 1000,
        consumed: 0,
        remaining: 1000,
        resetsAt: "2026-10-14T16:00:00Z",
      },
      daily: {
        limit: 10000,
        consumed: 128,
        remaining: 9872,
        resetsAt: "2026-10-15T00:00:00Z",
      },
      serverTime: "2026-10-14T15:09:47.857786253Z",
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      text: async () => JSON.stringify(mockResponse),
    });

    const result = await getApiQuotaStatus(token, baseUrl, projectKey, {});

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/admin/apiquota/status`,
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          apikey: token,
          scope: "default",
          "Content-Type": "application/json",
          "User-Agent": expect.stringMatching(/SmartBear MCP Server/),
        }),
      }),
    );
    const fetchCall = (global.fetch as any).mock.calls[0];
    expect(fetchCall[1].body).toBeUndefined();
    expect(result).toEqual(mockResponse);
  });

  it("should propagate API errors", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      json: async () => ({ message: "Invalid API key" }),
      text: async () => "Invalid API key",
    });

    await expect(
      getApiQuotaStatus(token, baseUrl, projectKey, {}),
    ).rejects.toThrow();
  });
});

describe("getPlatforms", () => {
  const token = "fake-token";
  const baseUrl = "https://qmetry.example";
  const projectKey = "TEST_PROJECT";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should call fetch with correct URL and headers for default payload", async () => {
    const mockResponse = {
      data: [
        {
          platformID: 18994,
          name: "Android",
          isPlatformArchived: false,
          createdDate: "16-02-2021 12:45:26",
          createdBy: "jatin",
          projectID: 4811,
          platformAttribute: " Language : CN, System Version : iOS 12",
        },
      ],
      total: 1,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      text: async () => JSON.stringify(mockResponse),
    });

    const result = await getPlatforms(token, baseUrl, projectKey, {});

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/admin/platform/list`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: token,
          project: projectKey,
          "Content-Type": "application/json",
          "User-Agent": expect.stringMatching(/SmartBear MCP Server/),
        }),
        body: expect.stringContaining('"start":0'),
      }),
    );

    // Verify the body contains the expected default values
    const fetchCall = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body).toMatchObject({
      start: 0,
      page: 1,
      limit: 10,
      filter: "[]",
      sort: expect.stringContaining("name"),
    });

    expect(result).toEqual(mockResponse);
  });

  it("should call fetch with custom sorting and archive filter payload", async () => {
    const mockResponse = {
      data: [
        {
          platformID: 15139,
          name: "Mac Pro",
          isPlatformArchived: true,
          createdDate: "15-05-2020 00:29:40",
          createdBy: "afzal.ansari",
          projectID: 4811,
        },
      ],
      total: 1,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      text: async () => JSON.stringify(mockResponse),
    });

    const customPayload = {
      start: 0,
      limit: 25,
      page: 1,
      sort: '[{"property":"platformID","direction":"DESC"}]',
      filter: '[{"value":[1],"type":"list","field":"isArchived"}]',
    };

    const result = await getPlatforms(
      token,
      baseUrl,
      projectKey,
      customPayload,
    );

    expect(global.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/admin/platform/list`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: token,
          project: projectKey,
          "Content-Type": "application/json",
          "User-Agent": expect.stringMatching(/SmartBear MCP Server/),
        }),
        body: expect.stringContaining('"start":0'),
      }),
    );

    // Verify the body contains all the expected values
    const fetchCall = (global.fetch as any).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body).toMatchObject({
      start: 0,
      limit: 25,
      page: 1,
      sort: '[{"property":"platformID","direction":"DESC"}]',
      filter: '[{"value":[1],"type":"list","field":"isArchived"}]',
    });

    expect(result).toEqual(mockResponse);
  });
});

describe("createRelease", () => {
  const token = "fake-token";
  const baseUrl = "https://qmetry.example";
  const projectKey = "TEST_PROJECT";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should call fetch with correct URL and headers for creating a release with cycle", async () => {
    const mockResponse = {
      success: true,
      releaseID: 12345,
      message: "Release created successfully",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      text: async () => JSON.stringify(mockResponse),
    });

    const payload = {
      release: {
        name: "Release 2.0",
        description: "Major release",
        startDate: "01-01-2024",
        targetDate: "31-03-2024",
      },
      cycle: {
        name: "Sprint 1",
        isLocked: false,
        isArchived: false,
      },
    };

    const result = await createRelease(token, baseUrl, projectKey, payload);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/admin/release`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: token,
          project: projectKey,
          "Content-Type": "application/json",
          "User-Agent": expect.stringMatching(/SmartBear MCP Server/),
        }),
      }),
    );

    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body).toMatchObject({
      release: {
        name: "Release 2.0",
        description: "Major release",
        startDate: "01-01-2024",
        targetDate: "31-03-2024",
      },
      cycle: {
        name: "Sprint 1",
        isLocked: false,
        isArchived: false,
      },
    });

    expect(result).toEqual(mockResponse);
  });

  it("should throw error when release name is missing", async () => {
    const payload = {
      release: {
        name: undefined as any,
      },
    };

    await expect(
      createRelease(token, baseUrl, projectKey, payload),
    ).rejects.toThrow(
      "[createRelease] Missing or invalid required parameter: 'release.name'",
    );
  });
});

describe("createCycle", () => {
  const token = "fake-token";
  const baseUrl = "https://qmetry.example";
  const projectKey = "TEST_PROJECT";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should call fetch with correct URL and headers for creating a cycle", async () => {
    const mockResponse = {
      success: true,
      cycleID: 67890,
      message: "Cycle created successfully",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      text: async () => JSON.stringify(mockResponse),
    });

    const payload = {
      cycle: {
        name: "Sprint 2",
        startDate: "01-02-2024",
        targetDate: "15-02-2024",
        releaseID: 12345,
      },
    };

    const result = await createCycle(token, baseUrl, projectKey, payload);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/admin/cycle`,
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          apikey: token,
          project: projectKey,
          "Content-Type": "application/json",
          "User-Agent": expect.stringMatching(/SmartBear MCP Server/),
        }),
      }),
    );

    expect(result).toEqual(mockResponse);
  });

  it("should throw error when cycle name is missing", async () => {
    const payload = {
      cycle: {
        name: undefined as any,
        releaseID: 12345,
      },
    };

    await expect(
      createCycle(token, baseUrl, projectKey, payload),
    ).rejects.toThrow(
      "[createCycle] Missing or invalid required parameter: 'cycle.name'",
    );
  });
});

describe("updateCycle", () => {
  const token = "fake-token";
  const baseUrl = "https://qmetry.example";
  const projectKey = "TEST_PROJECT";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should call fetch with correct URL and headers for updating a cycle", async () => {
    const mockResponse = {
      success: true,
      message: "Cycle updated successfully",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
      text: async () => JSON.stringify(mockResponse),
    });

    const payload = {
      cycle: {
        name: "Updated Sprint 2",
        buildID: 1494,
        releaseID: 3729,
      },
    };

    const result = await updateCycle(token, baseUrl, projectKey, payload);

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/admin/cycle`,
      expect.objectContaining({
        method: "PUT",
        headers: expect.objectContaining({
          apikey: token,
          project: projectKey,
          "Content-Type": "application/json",
          "User-Agent": expect.stringMatching(/SmartBear MCP Server/),
        }),
      }),
    );

    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body).toMatchObject({
      cycle: {
        name: "Updated Sprint 2",
        buildID: 1494,
        releaseID: 3729,
      },
    });

    expect(result).toEqual(mockResponse);
  });

  it("should throw error when buildID is missing", async () => {
    const payload = {
      cycle: {
        buildID: undefined as any,
        releaseID: 3729,
      },
    };

    await expect(
      updateCycle(token, baseUrl, projectKey, payload),
    ).rejects.toThrow(
      "[updateCycle] Missing or invalid required parameter: 'cycle.buildID'",
    );
  });
});

describe("getProjectInfo projects trimming", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  const respond = (body: unknown) => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => body,
      text: async () => JSON.stringify(body),
    });
  };

  it("trims each projects entry to {id, key, name}", async () => {
    respond({
      currentProjectId: 347,
      currentProjectName: "Pranshu Basic Test",
      projects: [
        {
          projectID: 347,
          projectKey: "8d7b",
          name: "Pranshu Basic Test",
          isArchived: false,
          latestViews: { TC: { viewId: 1 } },
        },
        { projectId: 192, key: "QT", projectName: "QTM--to--QTM4J" },
        { name: "no id or key" },
      ],
    });

    const result = await getProjectInfo(
      "t",
      "https://qmetry.example",
      "default",
    );

    expect(result.projects).toEqual([
      { id: 347, key: "8d7b", name: "Pranshu Basic Test" },
      { id: 192, key: "QT", name: "QTM--to--QTM4J" },
    ]);
    expect(result.currentProjectId).toBe(347);
  });

  it("leaves a response without projects unchanged", async () => {
    respond({ currentProjectId: 1 });
    const result = await getProjectInfo("t", "https://qmetry.example", "MAC");
    expect(result).toEqual({ currentProjectId: 1 });
  });
});

describe("resolveProjectFromInfo", () => {
  const info = {
    currentProjectId: 347,
    currentProjectName: "Pranshu Basic Test",
    projects: [
      { id: 347, key: "8d7b", name: "Pranshu Basic Test" },
      { id: 192, key: "QT", name: "QTM--to--QTM4J" },
    ],
  };

  it("reports the selected project for 'default'", () => {
    expect(resolveProjectFromInfo(info, "default")).toEqual({
      key: "8d7b",
      id: 347,
      name: "Pranshu Basic Test",
      source: "qmetry-selected",
    });
  });

  it("treats a missing key like 'default'", () => {
    expect(resolveProjectFromInfo(info, undefined).source).toBe(
      "qmetry-selected",
    );
  });

  it("marks an explicit key as explicit", () => {
    expect(
      resolveProjectFromInfo(
        {
          ...info,
          currentProjectId: 192,
          currentProjectName: "QTM--to--QTM4J",
        },
        "QT",
      ),
    ).toEqual({
      key: "QT",
      id: 192,
      name: "QTM--to--QTM4J",
      source: "explicit",
    });
  });

  it("matches ids given as strings", () => {
    expect(
      resolveProjectFromInfo({ ...info, currentProjectId: "347" }, "default")
        .key,
    ).toBe("8d7b");
  });

  it("omits the key when the selected project is not in projects", () => {
    expect(
      resolveProjectFromInfo({ ...info, currentProjectId: 999 }, "default"),
    ).toEqual({
      id: 999,
      name: "Pranshu Basic Test",
      source: "qmetry-selected",
    });
  });

  it("falls back to an explicit key when projects has no match", () => {
    expect(resolveProjectFromInfo({ currentProjectId: 5 }, "MAC")).toEqual({
      key: "MAC",
      id: 5,
      source: "explicit",
    });
  });
});

describe("rankProjectSuggestions", () => {
  const projects = [
    { id: 192, key: "QT", name: "QTM--to--QTM4J" },
    { id: 347, key: "8d7b", name: "Pranshu Basic Test" },
    { id: 1, key: "MAC", name: "Mac Project" },
    { id: 2, key: "QMTX", name: "Other" },
  ];

  it("ranks a case-insensitive exact key or name first", () => {
    expect(rankProjectSuggestions("mac", projects)[0].key).toBe("MAC");
    expect(rankProjectSuggestions("pranshu basic test", projects)[0].key).toBe(
      "8d7b",
    );
  });

  it("suggests close keys for a typo and drops unrelated ones", () => {
    const keys = rankProjectSuggestions("QMT", projects).map((p) => p.key);
    expect(keys).toContain("QT");
    expect(keys).toContain("QMTX");
    expect(keys).not.toContain("8d7b");
  });

  it("returns at most three suggestions", () => {
    const many = Array.from({ length: 10 }, (_, i) => ({
      id: i,
      key: `Q${i}`,
    }));
    expect(rankProjectSuggestions("Q", many)).toHaveLength(3);
  });

  it("returns nothing for an empty value", () => {
    expect(rankProjectSuggestions("  ", projects)).toEqual([]);
  });
});

describe("suggestProjects", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("reads active projects from the project list and ranks them", async () => {
    const body = {
      data: [
        { projectID: 192, projectKey: "QT", name: "QTM--to--QTM4J" },
        { projectID: 1, projectKey: "ZZZZZZ", name: "Unrelated" },
      ],
      total: 2,
    };
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => body,
      text: async () => JSON.stringify(body),
    });

    const result = await suggestProjects("t", "https://qmetry.example", "QMT");

    expect(result).toEqual([{ id: 192, key: "QT", name: "QTM--to--QTM4J" }]);
    expect(global.fetch).toHaveBeenCalledOnce();
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toBe("https://qmetry.example/rest/admin/project/list");
    expect(JSON.parse(init.body).params).toEqual({ showArchive: false });
  });

  it("pages through the list until it has every project", async () => {
    const page1 = {
      data: Array.from({ length: 100 }, (_, i) => ({
        projectID: i,
        projectKey: `P${i}`,
      })),
      total: 101,
    };
    const page2 = { data: [{ projectID: 500, projectKey: "QT" }], total: 101 };
    global.fetch = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => page1,
        text: async () => JSON.stringify(page1),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => page2,
        text: async () => JSON.stringify(page2),
      });

    const result = await suggestProjects("t", "https://qmetry.example", "QT");

    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(result[0].key).toBe("QT");
  });

  it("returns no suggestions when the lookup fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("down"));
    await expect(
      suggestProjects("t", "https://qmetry.example", "QMT"),
    ).resolves.toEqual([]);
  });
});
