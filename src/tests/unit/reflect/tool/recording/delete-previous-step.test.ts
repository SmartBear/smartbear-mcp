import { beforeEach, describe, expect, it, vi } from "vitest";
import { DeletePreviousStep } from "../../../../../reflect/tool/recording/delete-previous-step";

describe("DeletePreviousStep", () => {
  let mockClient: any;
  let mockWsManager: any;
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

    instance = new DeletePreviousStep(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Delete Previous Step");
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
    expect(instance.specification.destructive).toBe(true);
    expect(instance.specification.parameters).toHaveLength(1);
    expect(instance.specification.parameters?.[0].name).toBe("sessionId");
  });

  it("should send delete-step message and return success", async () => {
    const result = await instance.handle({ sessionId: "sess-1" }, {});

    expect(mockWsManager.sendMcpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "mcp:delete-step",
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.success).toBe(true);
    expect(parsed.message).toContain("deleted");
  });

  it("should throw ToolError if session is not connected", async () => {
    mockClient.getConnectedSession.mockImplementation(() => {
      throw new Error("not connected");
    });
    await expect(instance.handle({ sessionId: "sess-1" }, {})).rejects.toThrow(
      "not connected",
    );
  });

  it("should throw ToolError if sessionId is missing", async () => {
    await expect(instance.handle({}, {})).rejects.toThrow(
      "sessionId argument is required",
    );
  });
});
