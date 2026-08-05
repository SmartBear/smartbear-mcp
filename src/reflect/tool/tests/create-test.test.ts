import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { CreateTest } from "./create-test";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const webTestArgs = {
  name: "Login Test",
  type: "web",
  deviceProfile: "desktop",
  steps: [
    { type: "browser-navigate", url: "https://example.com" },
    { type: "click", selector: "#login" },
  ],
};

describe("CreateTest", () => {
  let mockClient: any;
  let instance: CreateTest;

  beforeEach(() => {
    fetchMock.resetMocks();

    mockClient = {
      getHeaders: vi.fn().mockReturnValue({
        "X-API-KEY": "test-api-key",
        "Content-Type": "application/json",
      }),
    };

    instance = new CreateTest(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Create Test");
    expect(instance.specification.toolset).toBe("Tests");
    expect(instance.specification.readOnly).toBe(false);
    expect(instance.specification.idempotent).toBe(false);
  });

  it("should expose the 'segment' step type for tests", () => {
    const shape = (instance.specification.inputSchema as any).shape;
    const stepShape = shape.steps.element.shape;
    expect(stepShape.type.options).toContain("segment");
    expect(stepShape.type.options).toContain("browser-navigate");
  });

  it("should POST to /v1/tests and return the created id", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ id: 42 }));

    const result = await instance.handle(webTestArgs as any, {} as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.reflect.run/v1/tests",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
        body: JSON.stringify(webTestArgs),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.success).toBe(true);
    expect(parsed.id).toBe(42);
    expect(parsed.message).toContain("42");
  });

  it("should throw a ToolError with the server message on failure", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({
        message: "Web tests must begin with a navigation step.",
        errorId: "abc-123",
      }),
      { status: 400 },
    );

    await expect(
      instance.handle(webTestArgs as any, {} as any),
    ).rejects.toThrow("Web tests must begin with a navigation step.");
  });

  it("should throw a ToolError even when the error body is not JSON", async () => {
    fetchMock.mockResponseOnce("Bad Request", { status: 400 });

    await expect(
      instance.handle(webTestArgs as any, {} as any),
    ).rejects.toThrow("Failed to create test: 400");
  });

  it("accepts valid input through the declared input schema", () => {
    const schema = instance.specification.inputSchema as any;
    const result = schema.safeParse(webTestArgs);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(webTestArgs);
  });
});
