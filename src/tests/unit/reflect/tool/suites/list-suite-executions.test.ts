import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { ListSuiteExecutions } from "../../../../../reflect/tool/suites/list-suite-executions";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const executionsMock = [
  { id: "exec-1", status: "passed" },
  { id: "exec-2", status: "failed" },
];

describe("ListSuiteExecutions", () => {
  let mockClient: any;
  let instance: ListSuiteExecutions;

  beforeEach(() => {
    fetchMock.resetMocks();

    mockClient = {
      getHeaders: vi.fn().mockReturnValue({
        "X-API-KEY": "test-api-key",
        "Content-Type": "application/json",
      }),
    };

    instance = new ListSuiteExecutions(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("List Suite Executions");
    expect(instance.specification.parameters).toHaveLength(1);
    expect(instance.specification.parameters?.[0].name).toBe("suiteId");
    expect(instance.specification.parameters?.[0].required).toBe(true);
  });

  it("should call suite executions API and return results", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(executionsMock));

    const result = await instance.handle({ suiteId: "suite-1" }, {});

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.reflect.run/v1/suites/suite-1/executions",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed).toHaveLength(2);
  });

  it("should throw ToolError if suiteId is missing", async () => {
    await expect(instance.handle({}, {})).rejects.toThrow(
      "suiteId argument is required",
    );
  });

  it("should throw ToolError if fetch fails", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });
    await expect(instance.handle({ suiteId: "suite-1" }, {})).rejects.toThrow(
      "Failed to list suite executions",
    );
  });
});
