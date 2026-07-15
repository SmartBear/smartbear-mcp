import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import type { BearqClient } from "../../client.ts";
import { StopTask } from "./stop-task.ts";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("StopTask", () => {
  let mockClient: Pick<BearqClient, "getBaseUrl" | "getHeaders">;
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
    instance = new StopTask(mockClient as unknown as BearqClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Stop Task");
  });

  it("should DELETE /tasks/{id} with correct method and headers", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ cancelled: true }));

    const result = await instance.handle(
      { taskId: 33 },
      {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks/33",
      expect.objectContaining({
        method: "DELETE",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as TextContent).text);
    expect(parsed.cancelled).toBe(true);
  });

  it("should throw ToolError with taskId in message on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });
    await expect(
      instance.handle(
        { taskId: 33 },
        {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
      ),
    ).rejects.toThrow("DELETE /tasks/33 failed: 404");
  });

  it("should throw on non-positive taskId (Zod validation)", async () => {
    await expect(
      instance.handle(
        { taskId: 0 },
        {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
      ),
    ).rejects.toThrow();
    await expect(
      instance.handle(
        { taskId: -2 },
        {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
      ),
    ).rejects.toThrow();
  });
});
