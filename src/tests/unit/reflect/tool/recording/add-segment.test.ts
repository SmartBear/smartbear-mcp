import { beforeEach, describe, expect, it, vi } from "vitest";
import { AddSegment } from "../../../../../reflect/tool/recording/add-segment";

describe("AddSegment", () => {
  let mockClient: any;
  let mockWsManager: any;
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

    instance = new AddSegment(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Add Segment");
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
    expect(instance.specification.parameters).toHaveLength(2);
    expect(instance.specification.parameters?.[0].name).toBe("sessionId");
    expect(instance.specification.parameters?.[1].name).toBe("segmentId");
    expect(instance.specification.parameters?.[1].required).toBe(true);
  });

  it("should send add-segment message and return success", async () => {
    const result = await instance.handle(
      { sessionId: "sess-1", segmentId: 42 },
      {},
    );

    expect(mockWsManager.sendMcpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "mcp:add-segment",
        segmentId: 42,
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.success).toBe(true);
    expect(parsed.segmentId).toBe(42);
  });

  it("should throw ToolError if session is not connected", async () => {
    mockClient.getConnectedSession.mockImplementation(() => {
      throw new Error("not connected");
    });
    await expect(
      instance.handle({ sessionId: "sess-1", segmentId: 1 }, {}),
    ).rejects.toThrow("not connected");
  });

  it("should throw ToolError if sessionId is missing", async () => {
    await expect(instance.handle({ segmentId: 1 }, {})).rejects.toThrow(
      "sessionId argument is required",
    );
  });
});
