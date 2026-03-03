import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { CancelSuiteExecution } from "../../../../../reflect/tool/suites/cancel-suite-execution";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const cancelMock = { id: "exec-1", status: "cancelled" };

describe("CancelSuiteExecution", () => {
  let mockClient: any;
  let instance: CancelSuiteExecution;

  beforeEach(() => {
    fetchMock.resetMocks();

    mockClient = {
      getHeaders: vi.fn().mockReturnValue({
        "X-API-KEY": "test-api-key",
        "Content-Type": "application/json",
      }),
    };

    instance = new CancelSuiteExecution(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Cancel Suite Execution");
    expect(instance.specification.parameters).toHaveLength(2);
    expect(instance.specification.parameters?.[0].name).toBe("suiteId");
    expect(instance.specification.parameters?.[1].name).toBe("executionId");
  });

  it("should PATCH to cancel execution and return results", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(cancelMock));

    const result = await instance.handle(
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
    await expect(
      instance.handle({ executionId: "exec-1" }, {}),
    ).rejects.toThrow("Both suiteId and executionId arguments are required");
  });

  it("should throw ToolError if executionId is missing", async () => {
    await expect(instance.handle({ suiteId: "suite-1" }, {})).rejects.toThrow(
      "Both suiteId and executionId arguments are required",
    );
  });

  it("should throw ToolError if fetch fails", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });
    await expect(
      instance.handle({ suiteId: "suite-1", executionId: "exec-1" }, {}),
    ).rejects.toThrow("Failed to cancel suite execution");
  });
});
