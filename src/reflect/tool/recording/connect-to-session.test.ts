import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReflectClient } from "../../client.ts";
import type { WebSocketManager } from "../../websocket-manager.ts";
import { ConnectToSession } from "./connect-to-session.ts";

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

const mockWsManager: Pick<
  WebSocketManager,
  | "connect"
  | "disconnect"
  | "sendMcpMessage"
  | "waitForResponse"
  | "isConnected"
> = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  sendMcpMessage: vi.fn().mockResolvedValue(undefined),
  waitForResponse: vi.fn(),
  isConnected: vi.fn().mockReturnValue(false),
};

vi.mock("../../websocket-manager", () => ({
  WebSocketManager: vi.fn(() => mockWsManager),
}));

describe("ConnectToSession", () => {
  let mockClient: Pick<
    ReflectClient,
    | "isSessionConnected"
    | "getSessionState"
    | "getAuthHeader"
    | "registerConnection"
  >;
  let instance: ConnectToSession;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations after clearAllMocks
    (mockWsManager.connect as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );
    (mockWsManager.disconnect as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );
    (
      mockWsManager.sendMcpMessage as ReturnType<typeof vi.fn>
    ).mockResolvedValue(undefined);
    (mockWsManager.isConnected as ReturnType<typeof vi.fn>).mockReturnValue(
      false,
    );

    mockClient = {
      isSessionConnected: vi.fn().mockReturnValue(false),
      getSessionState: vi.fn().mockReturnValue(undefined),
      getAuthHeader: vi.fn().mockReturnValue({ "X-API-KEY": "test-api-key" }),
      registerConnection: vi.fn(),
    };

    instance = new ConnectToSession(mockClient as unknown as ReflectClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Connect To Session");
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(true);
  });

  it("should return cached connection if already connected", async () => {
    (mockClient.isSessionConnected as ReturnType<typeof vi.fn>).mockReturnValue(
      true,
    );
    (mockClient.getSessionState as ReturnType<typeof vi.fn>).mockReturnValue({
      platform: "web",
    });

    const result = await instance.handle(
      { sessionId: "sess-1" },
      {} as unknown as Extra,
    );
    expect(result.content[0]?.type).toBe("text");
    const parsed = JSON.parse((result.content[0] as TextContent).text);
    expect(parsed.success).toBe(true);
    expect(parsed.platform).toBe("web");
    expect(mockClient.registerConnection).not.toHaveBeenCalled();
  });

  it("should connect, send connect message, and register connection", async () => {
    (
      mockWsManager.waitForResponse as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      type: "mcp:connect-to-session:success",
      id: "some-id",
      platform: "native-mobile",
    });

    const result = await instance.handle(
      { sessionId: "sess-new" },
      {} as unknown as Extra,
    );

    expect(mockWsManager.connect).toHaveBeenCalled();
    expect(mockWsManager.sendMcpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "mcp:connect-to-session",
      }),
    );
    expect(mockClient.registerConnection).toHaveBeenCalledWith(
      "sess-new",
      mockWsManager,
      { platform: "native-mobile", test: undefined },
      undefined,
    );

    const parsed = JSON.parse((result.content[0] as TextContent).text);
    expect(parsed.success).toBe(true);
    expect(parsed.sessionId).toBe("sess-new");
    expect(parsed.platform).toBe("native-mobile");
  });

  it("should throw ToolError if sessionId is missing", async () => {
    await expect(instance.handle({}, {} as unknown as Extra)).rejects.toThrow(
      "sessionId argument is required",
    );
  });

  it("should throw ToolError if connect fails", async () => {
    (mockWsManager.connect as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("connection refused"),
    );
    await expect(
      instance.handle({ sessionId: "sess-fail" }, {} as unknown as Extra),
    ).rejects.toThrow("Failed to connect to session");
  });
});
