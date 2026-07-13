import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { RefineTestCases } from "./refine-test-cases";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("RefineTestCases", () => {
  let mockClient: any;
  let instance: RefineTestCases;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new RefineTestCases(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Refine Test Cases");
  });

  it("should POST to /tasks with correct body and headers", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [5] }));

    const result = await instance.handle({ testCaseIds: [10, 11] }, {} as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
        body: JSON.stringify({
          agent: "tester",
          mode: "refine",
          testCaseIds: [10, 11],
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.taskIds).toEqual([5]);
  });

  it("should throw ToolError on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Unauthorized", { status: 401 });
    await expect(
      instance.handle({ testCaseIds: [1] }, {} as any),
    ).rejects.toThrow("POST /tasks failed: 401");
  });

  it("should throw on empty testCaseIds (Zod validation)", async () => {
    await expect(
      instance.handle({ testCaseIds: [] }, {} as any),
    ).rejects.toThrow();
  });

  it("should throw on missing testCaseIds (Zod validation)", async () => {
    await expect(instance.handle({}, {} as any)).rejects.toThrow();
  });
});
