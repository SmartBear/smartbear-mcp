import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import type { BearqClient } from "../../client.ts";
import { GetTask } from "./get-task.ts";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("GetTask", () => {
  let mockClient: Pick<BearqClient, "getBaseUrl" | "getHeaders">;
  let instance: GetTask;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new GetTask(mockClient as unknown as BearqClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Task");
  });

  it("should GET /tasks/{id} with correct method and headers", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ id: 42, status: "running" }));

    const result = await instance.handle(
      { taskId: 42 },
      {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks/42",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as TextContent).text);
    expect(parsed.id).toBe(42);
  });

  it("should throw ToolError with taskId in message on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });
    await expect(
      instance.handle(
        { taskId: 99 },
        {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
      ),
    ).rejects.toThrow("GET /tasks/99 failed: 404");
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
        { taskId: -1 },
        {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
      ),
    ).rejects.toThrow();
  });
});
