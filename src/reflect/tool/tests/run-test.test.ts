import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import type { ReflectClient } from "../../client.ts";
import { RunTest } from "./run-test.ts";

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const executionMock = { id: "exec-new", status: "queued" };

describe("RunTest", () => {
  let mockClient: Pick<ReflectClient, "getHeaders">;
  let instance: RunTest;

  beforeEach(() => {
    fetchMock.resetMocks();

    mockClient = {
      getHeaders: vi.fn().mockReturnValue({
        "X-API-KEY": "test-api-key",
        "Content-Type": "application/json",
      }),
    };

    instance = new RunTest(mockClient as unknown as ReflectClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Run Test");
  });

  it("should POST to run test and return results", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(executionMock));

    const result = await instance.handle(
      { testId: "test-1" },
      {} as unknown as Extra,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.reflect.run/v1/tests/test-1/executions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as TextContent).text);
    expect(parsed.id).toBe("exec-new");
    expect(parsed.status).toBe("queued");
  });

  it("should throw ToolError if testId is missing", async () => {
    await expect(instance.handle({}, {} as unknown as Extra)).rejects.toThrow(
      "testId argument is required",
    );
  });

  it("should throw ToolError if fetch fails", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });
    await expect(
      instance.handle({ testId: "test-1" }, {} as unknown as Extra),
    ).rejects.toThrow("Failed to run test");
  });
});
