import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { ListTests } from "../../../../../reflect/tool/tests/list-tests";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const testsMock = [
  { id: "test-1", name: "Login Test" },
  { id: "test-2", name: "Checkout Test" },
];

describe("ListTests", () => {
  let mockClient: any;
  let instance: ListTests;

  beforeEach(() => {
    fetchMock.resetMocks();

    mockClient = {
      getHeaders: vi.fn().mockReturnValue({
        "X-API-KEY": "test-api-key",
        "Content-Type": "application/json",
      }),
    };

    instance = new ListTests(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("List Tests");
    expect(instance.specification.summary).toBe("List all reflect tests");
    expect(instance.specification.parameters).toHaveLength(0);
  });

  it("should call tests API and return results", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(testsMock));

    const result = await instance.handle({}, {});

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.reflect.run/v1/tests",
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
      "Failed to list tests",
    );
  });
});
