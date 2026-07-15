import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import type { BearqClient } from "../../client.ts";
import { ExpandApplicationModel } from "./expand-application-model.ts";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("ExpandApplicationModel", () => {
  let mockClient: Pick<BearqClient, "getBaseUrl" | "getHeaders">;
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
    instance = new ExpandApplicationModel(mockClient as unknown as BearqClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Expand Application Model");
  });

  it("should POST to /tasks without functionalArea when omitted", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [20] }));

    const result = await instance.handle(
      {},
      {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
    );

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

    const parsed = JSON.parse((result.content[0] as TextContent).text);
    expect(parsed.taskIds).toEqual([20]);
  });

  it("should POST to /tasks with numeric functionalArea id", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [21] }));

    await instance.handle(
      { functionalArea: 5 },
      {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks",
      expect.objectContaining({
        body: JSON.stringify({ agent: "explorer", functionalArea: 5 }),
      }),
    );
  });

  it("should POST to /tasks with string functionalArea name", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [22] }));

    await instance.handle(
      { functionalArea: "Checkout" },
      {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks",
      expect.objectContaining({
        body: JSON.stringify({ agent: "explorer", functionalArea: "Checkout" }),
      }),
    );
  });

  it("should throw ToolError on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Service Unavailable", { status: 503 });
    await expect(
      instance.handle(
        {},
        {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
      ),
    ).rejects.toThrow("POST /tasks failed: 503");
  });
});
