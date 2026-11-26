import { beforeEach, describe, expect, it, vi } from "vitest";
import { ToolError } from "../common/tools";
import {
  PROJECT_OPTIONAL_HANDLERS,
  QmetryClient,
  requiresProjectKey,
} from "./client";
import { QMETRY_HANDLER_MAP } from "./client/handlers";
import * as projectApi from "./client/project";
import { TOOLS } from "./client/tools/index";
import type { QMetryToolParams } from "./client/tools/types";
import { QMetryToolsHandlers } from "./config/constants";

// Domain API clients are mocked: these tests only check which project key the
// client hands to them, not the HTTP calls they make.
vi.mock("./client/project");
vi.mock("./client/testcase");
vi.mock("./client/requirement");
vi.mock("./client/issues");
vi.mock("./client/testsuite");
vi.mock("./client/udf");
vi.mock("./client/automation");
vi.mock("./client/ai-agent");

// On the 2026-07-28 HTTP transport every request gets a fresh client instance,
// so a tool call's project must come from its own `projectKey` argument and
// never from state left on the client by an earlier call. Project-scoped tools
// must name their project explicitly: the server never falls back to the
// project selected in the QMetry UI ("default") for them.

async function newClient(): Promise<QmetryClient> {
  const client = new QmetryClient();
  await client.configure({} as any, {
    api_key: "fake-token",
    base_url: "https://qmetry.example",
  });
  return client;
}

async function handlerFor(client: QmetryClient, title: string) {
  const register = vi.fn();
  await client.registerTools(register, vi.fn());
  const call = register.mock.calls.find((c) => c[0].title === title);
  if (!call) throw new Error(`Tool not registered: ${title}`);
  return call[1] as (args: any, ctx?: any) => Promise<any>;
}

function toolByTitle(title: string): QMetryToolParams {
  const tool = TOOLS.find((t) => t.title === title);
  if (!tool) throw new Error(`Tool not defined: ${title}`);
  return tool;
}

const projectEcho = (result: any) => {
  const block = result.content.find((c: any) =>
    c.text?.startsWith('{"project":'),
  );
  return block ? JSON.parse(block.text).project : undefined;
};

const OPTIONAL_TITLES = [
  "Fetch QMetry list Projects",
  "Fetch QMetry Project Info",
  "Fetch API Call Quota",
  "Fetch Releases and Cycles",
];
const PROJECT_SCOPED_TOOLS = TOOLS.filter(
  (t) => !PROJECT_OPTIONAL_HANDLERS.has(t.handler),
);

// The tools that used to have no `projectKey` in their schema, and so read the
// project from the client instance instead.
const TOOLS_THAT_GAINED_PROJECT_KEY = [
  "Create Test Case",
  "Link Test Case to Issues",
  "Create Requirement",
  "Update Requirement",
  "Link Requirements to Testcase",
  "Create Test Suite",
  "Update Test Suite",
  "Link Test Cases to Test Suite",
  "Requirements Linked Test Cases to Test Suite",
  "Update Issue",
  "Import Automation Test Results",
];

