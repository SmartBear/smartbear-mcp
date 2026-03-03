import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectToSession } from "../../../../../reflect/tool/recording/connect-to-session";

const mockWsManager = {
  connect: vi.fn().mockResolvedValue(undefined),
  disconnect: vi.fn().mockResolvedValue(undefined),
  sendMcpMessage: vi.fn().mockResolvedValue(undefined),
  waitForResponse: vi.fn(),
  onError: vi.fn(),
  isConnected: vi.fn().mockReturnValue(false),
};

vi.mock("../../../../../reflect/websocket-manager", () => ({
  WebSocketManager: vi.fn(() => mockWsManager),
}));

describe("ConnectToSession", () => {
  let mockClient: any;
  let instance: ConnectToSession;

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset mock implementations after clearAllMocks
    mockWsManager.connect.mockResolvedValue(undefined);
    mockWsManager.disconnect.mockResolvedValue(undefined);
    mockWsManager.sendMcpMessage.mockResolvedValue(undefined);
    mockWsManager.onError.mockImplementation(() => {});
    mockWsManager.isConnected.mockReturnValue(false);

    mockClient = {
      isSessionConnected: vi.fn().mockReturnValue(false),
      getSessionState: vi.fn().mockReturnValue(undefined),
      getWebSocketManager: vi.fn().mockReturnValue(undefined),
      getApiToken: vi.fn().mockReturnValue("test-api-key"),
      registerConnection: vi.fn(),
    };

    instance = new ConnectToSession(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Connect To Session");
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.parameters).toHaveLength(1);
    expect(instance.specification.parameters?.[0].name).toBe("sessionId");
    expect(instance.specification.parameters?.[0].required).toBe(true);
  });

  it("should return cached connection if already connected", async () => {
    mockClient.isSessionConnected.mockReturnValue(true);
    mockClient.getSessionState.mockReturnValue({ platform: "web" });

    const result = await instance.handle({ sessionId: "sess-1" }, {});
    expect(result.content[0].type).toBe("text");
    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.success).toBe(true);
    expect(parsed.platform).toBe("web");
    expect(mockClient.registerConnection).not.toHaveBeenCalled();
  });

  it("should connect, send connect message, and register connection", async () => {
    mockWsManager.waitForResponse.mockResolvedValue({
      type: "mcp:connect-to-session:success",
      id: "some-id",
      platform: "native-mobile",
    });

    const result = await instance.handle({ sessionId: "sess-new" }, {});

    expect(mockWsManager.connect).toHaveBeenCalled();
    expect(mockWsManager.sendMcpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "mcp:connect-to-session",
      }),
    );
    expect(mockClient.registerConnection).toHaveBeenCalledWith(
      "sess-new",
      mockWsManager,
      { platform: "native-mobile" },
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.success).toBe(true);
    expect(parsed.sessionId).toBe("sess-new");
    expect(parsed.platform).toBe("native-mobile");
  });

  it("should throw ToolError if sessionId is missing", async () => {
    await expect(instance.handle({}, {})).rejects.toThrow(
      "sessionId argument is required",
    );
  });

  it("should throw ToolError if connect fails", async () => {
    mockWsManager.connect.mockRejectedValue(new Error("connection refused"));
    await expect(
      instance.handle({ sessionId: "sess-fail" }, {}),
    ).rejects.toThrow("Failed to connect to session");
  });
});
