import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WebSocketManager } from "./websocket-manager.ts";

const apiKeyHeader = (key = "test-api-key") => ({ "X-API-KEY": key });

type WsEventHandler = (...args: unknown[]) => void;

interface MockWsInstance {
  readyState: number;
  on: Mock<(event: string, handler: WsEventHandler) => void>;
  send: Mock<(...args: unknown[]) => void>;
  close: Mock<(...args: unknown[]) => void>;
  removeAllListeners: Mock<(...args: unknown[]) => void>;
}

interface MockWebSocketCtor
  extends Mock<(url: string, opts?: unknown) => MockWsInstance> {
  OPEN: number;
  CONNECTING: number;
}

function createMockWsInstance(
  onOpen = true,
  onMessage?: (handler: WsEventHandler) => void,
): MockWsInstance {
  return {
    readyState: 1,
    on: vi.fn().mockImplementation((event: string, handler: WsEventHandler) => {
      if (event === "open" && onOpen) {
        setTimeout(() => handler(), 0);
      }
      if (event === "message" && onMessage) {
        onMessage(handler);
      }
    }),
    send: vi.fn(),
    close: vi.fn(),
    removeAllListeners: vi.fn(),
  };
}

// Mock the ws module
vi.mock("ws", () => {
  const Open = 1;
  const Connecting = 0;

  const MockWebSocket = vi.fn().mockImplementation(() => ({
    readyState: Open,
    on: vi.fn(),
    send: vi.fn(),
    close: vi.fn(),
    removeAllListeners: vi.fn(),
  }));

  Object.assign(MockWebSocket, { OPEN: Open, CONNECTING: Connecting });

  return { default: MockWebSocket };
});

describe("WebSocketManager", () => {
  let manager: WebSocketManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new WebSocketManager("test-session-123", apiKeyHeader());
  });

  it("should start disconnected", () => {
    expect(manager.isConnected()).toBe(false);
  });

  it("should connect successfully and set state to connected", async () => {
    const WebSocket = (await import("ws"))
      .default as unknown as MockWebSocketCtor;
    WebSocket.mockImplementationOnce(() => createMockWsInstance());

    const newManager = new WebSocketManager("session-456", apiKeyHeader("key"));

    await newManager.connect();
    expect(newManager.isConnected()).toBe(true);
  });

  it("should throw if already connected", async () => {
    const WebSocket = (await import("ws"))
      .default as unknown as MockWebSocketCtor;
    WebSocket.mockImplementationOnce(() => createMockWsInstance());

    const newManager = new WebSocketManager("session-789", apiKeyHeader("key"));

    await newManager.connect();
    await expect(newManager.connect()).rejects.toThrow(
      "WebSocket is already connected",
    );
  });

  it("should reject waitForResponse on failure message", async () => {
    const WebSocket = (await import("ws"))
      .default as unknown as MockWebSocketCtor;
    let messageHandler: WsEventHandler | null = null;

    WebSocket.mockImplementationOnce(() =>
      createMockWsInstance(true, (handler) => {
        messageHandler = handler;
      }),
    );

    const newManager = new WebSocketManager(
      "session-fail",
      apiKeyHeader("key"),
    );

    await newManager.connect();

    const responsePromise = newManager.waitForResponse("req-1");
    // Simulate a failure message
    const FAILURE_MESSAGE_DELAY_MS = 10;
    setTimeout(() => {
      if (messageHandler) {
        messageHandler(
          Buffer.from(
            JSON.stringify({
              id: "req-1",
              type: "mcp:add-prompt-step:failure",
            }),
          ),
        );
      }
    }, FAILURE_MESSAGE_DELAY_MS);

    await expect(responsePromise).rejects.toMatchObject({
      type: "mcp:add-prompt-step:failure",
    });
  });

  it("should resolve waitForResponse on success message", async () => {
    const WebSocket = (await import("ws"))
      .default as unknown as MockWebSocketCtor;
    let messageHandler: WsEventHandler | null = null;

    WebSocket.mockImplementationOnce(() =>
      createMockWsInstance(true, (handler) => {
        messageHandler = handler;
      }),
    );

    const newManager = new WebSocketManager("session-ok", apiKeyHeader("key"));

    await newManager.connect();

    const responsePromise = newManager.waitForResponse("req-2");
    const SUCCESS_MESSAGE_DELAY_MS = 10;
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
    }, SUCCESS_MESSAGE_DELAY_MS);

    const result = await responsePromise;
    expect(result).toMatchObject({
      type: "mcp:connect-to-session:success",
      platform: "web",
    });
  });

  it("should pass Bearer token header to WebSocket for OAuth", async () => {
    const WebSocket = (await import("ws"))
      .default as unknown as MockWebSocketCtor;
    const captured: { opts?: { headers?: Record<string, string> } } = {};

    WebSocket.mockImplementationOnce((_url: string, opts?: unknown) => {
      captured.opts = opts as { headers?: Record<string, string> };
      return createMockWsInstance();
    });

    const newManager = new WebSocketManager("session-oauth", {
      Authorization: "Bearer oauth-token",
    });
    await newManager.connect();

    expect(captured.opts?.headers).toEqual({
      Authorization: "Bearer oauth-token",
    });
  });

  it("should disconnect cleanly", async () => {
    const WebSocket = (await import("ws"))
      .default as unknown as MockWebSocketCtor;
    const mockInstance = createMockWsInstance();
    WebSocket.mockImplementationOnce(() => mockInstance);

    const newManager = new WebSocketManager(
      "session-disc",
      apiKeyHeader("key"),
    );
    await newManager.connect();
    await newManager.disconnect();

    expect(newManager.isConnected()).toBe(false);
    expect(mockInstance.removeAllListeners).toHaveBeenCalled();
    expect(mockInstance.close).toHaveBeenCalled();
  });
});
