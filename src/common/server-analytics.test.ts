import { beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { trackToolCalled } from "./analytics";
import { SmartBearMcpServer } from "./server";
import { ToolError } from "./tools";

vi.mock("./bugsnag.js", () => ({
  default: { notify: vi.fn() },
}));

vi.mock("./analytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./analytics")>()),
  trackToolCalled: vi.fn(),
}));

/**
 * Tool Called instrumentation on the shared tool dispatch wrapper. Uses the
 * same super.registerTool interception as server.test.ts so the wrapper can
 * be invoked directly.
 */
describe("SmartBearMcpServer tool call analytics", () => {
  let server: SmartBearMcpServer;
  // Same super.registerTool interception as server.test.ts.
  let registerToolMock: any;
  let client: any;

  beforeEach(() => {
    vi.mocked(trackToolCalled).mockClear();
    server = new SmartBearMcpServer();
    registerToolMock = vi
      .spyOn(
        Object.getPrototypeOf(Object.getPrototypeOf(server)),
        "registerTool",
      )
      .mockImplementation(vi.fn());
    client = {
      name: "Test Product",
      capabilityPrefix: "test_product",
      configPrefix: "test-product",
      config: z.object({}),
      registerTools: vi.fn(),
      configure: vi.fn(),
      isConfigured: vi.fn().mockReturnValue(true),
    };
  });

  async function registerTool(handler: (args: any, ctx: any) => unknown) {
    await server.addClient(client);
    const registerFn = client.registerTools.mock.calls[0][0];
    registerFn({ title: "Test Tool", summary: "A test tool" }, handler);
    // The wrapper handed to the SDK.
    return registerToolMock.mock.calls[0][2] as (
      args: any,
      ctx: any,
    ) => Promise<any>;
  }

  it("records a successful call with the owning client and no session", async () => {
    server.setMcpClientIdentity({
      name: "cursor",
      version: "1.0.0",
      protocolVersion: "2025-11-25",
    });
    const wrapper = await registerTool(async () => ({
      content: [{ type: "text", text: "ok" }],
    }));

    await wrapper({ secret: "argument" }, {});

    expect(trackToolCalled).toHaveBeenCalledTimes(1);
    const outcome = vi.mocked(trackToolCalled).mock.calls[0][0];
    expect(outcome).toMatchObject({
      client,
      toolName: "test_product_test_tool",
      success: true,
      errorType: null,
      mcpClient: {
        name: "cursor",
        version: "1.0.0",
        protocolVersion: "2025-11-25",
      },
      session: undefined,
    });
    expect(outcome.durationMs).toBeGreaterThanOrEqual(0);
    // The outcome carries nothing from the invocation itself.
    expect(JSON.stringify(outcome)).not.toContain("argument");
  });

  it("records a ToolError as a failure without rethrowing", async () => {
    const wrapper = await registerTool(async () => {
      throw new ToolError("bad input");
    });

    const result = await wrapper({}, {});

    expect(result.isError).toBe(true);
    expect(trackToolCalled).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, errorType: "ToolError" }),
    );
  });

  it("records the unconfigured-tool ToolError as a failure", async () => {
    const wrapper = await registerTool(async () => ({ content: [] }));
    client.isConfigured.mockReturnValueOnce(false);

    await wrapper({}, {});

    expect(trackToolCalled).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, errorType: "ToolError" }),
    );
  });

  it("records an unexpected error by class name and still rethrows", async () => {
    const wrapper = await registerTool(async () => {
      throw new RangeError("secret message");
    });

    await expect(wrapper({}, {})).rejects.toThrow("secret message");

    const outcome = vi.mocked(trackToolCalled).mock.calls[0][0];
    expect(outcome).toMatchObject({ success: false, errorType: "RangeError" });
    expect(JSON.stringify(outcome)).not.toContain("secret message");
  });

  it("records a returned isError result as a failure", async () => {
    const wrapper = await registerTool(async () => ({
      isError: true,
      content: [{ type: "text", text: "downstream 500" }],
    }));

    await wrapper({}, {});

    expect(trackToolCalled).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errorType: "ToolResultError",
      }),
    );
  });

  it("passes the attached analytics session through", async () => {
    const session = { sessionId: "sess-1" } as any;
    server.setAnalyticsSession(session);
    const wrapper = await registerTool(async () => ({ content: [] }));

    await wrapper({}, {});

    expect(trackToolCalled).toHaveBeenCalledWith(
      expect.objectContaining({ session }),
    );
    expect(server.getAnalyticsSession()).toBe(session);
  });

  it("exposes the normalised enabled toolsets", () => {
    expect(new SmartBearMcpServer().getEnabledToolsets()).toBeUndefined();
    expect(
      new SmartBearMcpServer("Bugsnag, swagger:Portal").getEnabledToolsets(),
    ).toEqual(["bugsnag", "swagger:portal"]);
  });
});
