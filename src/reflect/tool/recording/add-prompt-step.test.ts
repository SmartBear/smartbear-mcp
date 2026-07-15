import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReflectClient } from "../../client.ts";
import type { WebSocketManager } from "../../websocket-manager.ts";
import { AddPromptStep } from "./add-prompt-step.ts";

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

describe("AddPromptStep", () => {
  let mockClient: Pick<ReflectClient, "getConnectedSession">;
  let mockWsManager: Pick<
    WebSocketManager,
    "sendMcpMessage" | "waitForResponse"
  >;
  let instance: AddPromptStep;

  beforeEach(() => {
    mockWsManager = {
      sendMcpMessage: vi.fn().mockResolvedValue(undefined),
      waitForResponse: vi.fn().mockResolvedValue({
        type: "mcp:add-prompt-step:success",
        id: "some-id",
        result: { type: "click", response: true },
      }),
    };

    mockClient = {
      getConnectedSession: vi.fn().mockReturnValue(mockWsManager),
    };

    instance = new AddPromptStep(mockClient as unknown as ReflectClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Add Prompt Step");
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
  });

  it("should send add-prompt-step message and return success", async () => {
    const result = await instance.handle(
      { sessionId: "sess-1", prompt: "Click the login button" },
      {} as unknown as Extra,
    );

    expect(mockWsManager.sendMcpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "mcp:add-prompt-step",
        prompt: "Click the login button",
      }),
    );

    const parsed = JSON.parse((result.content[0] as TextContent).text);
    expect(parsed.success).toBe(true);
    expect(parsed.intent.prompt).toBe("Click the login button");
  });

  it("should throw ToolError if session is not connected", async () => {
    (
      mockClient.getConnectedSession as ReturnType<typeof vi.fn>
    ).mockImplementation(() => {
      throw new Error("not connected");
    });
    await expect(
      instance.handle(
        { sessionId: "sess-1", prompt: "do something" },
        {} as unknown as Extra,
      ),
    ).rejects.toThrow("not connected");
  });

  it("should throw ToolError if sessionId is missing", async () => {
    await expect(
      instance.handle({ prompt: "do something" }, {} as unknown as Extra),
    ).rejects.toThrow("sessionId argument is required");
  });

  it("should throw ToolError if prompt is missing", async () => {
    await expect(
      instance.handle({ sessionId: "sess-1" }, {} as unknown as Extra),
    ).rejects.toThrow("prompt argument is required");
  });
});
