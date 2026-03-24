import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { ListSuites } from "../../../../../reflect/tool/suites/list-suites";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const suitesMock = [
  { id: "suite-1", name: "Smoke Tests" },
  { id: "suite-2", name: "Regression Tests" },
];

describe("ListSuites", () => {
  let mockClient: any;
  let instance: ListSuites;

  beforeEach(() => {
    fetchMock.resetMocks();

    mockClient = {
      getHeaders: vi.fn().mockReturnValue({
        "X-API-KEY": "test-api-key",
        "Content-Type": "application/json",
      }),
    };

    instance = new ListSuites(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("List Suites");
    expect(instance.specification.summary).toBe(
      "Retrieve a list of all reflect suites available",
    );
    expect(instance.specification.parameters).toHaveLength(0);
  });

  it("should call suites API and return results", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(suitesMock));

    const result = await instance.handle({}, {});

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.reflect.run/v1/suites",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed).toHaveLength(2);
  });

  it("should throw ToolError if fetch fails", async () => {
    fetchMock.mockResponseOnce("Unauthorized", { status: 401 });
    await expect(instance.handle({}, {})).rejects.toThrow(
      "Failed to list suites",
    );
  });
});
