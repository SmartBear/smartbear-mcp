import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { RunTestsInFunctionalAreas } from "../../../tool/tasks/run-tests-in-functional-areas";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("RunTestsInFunctionalAreas", () => {
  let mockClient: any;
  let instance: RunTestsInFunctionalAreas;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new RunTestsInFunctionalAreas(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Run Tests in Functional Areas");
  });

  it("should POST to /tasks with correct body and headers", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [8] }));

    const result = await instance.handle(
      { functionalAreas: [1, "Cart"] },
      {} as any,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
        body: JSON.stringify({
          agent: "tester",
          mode: "run",
          functionalAreas: [1, "Cart"],
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.taskIds).toEqual([8]);
  });

  it("should accept mixed numeric and string functional areas", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [9] }));

    await instance.handle(
      { functionalAreas: [1, "Cart", 2, "Checkout"] },
      {} as any,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks",
      expect.objectContaining({
        body: JSON.stringify({
          agent: "tester",
          mode: "run",
          functionalAreas: [1, "Cart", 2, "Checkout"],
        }),
      }),
    );
  });

  it("should include environment in body when provided", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [8] }));

    await instance.handle(
      { functionalAreas: [1, "Cart"], environment: "Staging" },
      {} as any,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks",
      expect.objectContaining({
        body: JSON.stringify({
          agent: "tester",
          mode: "run",
          functionalAreas: [1, "Cart"],
          environment: "Staging",
        }),
      }),
    );
  });

  it("should throw ToolError on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Unauthorized", { status: 401 });
    await expect(
      instance.handle({ functionalAreas: [1] }, {} as any),
    ).rejects.toThrow("POST /tasks failed: 401");
  });

  it("should throw on empty functionalAreas (Zod validation)", async () => {
    await expect(
      instance.handle({ functionalAreas: [] }, {} as any),
    ).rejects.toThrow();
  });

  it("should throw on missing functionalAreas (Zod validation)", async () => {
    await expect(instance.handle({}, {} as any)).rejects.toThrow();
  });
});
