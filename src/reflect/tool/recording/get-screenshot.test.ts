import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ImageContent,
  ServerNotification,
  ServerRequest,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReflectClient } from "../../client.ts";
import type { WebSocketManager } from "../../websocket-manager.ts";
import { GetScreenshot } from "./get-screenshot.ts";

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("GetScreenshot", () => {
  let mockClient: Pick<ReflectClient, "getConnectedSession">;
  let mockWsManager: Pick<
    WebSocketManager,
    "sendMcpMessage" | "waitForResponse"
  >;
  let instance: GetScreenshot;

  beforeEach(() => {
    mockWsManager = {
      sendMcpMessage: vi.fn().mockResolvedValue(undefined),
      waitForResponse: vi.fn().mockResolvedValue({
        type: "mcp:get-screenshot:success",
        id: "some-id",
        imageBase64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ",
        state: { currentUrl: "https://example.com" },
      }),
    };

    mockClient = {
      getConnectedSession: vi.fn().mockReturnValue(mockWsManager),
    };

    instance = new GetScreenshot(mockClient as unknown as ReflectClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Screenshot");
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
  });

  it("should send get-screenshot message and return image content", async () => {
    const result = await instance.handle(
      { sessionId: "sess-1" },
      {} as unknown as Extra,
    );

    expect(mockWsManager.sendMcpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "mcp:get-screenshot",
      }),
    );
    expect(mockWsManager.sendMcpMessage).toHaveBeenCalledWith(
      expect.not.objectContaining({ sessionId: expect.anything() }),
    );

    expect(result.content).toHaveLength(2);
    expect(result.content[0]?.type).toBe("image");
    expect((result.content[0] as ImageContent).data).toBe(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ",
    );
    expect((result.content[0] as ImageContent).mimeType).toBe("image/png");

    expect(result.content[1]?.type).toBe("text");
    const parsed = JSON.parse((result.content[1] as TextContent).text);
    expect(parsed.success).toBe(true);
    expect(parsed.state.currentUrl).toBe("https://example.com");
  });

  it("should throw ToolError if no imageBase64 in response", async () => {
    (
      mockWsManager.waitForResponse as ReturnType<typeof vi.fn>
    ).mockResolvedValue({
      type: "mcp:get-screenshot:success",
      id: "some-id",
      imageBase64: null,
      state: {},
    });

    await expect(
      instance.handle({ sessionId: "sess-1" }, {} as unknown as Extra),
    ).rejects.toThrow("No imageBase64");
  });

  it("should throw ToolError if session is not connected", async () => {
    (
      mockClient.getConnectedSession as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {
      throw new Error("not connected");
    });
    await expect(
      instance.handle({ sessionId: "sess-1" }, {} as unknown as Extra),
    ).rejects.toThrow("not connected");
  });

  it("should throw ToolError if sessionId is missing", async () => {
    await expect(instance.handle({}, {} as unknown as Extra)).rejects.toThrow(
      "sessionId argument is required",
    );
  });

  it("should default to png format when format is not specified", async () => {
    await instance.handle({ sessionId: "sess-1" }, {} as unknown as Extra);

    expect(mockWsManager.sendMcpMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "mcp:get-screenshot", format: "png" }),
    );
  });

  it("should use jpeg format when format is jpeg", async () => {
    const result = await instance.handle(
      { sessionId: "sess-1", format: "jpeg" },
      {} as unknown as Extra,
    );

    expect(mockWsManager.sendMcpMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "mcp:get-screenshot", format: "jpeg" }),
    );
    expect((result.content[0] as ImageContent).mimeType).toBe("image/jpeg");
    const parsed = JSON.parse((result.content[1] as TextContent).text);
    expect(parsed.format).toBe("jpeg");
  });

  it("should use png format when format is png", async () => {
    const result = await instance.handle(
      { sessionId: "sess-1", format: "png" },
      {} as unknown as Extra,
    );

    expect(mockWsManager.sendMcpMessage).toHaveBeenCalledWith(
      expect.objectContaining({ type: "mcp:get-screenshot", format: "png" }),
    );
    expect((result.content[0] as ImageContent).mimeType).toBe("image/png");
    const parsed = JSON.parse((result.content[1] as TextContent).text);
    expect(parsed.format).toBe("png");
  });
});