describe("QMetry per-call project context", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("tool schemas", () => {
    it("exempts exactly the four tools that need no project", () => {
      expect(
        TOOLS.filter((t) => PROJECT_OPTIONAL_HANDLERS.has(t.handler))
          .map((t) => t.title)
          .sort(),
      ).toEqual([...OPTIONAL_TITLES].sort());
    });

    // The SDK passes handlers the schema-parsed arguments, which drops any key
    // the schema does not declare, and rejects a missing required key.
    it.each(
      PROJECT_SCOPED_TOOLS.map((t) => [t.title, t] as const),
    )("'%s' requires an explicit projectKey", (_title, tool) => {
      const shape = (tool.inputSchema as any)?.shape;
      expect(shape).toBeDefined();
      expect(shape).toHaveProperty("projectKey");
      expect(shape.projectKey.isOptional()).toBe(false);
      expect(shape.projectKey.safeParse(undefined).success).toBe(false);
      expect(shape.projectKey.safeParse("  ").success).toBe(false);
      expect(shape.projectKey.parse(" MAC ")).toBe("MAC");
      expect(shape.projectKey.description).toContain("REQUIRED");
      expect(shape.projectKey.description).toContain(
        "Fetch QMetry list Projects",
      );
    });

    it.each(
      OPTIONAL_TITLES,
    )("'%s' keeps projectKey optional, defaulting to 'default'", (title) => {
      const shape = (toolByTitle(title).inputSchema as any).shape;
      expect(shape.projectKey.parse(undefined)).toBe("default");
      expect(shape.projectKey.parse("MAC")).toBe("MAC");
    });

    it("every project-scoped example passes a projectKey", () => {
      const missing = PROJECT_SCOPED_TOOLS.flatMap((t) =>
        (t.examples ?? [])
          .filter((e) => !("projectKey" in (e.parameters ?? {})))
          .map((e) => `${t.title}: ${e.description}`),
      );
      expect(missing).toEqual([]);
    });

    it("no tool registers Set QMetry Project Info", () => {
      expect(TOOLS.map((t) => t.title)).not.toContain(
        "Set QMetry Project Info",
      );
    });

    it("no tool text tells the model to use the 'default' project or omit projectKey", () => {
      // Tool metadata plus every schema field description (JSON Schema form,
      // so nested field descriptions are included).
      const text = JSON.stringify(
        PROJECT_SCOPED_TOOLS.map((t) => ({
          ...t,
          inputSchema: (t.inputSchema as any).toJSONSchema(),
        })),
      );
      expect(text).toContain("Fetch QMetry list Projects");
      expect(text).not.toMatch(/use 'default'/i);
      expect(text).not.toMatch(/'default' project/i);
      expect(text).not.toMatch(/default project/i);
      expect(text).not.toMatch(/omit projectKey/i);
      expect(text).not.toMatch(/\bor the project selected in QMetry/i);
      expect(text).not.toMatch(/when projectKey is omitted/i);
    });
  });

  describe("missing projectKey guard", () => {
    it.each([
      ["missing", {}],
      ["blank", { projectKey: "   " }],
      ["'default'", { projectKey: "default" }],
      ["'DEFAULT'", { projectKey: "DEFAULT" }],
    ])("rejects a %s projectKey before any QMetry call", async (_label, args) => {
      const tool = toolByTitle("Fetch Test Cases");
      const apiFn = QMETRY_HANDLER_MAP[tool.handler] as any;
      const handler = await handlerFor(await newClient(), tool.title);

      const error = await handler(args).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ToolError);
      expect((error as Error).message).toContain("projectKey is required");
      expect((error as Error).message).toContain("Fetch QMetry list Projects");
      expect(apiFn).not.toHaveBeenCalled();
      expect(projectApi.getProjectInfo).not.toHaveBeenCalled();
    });

    it.each(
      PROJECT_SCOPED_TOOLS.map((t) => [t.title, t] as const),
    )("'%s' rejects a call without projectKey", async (title) => {
      const handler = await handlerFor(await newClient(), title);
      await expect(handler({})).rejects.toThrow("projectKey is required");
    });

    it.each([
      "Fetch QMetry list Projects",
      "Fetch QMetry Project Info",
      "Fetch API Call Quota",
    ])("'%s' runs without projectKey", async (title) => {
      const tool = toolByTitle(title);
      const apiFn = QMETRY_HANDLER_MAP[tool.handler] as any;
      apiFn.mockResolvedValue({ ok: true });

      const handler = await handlerFor(await newClient(), title);
      await handler({});

      expect(apiFn).toHaveBeenCalledOnce();
      expect(apiFn.mock.calls[0][2]).toBe("default");
    });

    it("Fetch Releases and Cycles needs projectKey unless allProjects is true", async () => {
      vi.mocked(projectApi.getReleasesCycles).mockResolvedValue({} as any);
      const handler = await handlerFor(
        await newClient(),
        "Fetch Releases and Cycles",
      );

      await expect(handler({})).rejects.toThrow("projectKey is required");
      await expect(handler({ allProjects: false })).rejects.toThrow(
        "projectKey is required",
      );
      expect(projectApi.getReleasesCycles).not.toHaveBeenCalled();

      await handler({ allProjects: true });
      await handler({ projectKey: "MAC" });
      expect(projectApi.getReleasesCycles).toHaveBeenCalledTimes(2);
      expect(vi.mocked(projectApi.getReleasesCycles).mock.calls[1][2]).toBe(
        "MAC",
      );
    });

    it("requiresProjectKey matches the exempt list", () => {
      expect(requiresProjectKey(QMetryToolsHandlers.FETCH_TEST_CASES, {})).toBe(
        true,
      );
      expect(requiresProjectKey(QMetryToolsHandlers.FETCH_PROJECTS, {})).toBe(
        false,
      );
      expect(
        requiresProjectKey(QMetryToolsHandlers.FETCH_RELEASES_CYCLES, {
          allProjects: true,
        }),
      ).toBe(false);
      expect(
        requiresProjectKey(QMetryToolsHandlers.FETCH_RELEASES_CYCLES, {}),
      ).toBe(true);
    });
  });

  describe("project key forwarding", () => {
    it.each(
      TOOLS_THAT_GAINED_PROJECT_KEY,
    )("'%s' forwards the call's projectKey to its API client", async (title) => {
      const tool = toolByTitle(title);
      const apiFn = QMETRY_HANDLER_MAP[tool.handler] as any;
      apiFn.mockResolvedValue({ ok: true });

      const handler = await handlerFor(await newClient(), title);
      await handler({ projectKey: " MAC " });

      expect(apiFn).toHaveBeenCalledOnce();
      const [, , project, payload] = apiFn.mock.calls[0];
      expect(project).toBe("MAC");
      // projectKey travels as the `project` header, never in the request body
      expect(payload).not.toHaveProperty("projectKey");
    });

    it("reports the explicit project on a call that made no project-info lookup", async () => {
      const tool = toolByTitle("Fetch Test Cases");
      (QMETRY_HANDLER_MAP[tool.handler] as any).mockResolvedValue({
        data: [],
      });

      const handler = await handlerFor(await newClient(), tool.title);
      const result = await handler({ projectKey: "MAC" });

      expect(projectApi.getProjectInfo).not.toHaveBeenCalled();
      expect(projectEcho(result)).toEqual({ key: "MAC", source: "explicit" });
    });

    it("does not add a project block to exempt tools that did not resolve one", async () => {
      const tool = toolByTitle("Fetch QMetry list Projects");
      (QMETRY_HANDLER_MAP[tool.handler] as any).mockResolvedValue({ data: [] });

      const handler = await handlerFor(await newClient(), tool.title);
      const result = await handler({});

      expect(projectEcho(result)).toBeUndefined();
    });
  });

  describe("no project state between calls", () => {
    const createTestCase = toolByTitle("Create Test Case");
    const fetchProjectInfo = toolByTitle("Fetch QMetry Project Info");
    const createApi = () => QMETRY_HANDLER_MAP[createTestCase.handler] as any;
    // Parse through the tool's schema, as the SDK does before calling handlers.
    const createArgs = (extra: Record<string, unknown> = {}) =>
      (createTestCase.inputSchema as any).parse({
        name: "Login works",
        tcFolderID: "102653",
        ...extra,
      });

    beforeEach(() => {
      createApi().mockResolvedValue({ id: 1 });
    });

    it("Fetch QMetry Project Info does not give a later call without projectKey a project", async () => {
      const client = await newClient();
      await (await handlerFor(client, fetchProjectInfo.title))(
        (fetchProjectInfo.inputSchema as any).parse({ projectKey: "UT" }),
      );

      const error = await (await handlerFor(client, createTestCase.title))({
        name: "Login works",
        tcFolderID: "102653",
      }).catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ToolError);
      expect(createApi()).not.toHaveBeenCalled();
    });

    it("a fresh client per request (2026-07-28 HTTP) uses the call's projectKey", async () => {
      const first = await newClient();
      await (await handlerFor(first, fetchProjectInfo.title))(
        (fetchProjectInfo.inputSchema as any).parse({ projectKey: "UT" }),
      );

      const second = await newClient();
      await (await handlerFor(second, createTestCase.title))(
        createArgs({ projectKey: "MAC" }),
      );

      expect(createApi().mock.calls[0][2]).toBe("MAC");
    });
  });

  // The automated runner starts a fresh session (so a fresh client) for every
  // prompt. Project choice must therefore travel in each call's projectKey, and
  // each response says which project was actually used.
  describe("cross-session scenario (fresh client per prompt)", () => {
    const PROJECTS = [
      { id: 347, key: "8d7b", name: "Pranshu Basic Test - DO NOT DELETE" },
      { id: 192, key: "QT", name: "QTM--to--QTM4J" },
    ];

    beforeEach(async () => {
      const actual =
        await vi.importActual<typeof import("./client/project")>(
          "./client/project",
        );
      vi.mocked(projectApi.resolveProjectFromInfo).mockImplementation(
        actual.resolveProjectFromInfo,
      );
      // getinfo: "default" is the project selected in the QMetry UI (347)
      vi.mocked(projectApi.getProjectInfo).mockImplementation(
        async (_t, _b, key) => {
          const current =
            key === "default"
              ? PROJECTS[0]
              : PROJECTS.find((p) => p.key === key);
          return {
            currentProjectId: current?.id,
            currentProjectName: current?.name,
            projects: PROJECTS,
          };
        },
      );
      for (const title of [
        "Create Test Case",
        "Create Requirement",
        "Fetch Test Cases",
      ]) {
        (
          QMETRY_HANDLER_MAP[toolByTitle(title).handler] as any
        ).mockResolvedValue({ id: 1 });
      }
    });

    const run = async (title: string, args: Record<string, unknown>) => {
      const tool = toolByTitle(title);
      const handler = await handlerFor(await newClient(), title);
      return handler((tool.inputSchema as any).parse(args));
    };

    it("prompts that pass projectKey QT all run against QT, each on a fresh client", async () => {
      await run("Fetch QMetry Project Info", { projectKey: "QT" });
      const tc = await run("Create Test Case", {
        projectKey: "QT",
        name: "Login works",
        tcFolderID: "102653",
      });
      const rq = await run("Create Requirement", {
        projectKey: "QT",
        name: "Login",
        rqFolderId: "1",
      });

      for (const title of ["Create Test Case", "Create Requirement"]) {
        const api = QMETRY_HANDLER_MAP[toolByTitle(title).handler] as any;
        expect(api.mock.calls[0][2]).toBe("QT");
      }
      for (const result of [tc, rq]) {
        expect(projectEcho(result)).toEqual({
          key: "QT",
          id: 192,
          name: "QTM--to--QTM4J",
          source: "explicit",
        });
      }
    });

    it("a later prompt that omits projectKey is rejected instead of using the project selected in QMetry", async () => {
      await run("Fetch QMetry Project Info", { projectKey: "QT" });
      const handler = await handlerFor(await newClient(), "Create Test Case");

      await expect(
        handler({ name: "Login works", tcFolderID: "102653" }),
      ).rejects.toThrow("projectKey is required");
      expect(
        QMETRY_HANDLER_MAP[toolByTitle("Create Test Case").handler],
      ).not.toHaveBeenCalled();
    });

    it("switching projects between prompts sends each call to the project it names", async () => {
      for (const key of ["8d7b", "QT", "8d7b"]) {
        await run("Fetch Test Cases", { projectKey: key });
      }
      const api = QMETRY_HANDLER_MAP[
        toolByTitle("Fetch Test Cases").handler
      ] as any;
      expect(api.mock.calls.map((c: any[]) => c[2])).toEqual([
        "8d7b",
        "QT",
        "8d7b",
      ]);
    });
  });
});
