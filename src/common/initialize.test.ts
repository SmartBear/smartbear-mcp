import { describe, expect, it, vi } from "vitest";
import { extractModernClientMeta, handleInitializeMessage } from "./initialize";
import type { SmartBearMcpServer } from "./server";

const PROTOCOL_VERSION_KEY = "io.modelcontextprotocol/protocolVersion";
const CLIENT_INFO_KEY = "io.modelcontextprotocol/clientInfo";
const CLIENT_CAPABILITIES_KEY = "io.modelcontextprotocol/clientCapabilities";

/** A modern-era request envelope as sent by a 2026-07-28 client. */
function modernMessage(
  meta: Record<string, unknown> = {
    [PROTOCOL_VERSION_KEY]: "2026-07-28",
    [CLIENT_INFO_KEY]: { name: "Modern Client", version: "2.0.0" },
    [CLIENT_CAPABILITIES_KEY]: {},
  },
) {
  return { method: "tools/list", params: { _meta: meta } };
}

function fakeServer() {
  return {
    setClientInfo: vi.fn(),
    setMcpClientIdentity: vi.fn(),
    setElicitationSupported: vi.fn(),
  } as unknown as SmartBearMcpServer;
}

describe("handleInitializeMessage", () => {
  it("ignores messages that are not an initialize request", () => {
    const server = fakeServer();

    handleInitializeMessage(server, {
      method: "tools/list",
      params: { clientInfo: { name: "Claude Code", version: "1.0.0" } },
    });

    expect(server.setClientInfo).not.toHaveBeenCalled();
  });

  it("ignores non-object messages", () => {
    const server = fakeServer();

    handleInitializeMessage(server, null);
    handleInitializeMessage(server, "initialize");
    handleInitializeMessage(server, 42);

    expect(server.setClientInfo).not.toHaveBeenCalled();
  });

  it("captures clientInfo regardless of protocolVersion", () => {
    const server = fakeServer();

    handleInitializeMessage(server, {
      method: "initialize",
      params: {
        protocolVersion: "2025-06-18",
        capabilities: {},
        clientInfo: { name: "Claude Code", version: "1.2.3" },
      },
    });

    expect(server.setClientInfo).toHaveBeenCalledWith({
      name: "Claude Code",
      version: "1.2.3",
    });
    // Capability detection stays gated behind 2025-11-25.
    expect(server.setElicitationSupported).not.toHaveBeenCalled();
  });

  it("does not call setClientInfo when clientInfo is absent", () => {
    const server = fakeServer();

    handleInitializeMessage(server, {
      method: "initialize",
      params: { protocolVersion: "2025-06-18", capabilities: {} },
    });

    expect(server.setClientInfo).not.toHaveBeenCalled();
  });

  it("detects elicitation capability on protocolVersion 2025-11-25", () => {
    const server = fakeServer();

    handleInitializeMessage(server, {
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: { elicitation: {} },
        clientInfo: { name: "Claude Code", version: "1.2.3" },
      },
    });

    expect(server.setClientInfo).toHaveBeenCalledWith({
      name: "Claude Code",
      version: "1.2.3",
    });
    expect(server.setElicitationSupported).toHaveBeenCalledWith(true);
  });

  it("does not set the elicitation flag when absent from capabilities", () => {
    const server = fakeServer();

    handleInitializeMessage(server, {
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "Claude Code", version: "1.2.3" },
      },
    });

    expect(server.setElicitationSupported).not.toHaveBeenCalled();
  });

  it("does not throw when protocolVersion is 2025-11-25 and capabilities is missing", () => {
    const server = fakeServer();

    expect(() =>
      handleInitializeMessage(server, {
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          clientInfo: { name: "Claude Code", version: "1.2.3" },
        },
      }),
    ).not.toThrow();

    expect(server.setClientInfo).toHaveBeenCalledWith({
      name: "Claude Code",
      version: "1.2.3",
    });
    expect(server.setElicitationSupported).not.toHaveBeenCalled();
  });

  it("ignores a message carrying a modern protocol claim", () => {
    const server = fakeServer();

    handleInitializeMessage(server, {
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        clientInfo: { name: "Confused Client", version: "1.0.0" },
        _meta: { [PROTOCOL_VERSION_KEY]: "2026-07-28" },
      },
    });

    expect(server.setClientInfo).not.toHaveBeenCalled();
    expect(server.setMcpClientIdentity).not.toHaveBeenCalled();
  });
});

describe("extractModernClientMeta", () => {
  it("lifts protocolVersion, clientInfo and capabilities from _meta", () => {
    expect(extractModernClientMeta(modernMessage())).toEqual({
      protocolVersion: "2026-07-28",
      clientInfo: { name: "Modern Client", version: "2.0.0" },
      clientCapabilities: {},
    });
  });

  it("returns undefined for legacy messages carrying no _meta", () => {
    expect(
      extractModernClientMeta({
        method: "initialize",
        params: {
          protocolVersion: "2025-11-25",
          clientInfo: { name: "Claude Code", version: "1.0.0" },
        },
      }),
    ).toBeUndefined();
  });

  it("returns undefined for non-object messages", () => {
    expect(extractModernClientMeta(null)).toBeUndefined();
    expect(extractModernClientMeta("tools/list")).toBeUndefined();
    expect(extractModernClientMeta(42)).toBeUndefined();
  });

  it("returns undefined when _meta carries no protocol claim", () => {
    expect(
      extractModernClientMeta(
        modernMessage({ [CLIENT_INFO_KEY]: { name: "x", version: "1" } }),
      ),
    ).toBeUndefined();
  });

  it("tolerates a protocol claim with no clientInfo or capabilities", () => {
    expect(
      extractModernClientMeta(
        modernMessage({ [PROTOCOL_VERSION_KEY]: "2026-07-28" }),
      ),
    ).toEqual({
      protocolVersion: "2026-07-28",
      clientInfo: undefined,
      clientCapabilities: undefined,
    });
  });
});
