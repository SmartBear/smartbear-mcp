import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { ChatWithQaLead } from "../../../../../bearq/tool/tasks/chat-with-qa-lead";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("ChatWithQaLead", () => {
  let mockClient: any;
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
    instance = new ChatWithQaLead(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Chat with QA Lead");
  });

  it("should POST to /tasks with correct body and headers", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [12] }));

    const result = await instance.handle(
      { instruction: "List all failing tests" },
      {} as any,
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

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.taskIds).toEqual([12]);
  });

  it("should throw ToolError on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Internal Server Error", { status: 500 });
    await expect(
      instance.handle({ instruction: "Do something" }, {} as any),
    ).rejects.toThrow("POST /tasks failed: 500");
  });

  it("should throw on empty instruction (Zod validation)", async () => {
    await expect(
      instance.handle({ instruction: "" }, {} as any),
    ).rejects.toThrow();
  });

  it("should throw on missing instruction (Zod validation)", async () => {
    await expect(instance.handle({}, {} as any)).rejects.toThrow();
  });
});
