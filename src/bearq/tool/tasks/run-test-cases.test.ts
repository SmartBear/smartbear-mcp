import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { RunTestCases } from "./run-test-cases.ts";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("RunTestCases", () => {
  let mockClient: any;
  let instance: RunTestCases;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new RunTestCases(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Run Test Cases");
  });

  it("should POST to /tasks with correct body and headers", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [42] }));

    const result = await instance.handle({ testCaseIds: [1, 2, 3] }, {} as any);

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
          testCaseIds: [1, 2, 3],
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.taskIds).toEqual([42]);
  });

  it("should include environment in body when provided", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [42] }));

    await instance.handle(
      { testCaseIds: [1, 2, 3], environment: "Staging" },
      {} as any,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks",
      expect.objectContaining({
        body: JSON.stringify({
          agent: "tester",
          mode: "run",
          testCaseIds: [1, 2, 3],
          environment: "Staging",
        }),
      }),
    );
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
