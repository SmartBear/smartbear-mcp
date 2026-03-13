import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { cancelSuiteExecution } from "../../../../../reflect/tool/suites/cancel-suite-execution";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const cancelMock = { id: "exec-1", status: "cancelled" };

describe("CancelSuiteExecution", () => {
  let mockClient: any;
  const registerTool = vi.fn();
  const getHandler = () => registerTool.mock.calls.at(-1)?.[1];

  beforeEach(() => {
    fetchMock.resetMocks();

    mockClient = {
      getHeaders: vi.fn().mockReturnValue({
        "X-API-KEY": "test-api-key",
        "Content-Type": "application/json",
      }),
    };

    cancelSuiteExecution.register(mockClient, registerTool);
  });

  it("should set specification correctly", () => {
    expect(registerTool).toHaveBeenLastCalledWith(
      {
        title: "Cancel Suite Execution",
        summary: "Cancel a reflect suite execution",
        inputSchema: expect.any(Object),
      },
      expect.any(Function),
    );
  });

  it("should PATCH to cancel execution and return results", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(cancelMock));

    const handle = getHandler();
    const result = await handle(
      { suiteId: "suite-1", executionId: "exec-1" },
      {},
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.reflect.run/v1/suites/suite-1/executions/exec-1/cancel",
      expect.objectContaining({
        method: "PATCH",
        headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.status).toBe("cancelled");
  });

  it("should throw ToolError if suiteId is missing", async () => {
    const handle = getHandler();
    await expect(handle({ executionId: "exec-1" }, {})).rejects.toThrow(
      "Both suiteId and executionId arguments are required",
    );
  });

  it("should throw ToolError if executionId is missing", async () => {
    const handle = getHandler();
    await expect(handle({ suiteId: "suite-1" }, {})).rejects.toThrow(
      "Both suiteId and executionId arguments are required",
    );
  });

  it("should throw ToolError if fetch fails", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });
    const handle = getHandler();
    await expect(
      handle({ suiteId: "suite-1", executionId: "exec-1" }, {}),
    ).rejects.toThrow("Failed to cancel suite execution");
  });
});
