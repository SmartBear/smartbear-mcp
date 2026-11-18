import { beforeEach, describe, expect, it, vi } from "vitest";
import { QmetryClient } from "./client";
import { QMETRY_HANDLER_MAP } from "./client/handlers";
import * as projectApi from "./client/project";
import { TOOLS } from "./client/tools/index";
import type { QMetryToolParams } from "./client/tools/types";

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
// never from state left on the client by an earlier call.

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
    // The SDK passes handlers the schema-parsed arguments, which drops any key
    // the schema does not declare. A tool without `projectKey` in its schema
    // can therefore never receive the caller's project.
    it.each(
      TOOLS.map((t) => [t.title, t] as const),
    )("'%s' declares projectKey, defaulting to 'default'", (_title, tool) => {
      const shape = (tool.inputSchema as any)?.shape;
      expect(shape).toBeDefined();
      expect(shape).toHaveProperty("projectKey");
      expect(shape.projectKey.parse(undefined)).toBe("default");
      expect(shape.projectKey.parse("MAC")).toBe("MAC");
      expect(
        shape.projectKey.description ?? shape.projectKey.unwrap().description,
      ).toContain("project currently selected in the QMetry UI");
    });

    it("no tool registers Set QMetry Project Info", () => {
      expect(TOOLS.map((t) => t.title)).not.toContain(
        "Set QMetry Project Info",
      );
    });

    it("no tool text tells the model to use the 'default' project key", () => {
      const text = JSON.stringify(TOOLS);
      expect(text).not.toMatch(/use 'default'/i);
      expect(text).not.toMatch(/'default' project/i);
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
      await handler({ projectKey: "MAC" });

      expect(apiFn).toHaveBeenCalledOnce();
      const [, , project, payload] = apiFn.mock.calls[0];
      expect(project).toBe("MAC");
      // projectKey travels as the `project` header, never in the request body
      expect(payload).not.toHaveProperty("projectKey");
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

    it("Fetch QMetry Project Info does not change the project used by a later call on the same client", async () => {
      const client = await newClient();
      await (await handlerFor(client, fetchProjectInfo.title))(
        (fetchProjectInfo.inputSchema as any).parse({ projectKey: "UT" }),
      );

      // Raw args with no projectKey at all, so the client's own fallback is what
      // is being tested (schema parsing would otherwise fill in "default").
      await (await handlerFor(client, createTestCase.title))({
        name: "Login works",
        tcFolderID: "102653",
      });

      expect(createApi().mock.calls[0][2]).toBe("default");
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
    const projectEcho = (result: any) => {
      const block = result.content.find((c: any) =>
        c.text?.startsWith('{"project":'),
      );
      return block ? JSON.parse(block.text).project : undefined;
    };

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
      for (const title of ["Create Test Case", "Create Requirement"]) {
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

    it("a later prompt that omits projectKey goes to, and reports, the project selected in QMetry", async () => {
      await run("Fetch QMetry Project Info", { projectKey: "QT" });
      const tc = await run("Create Test Case", {
        name: "Login works",
        tcFolderID: "102653",
      });

      const api = QMETRY_HANDLER_MAP[
        toolByTitle("Create Test Case").handler
      ] as any;
      expect(api.mock.calls[0][2]).toBe("8d7b");
      expect(projectEcho(tc)).toEqual({
        key: "8d7b",
        id: 347,
        name: "Pranshu Basic Test - DO NOT DELETE",
        source: "qmetry-selected",
      });
    });
  });
});
