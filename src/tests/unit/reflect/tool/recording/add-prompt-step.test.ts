import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddPromptStep } from "../../../../../reflect/tool/recording/add-prompt-step";

describe("AddPromptStep", () => {
  let mockClient: any;
  let mockWsManager: any;
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

    instance = new AddPromptStep(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Add Prompt Step");
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
    expect(instance.specification.parameters).toHaveLength(2);
    expect(instance.specification.parameters?.[0].name).toBe("sessionId");
    expect(instance.specification.parameters?.[1].name).toBe("prompt");
  });

  it("should send add-prompt-step message and return success", async () => {
    const result = await instance.handle(
      { sessionId: "sess-1", prompt: "Click the login button" },
      {},
    );

    expect(mockWsManager.sendMcpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "mcp:add-prompt-step",
        prompt: "Click the login button",
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.success).toBe(true);
    expect(parsed.intent.prompt).toBe("Click the login button");
  });

  it("should throw ToolError if session is not connected", async () => {
    mockClient.getConnectedSession.mockImplementation(() => {
      throw new Error("not connected");
    });
    await expect(
      instance.handle({ sessionId: "sess-1", prompt: "do something" }, {}),
    ).rejects.toThrow("not connected");
  });

  it("should throw ToolError if sessionId is missing", async () => {
    await expect(
      instance.handle({ prompt: "do something" }, {}),
    ).rejects.toThrow("sessionId argument is required");
  });

  it("should throw ToolError if prompt is missing", async () => {
    await expect(
      instance.handle({ sessionId: "sess-1" }, {}),
    ).rejects.toThrow("prompt argument is required");
  });
});
