import { describe, expect, it, vi } from "vitest";
import { handleInitializeMessage } from "../../../common/initialize";
import type { SmartBearMcpServer } from "../../../common/server";

function fakeServer() {
  return {
    setClientInfo: vi.fn(),
    setSamplingSupported: vi.fn(),
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
    expect(server.setSamplingSupported).not.toHaveBeenCalled();
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

  it("detects sampling and elicitation capabilities on protocolVersion 2025-11-25", () => {
    const server = fakeServer();

    handleInitializeMessage(server, {
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: { sampling: {}, elicitation: {} },
        clientInfo: { name: "Claude Code", version: "1.2.3" },
      },
    });

    expect(server.setClientInfo).toHaveBeenCalledWith({
      name: "Claude Code",
      version: "1.2.3",
    });
    expect(server.setSamplingSupported).toHaveBeenCalledWith(true);
    expect(server.setElicitationSupported).toHaveBeenCalledWith(true);
  });

  it("does not set sampling/elicitation flags when absent from capabilities", () => {
    const server = fakeServer();

    handleInitializeMessage(server, {
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "Claude Code", version: "1.2.3" },
      },
    });

    expect(server.setSamplingSupported).not.toHaveBeenCalled();
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
    expect(server.setSamplingSupported).not.toHaveBeenCalled();
    expect(server.setElicitationSupported).not.toHaveBeenCalled();
  });
});
