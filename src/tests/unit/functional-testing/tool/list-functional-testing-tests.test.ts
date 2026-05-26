import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { ListFunctionalTestingTests } from "../../../../functional-testing/tool/list-functional-testing-tests";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const testsMock = [
  { id: "test-1", name: "Login Test" },
  { id: "test-2", name: "Checkout Test" },
];

describe("ListFunctionalTestingTests", () => {
  let mockClient: any;
  let instance: ListFunctionalTestingTests;

  beforeEach(() => {
    fetchMock.resetMocks();

    mockClient = {
      getHeaders: vi.fn().mockReturnValue({
        "X-API-KEY": "test-api-key",
        "Content-Type": "application/json",
      }),
    };

    instance = new ListFunctionalTestingTests(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("List Functional Testing Tests");
    expect(instance.specification.summary).toContain(
      "Lists all API tests available in your SmartBear Functional Testing account",
    );
    expect(instance.specification.summary).toContain(
      "Do not use this tool to retrieve test execution results or history",
    );
  });

  it("should call tests API and return results", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(testsMock));

    const result = await instance.handle({}, {} as any);

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

  it("should return empty array when no tests exist", async () => {
    fetchMock.mockResponseOnce(JSON.stringify([]));
    const result = await instance.handle({}, {} as any);
    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed).toHaveLength(0);
  });

  it("should throw ToolError if fetch fails", async () => {
    fetchMock.mockResponseOnce("Unauthorized", { status: 401 });
    await expect(instance.handle({}, {} as any)).rejects.toThrow(
      "Failed to list functional testing tests",
    );
  });
});
