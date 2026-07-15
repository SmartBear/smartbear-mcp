// biome-ignore-all lint/performance/useTopLevelRegex: each regex here is a one-off assertion matcher used once per test; hoisting dozens of single-use patterns would hurt readability without any real perf benefit

import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  createCycle,
  createRelease,
  getBuilds,
  getPlatforms,
  getProjectInfo,
  getReleasesCycles,
  updateCycle,
} from "../client/project.ts";

describe("getProjectInfo", () => {
  const token = "fake-token";
  const baseUrl = "https://qmetry.example";
  const projectKey = "TEST_PROJECT";

  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("should call fetch with correct URL and headers", async () => {
    const mockResponse = { id: 1, name: "Project A" };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getProjectInfo(token, baseUrl, projectKey);

    expect(globalThis.fetch).toHaveBeenCalledWith(
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
    globalThis.fetch = vi.fn().mockResolvedValue({
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
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await getProjectInfo(token, baseUrl);

    expect(globalThis.fetch).toHaveBeenCalledWith(
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
          projID: 12_997,
          type: "Test Project",
          isArchived: false,
          children: [
            {
              relID: 75_414,
              type: "Default Release",
              isArchived: false,
              children: [
                {
                  cyclID: 176_734,
                  type: "Default Cycle",
                  isArchived: false,
                },
              ],
            },
          ],
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getReleasesCycles(token, baseUrl, projectKey);

    expect(globalThis.fetch).toHaveBeenCalledWith(
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
          projID: 12_997,
          type: "Test Project",
          isArchived: false,
          children: [
            {
              relID: 75_414,
              type: "Default Release",
              isArchived: false,
              children: [
                {
                  cyclID: 176_734,
                  type: "Default Cycle",
                  isArchived: false,
                },
              ],
            },
            {
              relID: 75_415,
              type: "Archived Release",
              isArchived: true,
              children: [
                {
                  cyclID: 176_735,
                  type: "Archived Cycle",
                  isArchived: true,
                },
              ],
            },
          ],
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getReleasesCycles(token, baseUrl, projectKey, {
      showArchive: true,
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
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
          projID: 12_997,
          type: "Test Project",
          isArchived: false,
          children: [
            {
              relID: 75_414,
              type: "Default Release",
              isArchived: false,
              children: [
                {
                  cyclID: 176_734,
                  type: "Default Cycle",
                  isArchived: false,
                },
              ],
            },
          ],
        },
      ],
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getReleasesCycles(token, baseUrl, projectKey, {
      showArchive: false,
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
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

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await getReleasesCycles(token, baseUrl);

    expect(globalThis.fetch).toHaveBeenCalledWith(
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

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    await getReleasesCycles(token, "", projectKey);

    expect(globalThis.fetch).toHaveBeenCalledWith(
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

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getReleasesCycles(token, baseUrl, projectKey, {});

    expect(globalThis.fetch).toHaveBeenCalledWith(
      `${baseUrl}/rest/admin/scope/tree`,
      expect.objectContaining({
        body: JSON.stringify({ showArchive: false }), // default behavior
      }),
    );

    expect(result).toEqual(mockResponse);
  });

  it("should throw error on non-OK response", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () => "Unauthorized",
    });

    await expect(getReleasesCycles(token, baseUrl, projectKey)).rejects.toThrow(
      /QMetry API Authentication Failed/,
    );
  });

  it("should handle network errors", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    await expect(getReleasesCycles(token, baseUrl, projectKey)).rejects.toThrow(
      "Network error",
    );
  });

  it("should handle complex hierarchical response data", async () => {
    const mockResponse = {
      text: ".",
      children: [
        {
          projID: 15_266,
          type: "VK Testi",
          isArchived: false,
          isLocked: false,
          iconCls: "ad-project-ico",
          expanded: true,
          children: [
            {
              relID: 111_840,
              type: "release 1",
              isLocked: false,
              scope: "release",
              isArchived: false,
              iconCls: "ad-release-ico",
              expanded: true,
              children: [
                {
                  cyclID: 226_970,
                  type: "Default Cycle",
                  isLocked: false,
                  scope: "cycle",
                  isArchived: false,
                  iconCls: "ad-cycle-ico",
                  leaf: true,
                },
                {
                  cyclID: 226_972,
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

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getReleasesCycles(token, baseUrl, projectKey, {
      showArchive: false,
    });

    interface ScopeTreeNode {
      type?: string;
      children?: ScopeTreeNode[];
    }
    const typedResult = result as ScopeTreeNode;

    expect(result).toEqual(mockResponse);
    expect(typedResult.children?.[0].children?.[0].children).toHaveLength(2);
    expect(typedResult.children?.[0].children?.[0].type).toBe("release 1");
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
          buildID: 12_345,
          name: "Build 1.0",
          isArchived: false,
          createdDate: "01-01-2024 10:00:00",
          createdBy: "developer",
          projectID: 4811,
        },
      ],
      total: 1,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getBuilds(token, baseUrl, projectKey, {});

    expect(globalThis.fetch).toHaveBeenCalledWith(
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
          buildID: 12_346,
          name: "Build 2.0",
          isArchived: true,
          createdDate: "02-01-2024 10:00:00",
          createdBy: "developer",
          projectID: 4811,
        },
      ],
      total: 1,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const customPayload = {
      start: 10,
      limit: 20,
      page: 2,
      // biome-ignore lint/security/noSecrets: high-entropy false positive; this is a descriptive string (error message, parameter name, or API action name), not a credential
      filter: '[{"value":[1],"type":"list","field":"isArchived"}]',
    };

    const result = await getBuilds(token, baseUrl, projectKey, customPayload);

    expect(globalThis.fetch).toHaveBeenCalledWith(
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
    const [, requestInit] = (globalThis.fetch as Mock).mock.calls[0];
    const body = JSON.parse(requestInit.body);
    expect(body).toMatchObject({
      start: 10,
      limit: 20,
      page: 2,
      // biome-ignore lint/security/noSecrets: high-entropy false positive; this is a descriptive string (error message, parameter name, or API action name), not a credential
      filter: '[{"value":[1],"type":"list","field":"isArchived"}]',
    });

    expect(result).toEqual(mockResponse);
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
          platformID: 18_994,
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

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const result = await getPlatforms(token, baseUrl, projectKey, {});

    expect(globalThis.fetch).toHaveBeenCalledWith(
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
    const [, requestInit] = (globalThis.fetch as Mock).mock.calls[0];
    const body = JSON.parse(requestInit.body);
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
          platformID: 15_139,
          name: "Mac Pro",
          isPlatformArchived: true,
          createdDate: "15-05-2020 00:29:40",
          createdBy: "afzal.ansari",
          projectID: 4811,
        },
      ],
      total: 1,
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const customPayload = {
      start: 0,
      limit: 25,
      page: 1,
      sort: '[{"property":"platformID","direction":"DESC"}]',
      // biome-ignore lint/security/noSecrets: high-entropy false positive; this is a descriptive string (error message, parameter name, or API action name), not a credential
      filter: '[{"value":[1],"type":"list","field":"isArchived"}]',
    };

    const result = await getPlatforms(
      token,
      baseUrl,
      projectKey,
      customPayload,
    );

    expect(globalThis.fetch).toHaveBeenCalledWith(
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
    const [, requestInit] = (globalThis.fetch as Mock).mock.calls[0];
    const body = JSON.parse(requestInit.body);
    expect(body).toMatchObject({
      start: 0,
      limit: 25,
      page: 1,
      sort: '[{"property":"platformID","direction":"DESC"}]',
      // biome-ignore lint/security/noSecrets: high-entropy false positive; this is a descriptive string (error message, parameter name, or API action name), not a credential
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
      releaseID: 12_345,
      message: "Release created successfully",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
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

    const [, requestInit] = (globalThis.fetch as Mock).mock.calls[0];
    const body = JSON.parse(requestInit.body);
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
        // biome-ignore lint/suspicious/noExplicitAny: intentionally invalid input to exercise the missing-name validation error
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
      cycleID: 67_890,
      message: "Cycle created successfully",
    };

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const payload = {
      cycle: {
        name: "Sprint 2",
        startDate: "01-02-2024",
        targetDate: "15-02-2024",
        releaseID: 12_345,
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
        // biome-ignore lint/suspicious/noExplicitAny: intentionally invalid input to exercise the missing-name validation error
        name: undefined as any,
        releaseID: 12_345,
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

    const [, requestInit] = (globalThis.fetch as Mock).mock.calls[0];
    const body = JSON.parse(requestInit.body);
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
        // biome-ignore lint/suspicious/noExplicitAny: intentionally invalid input to exercise the missing-buildID validation error
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
