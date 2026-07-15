import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import type { ReflectClient } from "../../client.ts";
import { CancelSuiteExecution } from "./cancel-suite-execution.ts";

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const cancelMock = { id: "exec-1", status: "cancelled" };

describe("CancelSuiteExecution", () => {
  let mockClient: Pick<ReflectClient, "getHeaders">;
  let instance: CancelSuiteExecution;

  beforeEach(() => {
    fetchMock.resetMocks();

    mockClient = {
      getHeaders: vi.fn().mockReturnValue({
        "X-API-KEY": "test-api-key",
        "Content-Type": "application/json",
      }),
    };

    instance = new CancelSuiteExecution(mockClient as unknown as ReflectClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Cancel Suite Execution");
  });

  it("should PATCH to cancel execution and return results", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(cancelMock));

    const result = await instance.handle(
      { suiteId: "suite-1", executionId: "exec-1" },
      {} as unknown as Extra,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.reflect.run/v1/suites/suite-1/executions/exec-1/cancel",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as TextContent).text);
    expect(parsed.status).toBe("cancelled");
  });

  it("should throw ToolError if suiteId is missing", async () => {
    await expect(
      instance.handle({ executionId: "exec-1" }, {} as unknown as Extra),
    ).rejects.toThrow("Both suiteId and executionId arguments are required");
  });

  it("should throw ToolError if executionId is missing", async () => {
    await expect(
      instance.handle({ suiteId: "suite-1" }, {} as unknown as Extra),
    ).rejects.toThrow("Both suiteId and executionId arguments are required");
  });

  it("should throw ToolError if fetch fails", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });
    await expect(
      instance.handle(
        { suiteId: "suite-1", executionId: "exec-1" },
        {} as unknown as Extra,
      ),
    ).rejects.toThrow("Failed to cancel suite execution");
  });
});
