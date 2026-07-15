import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { RefineAllDraftTests } from "./refine-all-draft-tests.ts";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("RefineAllDraftTests", () => {
  let mockClient: any;
  let instance: RefineAllDraftTests;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new RefineAllDraftTests(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Refine All Draft Tests");
  });

  it("should POST to /tasks with correct body and headers", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [3] }));

    const result = await instance.handle({}, {} as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
        body: JSON.stringify({ agent: "tester", mode: "refine" }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.taskIds).toEqual([3]);
  });

  it("should throw ToolError on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Forbidden", { status: 403 });
    await expect(instance.handle({}, {} as any)).rejects.toThrow(
      "POST /tasks failed: 403",
    );
  });
});
