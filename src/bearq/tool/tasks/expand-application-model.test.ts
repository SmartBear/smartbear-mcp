import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { ExpandApplicationModel } from "./expand-application-model.ts";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("ExpandApplicationModel", () => {
  let mockClient: any;
  let instance: ExpandApplicationModel;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new ExpandApplicationModel(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Expand Application Model");
  });

  it("should POST to /tasks without functionalArea when omitted", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [20] }));

    const result = await instance.handle({}, {} as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
        body: JSON.stringify({ agent: "explorer" }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.taskIds).toEqual([20]);
  });

  it("should POST to /tasks with numeric functionalArea id", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [21] }));

    await instance.handle({ functionalArea: 5 }, {} as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks",
      expect.objectContaining({
        body: JSON.stringify({ agent: "explorer", functionalArea: 5 }),
      }),
    );
  });

  it("should POST to /tasks with string functionalArea name", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [22] }));

    await instance.handle({ functionalArea: "Checkout" }, {} as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks",
      expect.objectContaining({
        body: JSON.stringify({ agent: "explorer", functionalArea: "Checkout" }),
      }),
    );
  });

  it("should throw ToolError on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Service Unavailable", { status: 503 });
    await expect(instance.handle({}, {} as any)).rejects.toThrow(
      "POST /tasks failed: 503",
    );
  });
});
