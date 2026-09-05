import type { JSONRPCMessage } from "@modelcontextprotocol/server";
import { describe, expect, it, vi } from "vitest";
import {
  getCurrentClientIdentity,
  setProcessClientIdentity,
} from "./client-identity";
import type { SmartBearMcpServer } from "./server";
import { createInitializeCaptureTap, getEnvVarName } from "./transport-stdio";

function fakeServer() {
  return {
    setClientInfo: vi.fn(),
    setMcpClientIdentity: vi.fn(),
    setElicitationSupported: vi.fn(),
  } as unknown as SmartBearMcpServer;
}

const initialize = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-11-25",
    capabilities: {},
    clientInfo: { name: "Claude Code", version: "1.2.3" },
  },
} as unknown as JSONRPCMessage;

const initialized = {
  jsonrpc: "2.0",
  method: "notifications/initialized",
} as unknown as JSONRPCMessage;

describe("createInitializeCaptureTap", () => {
  it("applies the capture directly once a server is attached", () => {
    const server = fakeServer();
    const tap = createInitializeCaptureTap();

    tap.attachServer(server);
    tap.observe(initialize);

    expect(server.setClientInfo).toHaveBeenCalledWith({
      name: "Claude Code",
      version: "1.2.3",
    });
  });

  it("replays a message buffered before the server was built", () => {
    const server = fakeServer();
    const tap = createInitializeCaptureTap();

    // The opening `initialize` triggers the async factory, so it arrives
    // before there is an instance to apply it to.
    tap.observe(initialize);
    expect(server.setClientInfo).not.toHaveBeenCalled();

    tap.attachServer(server);

    expect(server.setClientInfo).toHaveBeenCalledWith({
      name: "Claude Code",
      version: "1.2.3",
    });
  });

  it("keeps the initialize when a client pipelines it with a follow-up", () => {
    const server = fakeServer();
    const tap = createInitializeCaptureTap();

    // Both land in the pre-server window. A single-slot buffer would drop the
    // initialize here and lose client attribution.
    tap.observe(initialize);
    tap.observe(initialized);
    tap.attachServer(server);

    expect(server.setClientInfo).toHaveBeenCalledWith({
      name: "Claude Code",
      version: "1.2.3",
    });
    expect(server.setMcpClientIdentity).toHaveBeenCalledWith({
      name: "Claude Code",
      version: "1.2.3",
      protocolVersion: "2025-11-25",
    });
  });

  it("replays buffered messages once only", () => {
    const server = fakeServer();
    const tap = createInitializeCaptureTap();

    tap.observe(initialize);
    tap.attachServer(server);
    tap.observe(initialized);

    expect(server.setClientInfo).toHaveBeenCalledTimes(1);
  });

  it("records modern-era identity without needing a server instance", () => {
    setProcessClientIdentity(undefined);
    const tap = createInitializeCaptureTap();

    // No handshake and no server yet: a modern request still attributes.
    tap.observe({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {
        _meta: {
          "io.modelcontextprotocol/protocolVersion": "2026-07-28",
          "io.modelcontextprotocol/clientInfo": {
            name: "Modern Client",
            version: "2.0.0",
          },
          "io.modelcontextprotocol/clientCapabilities": {},
        },
      },
    } as unknown as JSONRPCMessage);

    expect(getCurrentClientIdentity()).toEqual({
      name: "Modern Client",
      version: "2.0.0",
      protocolVersion: "2026-07-28",
    });
    setProcessClientIdentity(undefined);
  });

  it("ignores non-initialize traffic", () => {
    const server = fakeServer();
    const tap = createInitializeCaptureTap();

    tap.observe(initialized);
    tap.attachServer(server);
    tap.observe({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    } as unknown as JSONRPCMessage);

    expect(server.setClientInfo).not.toHaveBeenCalled();
    expect(server.setMcpClientIdentity).not.toHaveBeenCalled();
  });
});

describe("getEnvVarName", () => {
  it("upper-cases the prefix and key, replacing hyphens", () => {
    expect(getEnvVarName("bugsnag", "auth_token")).toBe("BUGSNAG_AUTH_TOKEN");
    expect(getEnvVarName("pact-broker", "base_url")).toBe(
      "PACT_BROKER_BASE_URL",
    );
  });
});
