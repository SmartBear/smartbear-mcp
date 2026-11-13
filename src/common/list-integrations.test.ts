import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import z from "zod";
import { clientRegistry } from "./client-registry";
import {
  buildIntegrationsReport,
  INTEGRATION_DESCRIPTIONS,
  LIST_INTEGRATIONS_TOOL_NAME,
} from "./list-integrations";
import { SmartBearMcpServer } from "./server";

vi.mock("./bugsnag.js", () => ({ default: { notify: vi.fn() } }));

function makeClient(overrides: Record<string, unknown> = {}) {
  return {
    name: "Zephyr",
    capabilityPrefix: "zephyr",
    configPrefix: "Zephyr",
    config: z.object({
      api_token: z.string().describe("Zephyr Scale API token"),
      base_url: z.url().optional().describe("Zephyr Scale API base URL"),
    }),
    configure: vi.fn(),
    isConfigured: vi.fn().mockReturnValue(false),
    registerTools: vi.fn(),
    ...overrides,
  };
}

function toolsOf(server: SmartBearMcpServer): Record<string, any> {
  return (server as unknown as { _registeredTools: Record<string, any> })
    ._registeredTools;
}

describe("smartbear_list_integrations", () => {
  let getAll: ReturnType<typeof vi.spyOn>;
  let catalog: any[];

  beforeEach(() => {
    catalog = [];
    getAll = vi
      .spyOn(clientRegistry, "getAll")
      .mockImplementation(() => catalog);
  });

  afterEach(() => {
    getAll.mockRestore();
    vi.unstubAllEnvs();
  });

  it("is registered with no clients and takes no required input", () => {
    const server = new SmartBearMcpServer();
    const tool = toolsOf(server)[LIST_INTEGRATIONS_TOOL_NAME];
    expect(tool).toBeDefined();
    const schema = z.toJSONSchema(tool.inputSchema);
    expect(schema.properties ?? {}).toEqual({});
    expect(schema.required ?? []).toEqual([]);
  });

  it("lists unconfigured catalog products with setup details", () => {
    catalog = [makeClient()];
    const { integrations } = buildIntegrationsReport(new SmartBearMcpServer());
    expect(integrations).toEqual([
      {
        product: "Zephyr",
        description: INTEGRATION_DESCRIPTIONS.Zephyr,
        configured: false,
        setup: [
          {
            envVar: "ZEPHYR_API_TOKEN",
            header: "Zephyr-Api-Token",
            required: true,
            description: "Zephyr Scale API token",
          },
          {
            envVar: "ZEPHYR_BASE_URL",
            header: "Zephyr-Base-Url",
            required: false,
            description: "Zephyr Scale API base URL",
          },
        ],
      },
    ]);
  });

  it("reports toolCount and toolsets for configured products, honouring MCP_TOOLSETS", async () => {
    const server = new SmartBearMcpServer("bugsnag:errors");
    const registerFn = async (register: any) => {
      for (const [title, toolset] of [
        ["List Errors", "Errors"],
        ["Get Error", "Errors"],
        ["List Releases", "Releases"],
      ]) {
        register(
          { title, summary: "s", toolset, inputSchema: z.object({}) },
          vi.fn(),
        );
      }
    };
    const bugsnag = makeClient({
      name: "BugSnag",
      capabilityPrefix: "bugsnag",
      configPrefix: "bugsnag",
      config: z.object({}),
      isConfigured: vi.fn().mockReturnValue(true),
      registerTools: registerFn,
    });
    catalog = [bugsnag];
    await server.addClient(bugsnag as any);

    const { integrations } = buildIntegrationsReport(server);
    expect(integrations[0]).toMatchObject({
      product: "BugSnag",
      configured: true,
      toolCount: 2,
      toolsets: [
        { name: "Errors", toolCount: 2, enabled: true },
        { name: "Releases", toolCount: 1, enabled: false },
      ],
    });
    expect(integrations[0]).not.toHaveProperty("setup");
  });

  it("shows every toolset enabled when no MCP_TOOLSETS restriction is set", async () => {
    const server = new SmartBearMcpServer();
    const client = makeClient({
      config: z.object({}),
      isConfigured: vi.fn().mockReturnValue(true),
      registerTools: async (register: any) => {
        register(
          {
            title: "A",
            summary: "s",
            toolset: "One",
            inputSchema: z.object({}),
          },
          vi.fn(),
        );
      },
    });
    catalog = [client];
    await server.addClient(client as any);
    const [entry] = buildIntegrationsReport(server).integrations as any[];
    expect(entry.toolsets.every((t: any) => t.enabled)).toBe(true);
  });

  it("calls through the tool handler without credentials or network", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    catalog = [makeClient()];
    const server = new SmartBearMcpServer();
    const tool = toolsOf(server)[LIST_INTEGRATIONS_TOOL_NAME];
    const result = await tool.handler({}, {});
    expect(result.isError).toBeUndefined();
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.integrations[0].configured).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it("has a description for every product in the client loader", async () => {
    const source = await import("node:fs/promises").then((fs) =>
      fs.readFile(new URL("./register-clients.ts", import.meta.url), "utf8"),
    );
    const names = [...source.matchAll(/^\s+"?([\w ]+)"?: async/gm)].map(
      (m) => m[1],
    );
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(INTEGRATION_DESCRIPTIONS).toHaveProperty(name);
    }
  });
});
