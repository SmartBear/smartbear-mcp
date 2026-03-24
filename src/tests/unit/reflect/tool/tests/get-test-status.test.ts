import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { GetTestStatus } from "../../../../../reflect/tool/tests/get-test-status";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const statusMock = { id: "exec-1", status: "passed", duration: 1234 };

describe("GetTestStatus", () => {
  let mockClient: any;
  let instance: GetTestStatus;

  beforeEach(() => {
    fetchMock.resetMocks();

    mockClient = {
      getHeaders: vi.fn().mockReturnValue({
        "X-API-KEY": "test-api-key",
        "Content-Type": "application/json",
      }),
    };

    instance = new GetTestStatus(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Get Test Status");
    expect(instance.specification.parameters).toHaveLength(1);
    expect(instance.specification.parameters?.[0].name).toBe("executionId");
  });

  it("should call execution status API with executionId in URL", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(statusMock));

    const result = await instance.handle({ executionId: "exec-1" }, {});

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.reflect.run/v1/executions/exec-1",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.status).toBe("passed");
  });

  it("should throw ToolError if executionId is missing", async () => {
    await expect(instance.handle({ testId: "test-1" }, {})).rejects.toThrow(
      "executionId argument is required",
    );
  });

  it("should throw ToolError if fetch fails", async () => {
    fetchMock.mockResponseOnce("Server Error", { status: 500 });
    await expect(
      instance.handle({ testId: "test-1", executionId: "exec-1" }, {}),
    ).rejects.toThrow("Failed to get test status");
  });
});
