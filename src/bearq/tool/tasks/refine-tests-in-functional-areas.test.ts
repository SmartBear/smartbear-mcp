import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import type { BearqClient } from "../../client.ts";
import { RefineTestsInFunctionalAreas } from "./refine-tests-in-functional-areas.ts";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("RefineTestsInFunctionalAreas", () => {
  let mockClient: Pick<BearqClient, "getBaseUrl" | "getHeaders">;
  let instance: RefineTestsInFunctionalAreas;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new RefineTestsInFunctionalAreas(
      mockClient as unknown as BearqClient,
    );
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe(
      "Refine Tests in Functional Areas",
    );
  });

  it("should POST to /tasks with correct body and headers", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [6] }));

    const result = await instance.handle(
      { functionalAreas: [2, "Login"] },
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
          agent: "tester",
          mode: "refine",
          functionalAreas: [2, "Login"],
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as TextContent).text);
    expect(parsed.taskIds).toEqual([6]);
  });

  it("should accept mixed numeric and string functional areas", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ taskIds: [7] }));

    await instance.handle(
      { functionalAreas: [1, "Cart", 2, "Checkout"] },
      {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/tasks",
      expect.objectContaining({
        body: JSON.stringify({
          agent: "tester",
          mode: "refine",
          functionalAreas: [1, "Cart", 2, "Checkout"],
        }),
      }),
    );
  });

  it("should throw ToolError on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Unauthorized", { status: 401 });
    await expect(
      instance.handle(
        { functionalAreas: [1] },
        {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
      ),
    ).rejects.toThrow("POST /tasks failed: 401");
  });

  it("should throw on empty functionalAreas (Zod validation)", async () => {
    await expect(
      instance.handle(
        { functionalAreas: [] },
        {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
      ),
    ).rejects.toThrow();
  });

  it("should throw on missing functionalAreas (Zod validation)", async () => {
    await expect(
      instance.handle(
        {},
        {} as unknown as RequestHandlerExtra<ServerRequest, ServerNotification>,
      ),
    ).rejects.toThrow();
  });
});
