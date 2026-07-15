import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReflectClient } from "../../client.ts";
import type { WebSocketManager } from "../../websocket-manager.ts";
import { DeletePreviousStep } from "./delete-previous-step.ts";

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("DeletePreviousStep", () => {
  let mockClient: Pick<ReflectClient, "getConnectedSession">;
  let mockWsManager: Pick<
    WebSocketManager,
    "sendMcpMessage" | "waitForResponse"
  >;
  let instance: DeletePreviousStep;

  beforeEach(() => {
    mockWsManager = {
      sendMcpMessage: vi.fn().mockResolvedValue(undefined),
      waitForResponse: vi.fn().mockResolvedValue({
        type: "mcp:delete-step:success",
        id: "some-id",
      }),
    };

    mockClient = {
      getConnectedSession: vi.fn().mockReturnValue(mockWsManager),
    };

    instance = new DeletePreviousStep(mockClient as unknown as ReflectClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Delete Previous Step");
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
    expect(instance.specification.destructive).toBe(true);
  });

  it("should send delete-step message and return success", async () => {
    const result = await instance.handle(
      { sessionId: "sess-1" },
      {} as unknown as Extra,
    );

    expect(mockWsManager.sendMcpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "mcp:delete-step",
      }),
    );

    const parsed = JSON.parse((result.content[0] as TextContent).text);
    expect(parsed.success).toBe(true);
    expect(parsed.message).toContain("deleted");
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
});
