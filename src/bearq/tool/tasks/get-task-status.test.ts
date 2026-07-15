import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { GetTaskStatus } from "./get-task-status.ts";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("GetTaskStatus", () => {
  let mockClient: any;
  let instance: GetTaskStatus;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new GetTaskStatus(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Task Status");
  });

  it("should GET /tasks/{id}/status with correct method and headers", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ status: "completed" }));

    const result = await instance.handle({ taskId: 15 }, {} as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks/15/status",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.status).toBe("completed");
  });

  it("should throw ToolError with taskId in message on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });
    await expect(instance.handle({ taskId: 15 }, {} as any)).rejects.toThrow(
      "GET /tasks/15/status failed: 404",
    );
  });

  it("should throw on non-positive taskId (Zod validation)", async () => {
    await expect(instance.handle({ taskId: 0 }, {} as any)).rejects.toThrow();
    await expect(instance.handle({ taskId: -5 }, {} as any)).rejects.toThrow();
  });
});
