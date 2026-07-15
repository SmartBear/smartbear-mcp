import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReflectClient } from "../../client.ts";
import type { WebSocketManager } from "../../websocket-manager.ts";
import { AddSegment } from "./add-segment.ts";

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("AddSegment", () => {
  let mockClient: Pick<ReflectClient, "getConnectedSession">;
  let mockWsManager: Pick<
    WebSocketManager,
    "sendMcpMessage" | "waitForResponse"
  >;
  let instance: AddSegment;

  beforeEach(() => {
    mockWsManager = {
      sendMcpMessage: vi.fn().mockResolvedValue(undefined),
      waitForResponse: vi.fn().mockResolvedValue({
        type: "mcp:add-segment:success",
        id: "some-id",
      }),
    };

    mockClient = {
      getConnectedSession: vi.fn().mockReturnValue(mockWsManager),
    };

    instance = new AddSegment(mockClient as unknown as ReflectClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Add Segment");
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
  });

  it("should send add-segment message and return success", async () => {
    const result = await instance.handle(
      { sessionId: "sess-1", segmentId: 42 },
      {} as unknown as Extra,
    );

    expect(mockWsManager.sendMcpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "mcp:add-segment",
        segmentId: 42,
      }),
    );

    const parsed = JSON.parse((result.content[0] as TextContent).text);
    expect(parsed.success).toBe(true);
    expect(parsed.segmentId).toBe(42);
  });

  it("should throw ToolError if session is not connected", async () => {
    (
      mockClient.getConnectedSession as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {
      throw new Error("not connected");
    });
    await expect(
      instance.handle(
        { sessionId: "sess-1", segmentId: 1 },
        {} as unknown as Extra,
      ),
    ).rejects.toThrow("not connected");
  });

  it("should throw ToolError if sessionId is missing", async () => {
    await expect(
      instance.handle({ segmentId: 1 }, {} as unknown as Extra),
    ).rejects.toThrow("sessionId argument is required");
  });
});
