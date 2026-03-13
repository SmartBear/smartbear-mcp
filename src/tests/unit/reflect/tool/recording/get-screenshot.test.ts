import { beforeEach, describe, expect, it, vi } from "vitest";
import { GetScreenshot } from "../../../../../reflect/tool/recording/get-screenshot";

describe("GetScreenshot", () => {
  let mockClient: any;
  let mockWsManager: any;
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

    instance = new GetScreenshot(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Screenshot");
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.parameters).toHaveLength(1);
    expect(instance.specification.parameters?.[0].name).toBe("sessionId");
  });

  it("should send get-screenshot message and return image content", async () => {
    const result = await instance.handle({ sessionId: "sess-1" }, {});

    expect(mockWsManager.sendMcpMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "mcp:get-screenshot",
      }),
    );
    expect(mockWsManager.sendMcpMessage).toHaveBeenCalledWith(
      expect.not.objectContaining({ sessionId: expect.anything() }),
    );

    expect(result.content).toHaveLength(2);
    expect(result.content[0].type).toBe("image");
    expect((result.content[0] as any).data).toBe(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJ",
    );
    expect((result.content[0] as any).mimeType).toBe("image/png");

    expect(result.content[1].type).toBe("text");
    const parsed = JSON.parse((result.content[1] as any).text);
    expect(parsed.success).toBe(true);
    expect(parsed.state.currentUrl).toBe("https://example.com");
  });

  it("should throw ToolError if no imageBase64 in response", async () => {
    mockWsManager.waitForResponse.mockResolvedValue({
      type: "mcp:get-screenshot:success",
      id: "some-id",
      imageBase64: null,
      state: {},
    });

    await expect(instance.handle({ sessionId: "sess-1" }, {})).rejects.toThrow(
      "No imageBase64",
    );
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
