import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { CreateSegment } from "./create-segment";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const segmentArgs = {
  name: "Login Flow",
  type: "web",
  deviceProfile: "desktop",
  steps: [
    { type: "input", selector: "#user", inputText: "alice" },
    { type: "click", selector: "#submit" },
  ],
};

describe("CreateSegment", () => {
  let mockClient: any;
  let instance: CreateSegment;

  beforeEach(() => {
    fetchMock.resetMocks();

    mockClient = {
      getHeaders: vi.fn().mockReturnValue({
        "X-API-KEY": "test-api-key",
        "Content-Type": "application/json",
      }),
    };

    instance = new CreateSegment(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Create Segment");
    expect(instance.specification.toolset).toBe("Tests");
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
  });

  it("should not expose the 'segment' step type for segments", () => {
    const shape = (instance.specification.inputSchema as any).shape;
    const stepShape = shape.steps.element.shape;
    expect(stepShape.type.options).not.toContain("segment");
    expect(stepShape.type.options).toContain("click");
  });

  it("should POST to /v1/segments and return the created id", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ id: 7 }));

    const result = await instance.handle(segmentArgs as any, {} as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.reflect.run/v1/segments",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        body: JSON.stringify(segmentArgs),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.success).toBe(true);
    expect(parsed.id).toBe(7);
    expect(parsed.message).toContain("7");
  });

  it("should throw a ToolError with the server message on failure", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({
        message: "Segment with name Login Flow already exists.",
        errorId: "abc-123",
      }),
      { status: 400 },
    );

    await expect(
      instance.handle(segmentArgs as any, {} as any),
    ).rejects.toThrow("Segment with name Login Flow already exists.");
  });
});
