import { beforeEach, describe, expect, it, vi } from "vitest";
import { WaitForTask } from "./wait-for-task";

function makeStream(...chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

describe("WaitForTask", () => {
  let mockClient: any;
  let instance: WaitForTask;

  beforeEach(() => {
    vi.restoreAllMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new WaitForTask(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Wait For Task");
  });

  it("should pass every SSE event through verbatim until done", async () => {
    const metadata = {
      taskId: 1,
      taskStatus: "running",
      metadata: { type: "tester" },
    };
    const entries1 = [{ kind: "message", text: "step 1" }];
    const entries2 = [{ kind: "message", text: "step 2" }];
    const done = { status: "completed", result: "all passed" };

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        makeStream(
          sseFrame("metadata", metadata),
          sseFrame("activityLogEntries", entries1),
          sseFrame("activityLogEntries", entries2),
          sseFrame("done", done),
        ),
        { status: 200 },
      ),
    );

    const result = await instance.handle({ taskId: 1 }, {} as any);
    const parsed = JSON.parse((result.content[0] as any).text);

    expect(parsed.events).toEqual([
      { event: "metadata", data: metadata },
      { event: "activityLogEntries", data: entries1 },
      { event: "activityLogEntries", data: entries2 },
      { event: "done", data: done },
    ]);
  });

  it("should handle terminal-on-connect when metadata + activityLogEntries + done arrive in one chunk", async () => {
    const metadata = { taskId: 5 };
    const entries = [{ kind: "log" }];
    const done = { status: "failed", result: null };
    const allAtOnce =
      sseFrame("metadata", metadata) +
      sseFrame("activityLogEntries", entries) +
      sseFrame("done", done);

    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(makeStream(allAtOnce), { status: 200 }),
    );

    const result = await instance.handle({ taskId: 5 }, {} as any);
    const parsed = JSON.parse((result.content[0] as any).text);

    expect(parsed.events).toEqual([
      { event: "metadata", data: metadata },
      { event: "activityLogEntries", data: entries },
      { event: "done", data: done },
    ]);
  });

  it("should pass timeout event through unchanged", async () => {
    const metadata = { taskId: 2 };
    const timeout = {
      reason: "max_stream_lifetime_exceeded",
      message: "task killed",
    };
    const fetchSpy = vi
      .spyOn(global, "fetch")
      .mockResolvedValueOnce(
        new Response(
          makeStream(
            sseFrame("metadata", metadata),
            sseFrame("timeout", timeout),
          ),
          { status: 200 },
        ),
      );

    const result = await instance.handle({ taskId: 2 }, {} as any);
    const parsed = JSON.parse((result.content[0] as any).text);

    expect(parsed.events).toEqual([
      { event: "metadata", data: metadata },
      { event: "timeout", data: timeout },
    ]);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("should throw when stream closes without done or timeout", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        makeStream(
          sseFrame("metadata", { taskId: 4 }),
          sseFrame("activityLogEntries", [{ kind: "log" }]),
        ),
        { status: 200 },
      ),
    );

    await expect(instance.handle({ taskId: 4 }, {} as any)).rejects.toThrow(
      "closed without a done or timeout event",
    );
  });

  it("should throw ToolError on non-2xx response", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response("Unauthorized", { status: 401, statusText: "Unauthorized" }),
    );

    await expect(instance.handle({ taskId: 3 }, {} as any)).rejects.toThrow(
      "GET /tasks/3/stream failed: 401",
    );
  });

  it("should ignore ping comment lines", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        makeStream(
          sseFrame("metadata", { taskId: 6 }),
          ": ping\n\n",
          sseFrame("done", { status: "completed", result: null }),
        ),
        { status: 200 },
      ),
    );

    const result = await instance.handle({ taskId: 6 }, {} as any);
    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.events.at(-1)).toEqual({
      event: "done",
      data: { status: "completed", result: null },
    });
  });

  it("should emit one progress notification per SSE event in order", async () => {
    const entries1 = [{ id: 1 }, { id: 2 }];
    const entries2 = [{ id: 3 }];
    const done = { status: "completed", result: "ok" };
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        makeStream(
          sseFrame("metadata", { taskId: 9 }),
          sseFrame("activityLogEntries", entries1),
          sseFrame("activityLogEntries", entries2),
          sseFrame("done", done),
        ),
        { status: 200 },
      ),
    );

    const notifications: any[] = [];
    const extra = {
      _meta: { progressToken: "tok-1" },
      sendNotification: vi.fn(async (n) => {
        notifications.push(n);
      }),
    };

    await instance.handle({ taskId: 9 }, extra as any);

    expect(notifications.map((n) => n.params.progress)).toEqual([1, 2, 3, 4]);
    expect(notifications.map((n) => JSON.parse(n.params.message))).toEqual([
      { event: "metadata", data: { taskId: 9 } },
      { event: "activityLogEntries", data: entries1 },
      { event: "activityLogEntries", data: entries2 },
      { event: "done", data: done },
    ]);
    expect(notifications.every((n) => n.params.progressToken === "tok-1")).toBe(
      true,
    );
  });

  it("should not call sendNotification when progressToken is absent", async () => {
    vi.spyOn(global, "fetch").mockResolvedValueOnce(
      new Response(
        makeStream(
          sseFrame("metadata", { taskId: 10 }),
          sseFrame("activityLogEntries", [{ id: 1 }]),
          sseFrame("done", { status: "completed", result: null }),
        ),
        { status: 200 },
      ),
    );

    const sendNotification = vi.fn();
    await instance.handle({ taskId: 10 }, {
      _meta: {},
      sendNotification,
    } as any);

    expect(sendNotification).not.toHaveBeenCalled();
  });
});
