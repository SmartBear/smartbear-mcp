import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { QmetryClient } from "./client";
import { TOOLS } from "./client/tools/index";

const fetchMock = createFetchMock(vi);

// Helper to create and configure a client
async function createConfiguredClient(
  apiKey = "fake-token",
  baseUrl = "https://qmetry.example",
): Promise<QmetryClient> {
  const client = new QmetryClient();
  await client.configure({} as any, {
    api_key: apiKey,
    base_url: baseUrl,
  });
  return client;
}

describe("QmetryClient", () => {
  let client: QmetryClient;

  beforeEach(async () => {
    vi.clearAllMocks();
    fetchMock.enableMocks();
    fetchMock.resetMocks();
    client = await createConfiguredClient();
  });

  afterEach(() => {
    fetchMock.disableMocks();
  });

  describe("constructor", () => {
    it("should initialize with correct parameters", async () => {
      const testClient = await createConfiguredClient(
        "fake-token",
        "https://qmetry.example",
      );
      expect(testClient).toBeInstanceOf(QmetryClient);
      expect(testClient.getBaseUrl()).toBe("https://qmetry.example");
      expect(testClient.getToken()).toBe("fake-token");
    });

    it("should store token and endpoint", () => {
      expect(client.getBaseUrl()).toBe("https://qmetry.example");
      expect(client.getToken()).toBe("fake-token");
    });
  });

  describe("getToken (OAuth & API Key authentication)", () => {
    it("should extract OAuth Bearer token from Authorization header", async () => {
      const testClient = await createConfiguredClient();
      const { requestContextStorage } = await import(
        "../common/request-context.js"
      );
      const result = requestContextStorage.run(
        { headers: { authorization: "Bearer oauth-qmetry-token-xyz" } },
        () => testClient.getToken(),
      );
      expect(result).toBe("oauth-qmetry-token-xyz");
    });

    it("should handle Bearer token with different casing", async () => {
      const testClient = await createConfiguredClient();
      const { requestContextStorage } = await import(
        "../common/request-context.js"
      );
      const result = requestContextStorage.run(
        { headers: { authorization: "Bearer TEST-TOKEN-123" } },
        () => testClient.getToken(),
      );
      expect(result).toBe("TEST-TOKEN-123");
    });

    it("should ignore Qmetry-Token header and fall back to configured token", async () => {
      const testClient = await createConfiguredClient();
      const { requestContextStorage } = await import(
        "../common/request-context.js"
      );
      const result = requestContextStorage.run(
        { headers: { "qmetry-token": "direct-api-key" } },
        () => testClient.getToken(),
      );
      expect(result).toBe("fake-token");
    });

    it("should ignore apikey header and fall back to configured token", async () => {
      const testClient = await createConfiguredClient();
      const { requestContextStorage } = await import(
        "../common/request-context.js"
      );
      const result = requestContextStorage.run(
        { headers: { apikey: "fallback-api-key" } },
        () => testClient.getToken(),
      );
      expect(result).toBe("fake-token");
    });

    it("should use configured token when no headers present", async () => {
      const testClient = await createConfiguredClient("configured-token");
      const { requestContextStorage } = await import(
        "../common/request-context.js"
      );
      const result = requestContextStorage.run({ headers: {} }, () =>
        testClient.getToken(),
      );
      expect(result).toBe("configured-token");
    });

    it("should throw when no token is available", async () => {
      const testClient = new QmetryClient();
      const { requestContextStorage } = await import(
        "../common/request-context.js"
      );
      expect(() =>
        requestContextStorage.run({ headers: {} }, () => testClient.getToken()),
      ).toThrow("Client not configured");
    });

    it("should prioritize Authorization Bearer over Qmetry-Token header", async () => {
      const testClient = await createConfiguredClient();
      const { requestContextStorage } = await import(
        "../common/request-context.js"
      );
      const result = requestContextStorage.run(
        {
          headers: {
            authorization: "Bearer oauth-token",
            "qmetry-token": "api-key",
          },
        },
        () => testClient.getToken(),
      );
      expect(result).toBe("oauth-token");
    });
  });

  describe("registerTools", () => {
    const mockRegister = vi.fn();
    const mockGetInput = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("registers all QMetry tools", async () => {
      await client.registerTools(mockRegister, mockGetInput);

      expect(mockRegister).toHaveBeenCalledTimes(TOOLS.length);
      expect(mockRegister.mock.calls[0][0].title).toBe(
        "Fetch QMetry list Projects",
      );
      expect(mockRegister.mock.calls[0][0].summary).toBe(
        "Fetch QMetry projects list including projectID, name, projectKey, isArchived and folderPath needed for other operations",
      );
    });

    it("registers tools with correct structure", async () => {
      await client.registerTools(mockRegister, mockGetInput);

      // Check that all registered tools have the expected structure
      const toolCalls = mockRegister.mock.calls;
      expect(toolCalls.length).toBe(TOOLS.length);

      toolCalls.forEach(([toolConfig, handler], _index) => {
        expect(toolConfig).toHaveProperty("title");
        expect(toolConfig).toHaveProperty("summary");
        expect(typeof toolConfig.title).toBe("string");
        expect(typeof toolConfig.summary).toBe("string");
        expect(typeof handler).toBe("function");
      });
    });

    it("should throw if register function is missing", async () => {
      // @ts-expect-error testing bad input
      await expect(client.registerTools(null, mockGetInput)).rejects.toThrow(
        "register is not a function",
      );
    });
  });

  describe("project header (per-call project context)", () => {
    // End to end through the real API clients, with only fetch mocked: every
    // request a tool makes, including preflight calls, must carry the call's
    // projectKey as the `project` header.
    const callTool = async (title: string, args: Record<string, unknown>) => {
      const register = vi.fn();
      await client.registerTools(register, vi.fn());
      const call = register.mock.calls.find((c) => c[0].title === title);
      if (!call) throw new Error(`Tool not registered: ${title}`);
      const [tool, handler] = call;
      // Parse through the tool's schema, as the SDK does before calling handlers.
      return handler(tool.inputSchema.parse(args), {});
    };
    const sentProjectHeaders = () =>
      fetchMock.mock.calls.map(
        ([, init]) => (init?.headers as Record<string, string>)?.project,
      );

    beforeEach(() => {
      fetchMock.mockResponse(JSON.stringify({}));
    });

    it("sends the call's projectKey as the project header for Link Issues to Testcase Run", async () => {
      await callTool("Link Issues to Testcase Run", {
        projectKey: "MAC",
        issueIds: [2038],
        tcrId: 23450,
      });

      expect(fetchMock).toHaveBeenCalledOnce();
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toBe("https://qmetry.example/rest/execution/link/issue");
      expect(init?.method).toBe("PUT");
      expect(sentProjectHeaders()).toEqual(["MAC"]);
      expect(JSON.parse(init?.body as string)).not.toHaveProperty("projectKey");
    });

    it("sends the call's projectKey on every request made by Create Test Case", async () => {
      const result = await callTool("Create Test Case", {
        projectKey: "MAC",
        name: "Login works",
        tcFolderID: "102653",
        steps: [{ orderId: 1, description: "Open the login page" }],
      });

      expect(result.isError).toBeUndefined();
      // Preflight (project info, UDF layout) and the create call itself
      const posts = fetchMock.mock.calls.filter(
        ([, init]) => init?.method === "POST",
      );
      expect(posts.length).toBeGreaterThan(0);
      expect(fetchMock.mock.calls.length).toBeGreaterThan(1);
      expect(new Set(sentProjectHeaders())).toEqual(new Set(["MAC"]));
    });

    it("rejects a project-scoped call that omits projectKey, even after Fetch QMetry Project Info", async () => {
      await callTool("Fetch QMetry Project Info", { projectKey: "UT" });
      fetchMock.mockClear();

      await expect(
        callTool("Link Issues to Testcase Run", {
          issueIds: [2038],
          tcrId: 23450,
        }),
      ).rejects.toThrow();
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("no longer registers Set QMetry Project Info", async () => {
      await expect(
        callTool("Set QMetry Project Info", { projectKey: "UT" }),
      ).rejects.toThrow("Tool not registered");
    });
  });

  describe("resolved project: echo and pinning within a call", () => {
    const callTool = async (title: string, args: Record<string, unknown>) => {
      const register = vi.fn();
      await client.registerTools(register, vi.fn());
      const call = register.mock.calls.find((c) => c[0].title === title);
      if (!call) throw new Error(`Tool not registered: ${title}`);
      const [tool, handler] = call;
      return handler(tool.inputSchema.parse(args), {});
    };
    const isGetInfo = (url: unknown) =>
      String(url).includes("/rest/admin/project/getinfo");
    const sentProjectHeaders = () =>
      fetchMock.mock.calls.map(
        ([, init]) => (init?.headers as Record<string, string>)?.project,
      );
    const projectEcho = (result: any) => {
      const block = result.content.find((c: any) =>
        c.text?.startsWith('{"project":'),
      );
      return block ? JSON.parse(block.text).project : undefined;
    };

    // getinfo answers for whichever project the `project` header names;
    // "default" stands for the project selected in the QMetry UI (347 here).
    const PROJECTS = [
      { projectID: 347, projectKey: "8d7b", name: "Pranshu Basic Test" },
      { projectID: 192, projectKey: "QT", name: "QTM--to--QTM4J" },
    ];
    let selected = 347;
    const mockQMetry = () =>
      fetchMock.mockResponse(async (req) => {
        if (isGetInfo(req.url)) {
          const header = req.headers.get("project");
          const current =
            header === "default"
              ? PROJECTS.find((p) => p.projectID === selected)
              : PROJECTS.find((p) => p.projectKey === header);
          return JSON.stringify({
            currentProjectId: current?.projectID,
            currentProjectName: current?.name,
            projects: PROJECTS,
            rootFolders: { TC: { id: 10 } },
          });
        }
        return JSON.stringify({ success: true, data: [] });
      });

    beforeEach(() => {
      selected = 347;
      mockQMetry();
    });

    const createTestCase = (extra: Record<string, unknown> = {}) =>
      callTool("Create Test Case", {
        name: "Login works",
        tcFolderID: "102653",
        steps: [{ orderId: 1, description: "Open the login page" }],
        ...extra,
      });

    it("fetches getinfo at most once per call", async () => {
      await createTestCase({ projectKey: "QT" });

      const getInfoCalls = fetchMock.mock.calls.filter(([url]) =>
        isGetInfo(url),
      );
      expect(getInfoCalls).toHaveLength(1);
      expect(new Set(sentProjectHeaders())).toEqual(new Set(["QT"]));
    });

    it("sends an explicit key unchanged and echoes it as explicit", async () => {
      const result = await createTestCase({ projectKey: "QT" });

      expect(new Set(sentProjectHeaders())).toEqual(new Set(["QT"]));
      expect(projectEcho(result)).toEqual({
        key: "QT",
        id: 192,
        name: "QTM--to--QTM4J",
        source: "explicit",
      });
    });

    it("leaves the tool's own result as the first content block", async () => {
      const result = await createTestCase({ projectKey: "QT" });

      expect(JSON.parse(result.content[0].text)).toEqual({
        success: true,
        data: [],
      });
      expect(result.content).toHaveLength(2);
    });

    it("keeps the explicit key when getinfo's project is missing from the projects list", async () => {
      fetchMock.mockResponse(async (req) =>
        isGetInfo(req.url)
          ? JSON.stringify({
              currentProjectId: 999,
              currentProjectName: "Hidden",
              projects: PROJECTS,
            })
          : JSON.stringify({ success: true }),
      );

      const result = await createTestCase({ projectKey: "QT" });

      expect(new Set(sentProjectHeaders())).toEqual(new Set(["QT"]));
      expect(projectEcho(result)).toEqual({
        key: "QT",
        id: 999,
        name: "Hidden",
        source: "explicit",
      });
    });

    it("still runs, with the explicit key echoed, when getinfo fails in a preflight", async () => {
      // Only the preflight's getinfo fails; the domain client may make its
      // own getinfo request later, which succeeds.
      let getInfoCount = 0;
      fetchMock.mockResponse(async (req) => {
        if (isGetInfo(req.url) && getInfoCount++ === 0) {
          return { status: 500, body: "boom" };
        }
        return JSON.stringify({ success: true });
      });

      // Update Requirement has no auto-resolve: only its best-effort date
      // preflight calls getinfo, so a getinfo failure must not fail the call.
      const result = await callTool("Update Requirement", {
        projectKey: "QT",
        rqId: 1,
        rqVersionId: 1,
        name: "Renamed",
      });

      expect(result.isError).toBeUndefined();
      expect(new Set(sentProjectHeaders())).toEqual(new Set(["QT"]));
      expect(projectEcho(result)).toEqual({ key: "QT", source: "explicit" });
    });

    it("echoes the explicit key without a getinfo request on tools that never fetch project info", async () => {
      const result = await callTool("Link Issues to Testcase Run", {
        projectKey: "QT",
        issueIds: [2038],
        tcrId: 23450,
      });

      expect(fetchMock.mock.calls.some(([url]) => isGetInfo(url))).toBe(false);
      expect(result.content).toHaveLength(2);
      expect(projectEcho(result)).toEqual({ key: "QT", source: "explicit" });
    });

    it("keeps no project state: each call on the same client uses its own projectKey", async () => {
      const first = await createTestCase({ projectKey: "8d7b" });
      expect(projectEcho(first)?.key).toBe("8d7b");

      // The user switches project in the QMetry UI between calls: no effect,
      // because every call names its project.
      selected = 192;
      fetchMock.mockClear();
      const second = await createTestCase({ projectKey: "8d7b" });

      expect(projectEcho(second)?.key).toBe("8d7b");
      expect(new Set(sentProjectHeaders())).toEqual(new Set(["8d7b"]));
    });

    it("leaves the client's own fields unchanged after a call", async () => {
      const before = { ...(client as any) };
      await createTestCase({ projectKey: "QT" });
      expect({ ...(client as any) }).toEqual(before);
    });

    describe("numeric projectID for Create Release / Create Cycle", () => {
      const bodyOf = (path: string) => {
        const call = fetchMock.mock.calls.find(([url]) =>
          String(url).endsWith(path),
        );
        return call ? JSON.parse(call[1]?.body as string) : undefined;
      };

      it("fills release.projectID from the call's projectKey", async () => {
        const result = await callTool("Create Release", {
          projectKey: "QT",
          release: { name: "R1", startDate: "11-18-2026" },
        });

        expect(result.isError).toBeUndefined();
        expect(bodyOf("/rest/admin/release")?.release.projectID).toBe(192);
        expect(projectEcho(result)).toMatchObject({ key: "QT", id: 192 });
        expect(new Set(sentProjectHeaders())).toEqual(new Set(["QT"]));
      });

      it("rejects Create Release without projectKey before any request", async () => {
        await expect(
          callTool("Create Release", { release: { name: "R1" } }),
        ).rejects.toThrow();
        expect(fetchMock).not.toHaveBeenCalled();
      });

      it("keeps an explicit release.projectID and makes no getinfo request", async () => {
        await callTool("Create Release", {
          projectKey: "QT",
          release: { name: "R1", projectID: 46792 },
        });

        expect(bodyOf("/rest/admin/release")?.release.projectID).toBe(46792);
        expect(fetchMock.mock.calls.some(([url]) => isGetInfo(url))).toBe(
          false,
        );
      });

      it("fills cycle.projectID for Create Cycle", async () => {
        await callTool("Create Cycle", {
          projectKey: "QT",
          cycle: { name: "C1", releaseID: 10 },
        });

        expect(bodyOf("/rest/admin/cycle")?.cycle.projectID).toBe(192);
      });

      it("fills release.projectID for Update Release", async () => {
        const result = await callTool("Update Release", {
          projectKey: "QT",
          release: { releaseID: 1631, name: "R2" },
        });

        expect(result.isError).toBeUndefined();
        const body = bodyOf("/rest/admin/release");
        expect(body).toEqual({
          release: { releaseID: 1631, name: "R2", projectID: 192 },
        });
        expect(new Set(sentProjectHeaders())).toEqual(new Set(["QT"]));
      });

      it("keeps an explicit release.projectID for Update Release", async () => {
        await callTool("Update Release", {
          projectKey: "QT",
          release: { projectID: 46792, releaseID: 1631, name: "R2" },
        });

        expect(bodyOf("/rest/admin/release")?.release.projectID).toBe(46792);
        expect(fetchMock.mock.calls.some(([url]) => isGetInfo(url))).toBe(
          false,
        );
      });

      it("sends Update Cycle without projectKey in the body", async () => {
        await callTool("Update Cycle", {
          projectKey: "QT",
          cycle: { buildID: "1494", releaseID: 3729, name: "C2" },
        });

        expect(bodyOf("/rest/admin/cycle")).toEqual({
          cycle: { buildID: 1494, releaseID: 3729, name: "C2" },
        });
        expect(new Set(sentProjectHeaders())).toEqual(new Set(["QT"]));
      });

      it("reports a failed projectID lookup instead of creating without it", async () => {
        fetchMock.mockResponse(async (req) =>
          isGetInfo(req.url)
            ? { status: 500, body: "boom" }
            : JSON.stringify({ success: true }),
        );

        await expect(
          callTool("Create Release", {
            projectKey: "QT",
            release: { name: "R1" },
          }),
        ).rejects.toThrow(/resolving the numeric projectID/);
        expect(bodyOf("/rest/admin/release")).toBeUndefined();
      });
    });
  });

  describe("utilities", () => {
    it("should expose token and baseUrl", () => {
      expect(client.getToken()).toBe("fake-token");
      expect(client.getBaseUrl()).toBe("https://qmetry.example");
    });
  });
});
