import { beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocketManager } from "../../../reflect/websocket-manager";

// Mock the ws module
vi.mock("ws", () => {
  const OPEN = 1;
  const CONNECTING = 0;

  const MockWebSocket = vi.fn().mockImplementation(() => ({
    readyState: OPEN,
    on: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    removeAllListeners: vi.fn(),
  }));

  (MockWebSocket as any).OPEN = OPEN;
  (MockWebSocket as any).CONNECTING = CONNECTING;

  return { default: MockWebSocket };
});

describe("WebSocketManager", () => {
  let manager: WebSocketManager;
  let _mockWs: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const WebSocket = (await import("ws")).default as any;
    manager = new WebSocketManager("test-session-123", "test-api-key");

    // Each new manager will use a new mock instance
    _mockWs = WebSocket.mock.results[0]?.value;
  });

  it("should start disconnected", () => {
    expect(manager.isConnected()).toBe(false);
  });

  it("should connect successfully and set state to connected", async () => {
    const WebSocket = (await import("ws")).default as any;
    WebSocket.mockImplementationOnce((_url: string, _opts: any) => {
      const instance = {
        readyState: 1,
        on: vi.fn().mockImplementation((event: string, handler: any) => {
          if (event === "open") setTimeout(() => handler(), 0);
        }),
        send: vi.fn(),
        close: vi.fn(),
        removeAllListeners: vi.fn(),
      };
      return instance;
    });

    const newManager = new WebSocketManager("session-456", "key");

    await newManager.connect();
    expect(newManager.isConnected()).toBe(true);
  });

  it("should throw if already connected", async () => {
    const WebSocket = (await import("ws")).default as any;
    WebSocket.mockImplementationOnce(() => ({
      readyState: 1,
      on: vi.fn().mockImplementation((event: string, handler: any) => {
        if (event === "open") setTimeout(() => handler(), 0);
      }),
      send: vi.fn(),
      close: vi.fn(),
      removeAllListeners: vi.fn(),
    }));

    const newManager = new WebSocketManager("session-789", "key");

    await newManager.connect();
    await expect(newManager.connect()).rejects.toThrow(
      "WebSocket is already connected",
    );
  });

  it("should reject waitForResponse on failure message", async () => {
    const WebSocket = (await import("ws")).default as any;
    let messageHandler: ((data: any) => void) | null = null;

    WebSocket.mockImplementationOnce(() => ({
      readyState: 1,
      on: vi.fn().mockImplementation((event: string, handler: any) => {
        if (event === "open") setTimeout(() => handler(), 0);
        if (event === "message") messageHandler = handler;
      }),
      send: vi.fn(),
      close: vi.fn(),
      removeAllListeners: vi.fn(),
    }));

    const newManager = new WebSocketManager("session-fail", "key");

    await newManager.connect();

    const responsePromise = newManager.waitForResponse("req-1");
    // Simulate a failure message
    setTimeout(() => {
      if (messageHandler) {
        messageHandler(
          Buffer.from(
            JSON.stringify({ id: "req-1", type: "mcp:add-prompt-step:failure" }),
          ),
        );
      }
    }, 10);

    await expect(responsePromise).rejects.toMatchObject({
      type: "mcp:add-prompt-step:failure",
    });
  });

  it("should resolve waitForResponse on success message", async () => {
    const WebSocket = (await import("ws")).default as any;
    let messageHandler: ((data: any) => void) | null = null;

    WebSocket.mockImplementationOnce(() => ({
      readyState: 1,
      on: vi.fn().mockImplementation((event: string, handler: any) => {
        if (event === "open") setTimeout(() => handler(), 0);
        if (event === "message") messageHandler = handler;
      }),
      send: vi.fn(),
      close: vi.fn(),
      removeAllListeners: vi.fn(),
    }));

    const newManager = new WebSocketManager("session-ok", "key");

    await newManager.connect();

    const responsePromise = newManager.waitForResponse("req-2");
    setTimeout(() => {
      if (messageHandler) {
        messageHandler(
          Buffer.from(
            JSON.stringify({
              id: "req-2",
              type: "mcp:connect-to-session:success",
              platform: "web",
            }),
          ),
        );
      }
    }, 10);

    const result = await responsePromise;
    expect(result).toMatchObject({ type: "mcp:connect-to-session:success", platform: "web" });
  });

  it("should disconnect cleanly", async () => {
    const WebSocket = (await import("ws")).default as any;
    const mockInstance = {
      readyState: 1,
      on: vi.fn().mockImplementation((event: string, handler: any) => {
        if (event === "open") setTimeout(() => handler(), 0);
      }),
      send: vi.fn(),
      close: vi.fn(),
      removeAllListeners: vi.fn(),
    };
    WebSocket.mockImplementationOnce(() => mockInstance);

    const newManager = new WebSocketManager("session-disc", "key");
    await newManager.connect();
    await newManager.disconnect();

    expect(newManager.isConnected()).toBe(false);
    expect(mockInstance.removeAllListeners).toHaveBeenCalled();
    expect(mockInstance.close).toHaveBeenCalled();
  });

});
