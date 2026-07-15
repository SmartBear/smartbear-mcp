import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import type { BearqClient } from "../../client.ts";
import { ChatWithQaLead } from "./chat-with-qa-lead.ts";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

// biome-ignore lint/security/noSecrets: false positive, this is a test suite name, not a secret
describe("ChatWithQaLead", () => {
  let mockClient: Pick<BearqClient, "getBaseUrl" | "getHeaders">;
  let instance: ChatWithQaLead;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new ChatWithQaLead(mockClient as unknown as BearqClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Chat with QA Lead");
  });

  it("should POST to /tasks with correct body and headers", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [12] }));

    const result = await instance.handle(
      { instruction: "List all failing tests" },
      {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
        body: JSON.stringify({
          agent: "qa-lead",
          instruction: "List all failing tests",
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as TextContent).text);
    expect(parsed.taskIds).toEqual([12]);
  });

  it("should throw ToolError on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Internal Server Error", { status: 500 });
    await expect(
      instance.handle(
        { instruction: "Do something" },
        {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
      ),
    ).rejects.toThrow("POST /tasks failed: 500");
  });

  it("should throw on empty instruction (Zod validation)", async () => {
    await expect(
      instance.handle(
        { instruction: "" },
        {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
      ),
    ).rejects.toThrow();
  });

  it("should throw on missing instruction (Zod validation)", async () => {
    await expect(
      instance.handle(
        {},
        {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
      ),
    ).rejects.toThrow();
  });
});
