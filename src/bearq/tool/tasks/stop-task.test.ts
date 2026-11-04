import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { StopTask } from "./stop-task";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("StopTask", () => {
  let mockClient: any;
  let instance: StopTask;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new StopTask(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Stop Task");
  });

  it("should DELETE /tasks/{id} and report stopped: true", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({}));

    const result = await instance.handle({ taskId: 33 }, {} as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks/33",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed).toEqual({ taskId: 33, stopped: true });
  });

  it("should include the problem detail in the error on non-2xx response", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({ title: "Conflict", detail: "Task is locked" }),
      { status: 409, statusText: "Conflict" },
    );

    await expect(instance.handle({ taskId: 33 }, {} as any)).rejects.toThrow(
      "DELETE /tasks/33 failed: 409 Conflict — Task is locked",
    );
  });

  it("should fall back to a bare status line when the error body has no detail", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });

    await expect(instance.handle({ taskId: 33 }, {} as any)).rejects.toThrow(
      "DELETE /tasks/33 failed: 404",
    );
  });

  it("should throw on non-positive taskId (Zod validation)", async () => {
    await expect(instance.handle({ taskId: 0 }, {} as any)).rejects.toThrow();
    await expect(instance.handle({ taskId: -2 }, {} as any)).rejects.toThrow();
  });
});
