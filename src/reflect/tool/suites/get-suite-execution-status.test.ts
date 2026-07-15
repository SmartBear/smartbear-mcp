import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import type { ReflectClient } from "../../client.ts";
import { GetSuiteExecutionStatus } from "./get-suite-execution-status.ts";

type Extra = RequestHandlerExtra<ServerRequest, ServerNotification>;

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const statusMock = { id: "exec-1", status: "running", progress: 50 };

describe("GetSuiteExecutionStatus", () => {
  let mockClient: Pick<ReflectClient, "getHeaders">;
  let instance: GetSuiteExecutionStatus;

  beforeEach(() => {
    fetchMock.resetMocks();

    mockClient = {
      getHeaders: vi.fn().mockReturnValue({
        "X-API-KEY": "test-api-key",
        "Content-Type": "application/json",
      }),
    };

    instance = new GetSuiteExecutionStatus(
      mockClient as unknown as ReflectClient,
    );
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Suite Execution Status");
  });

  it("should call status API and return results", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(statusMock));

    const result = await instance.handle(
      { suiteId: "suite-1", executionId: "exec-1" },
      {} as unknown as Extra,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.reflect.run/v1/suites/suite-1/executions/exec-1",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as TextContent).text);
    expect(parsed.status).toBe("running");
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
    fetchMock.mockResponseOnce("Server Error", { status: 500 });
    await expect(
      instance.handle(
        { suiteId: "suite-1", executionId: "exec-1" },
        {} as unknown as Extra,
      ),
    ).rejects.toThrow("Failed to get suite execution status");
  });
});
