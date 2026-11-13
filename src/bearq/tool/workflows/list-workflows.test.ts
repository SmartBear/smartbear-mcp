import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { ListWorkflows } from "./list-workflows";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("ListWorkflows", () => {
  let mockClient: any;
  let instance: ListWorkflows;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new ListWorkflows(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("List Workflows");
    expect(instance.specification.toolset).toBe("Workflows");
    expect(instance.specification.readOnly).toBe(true);
  });

  it("should GET /workflows with size=100", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({
        workflows: [{ id: 1, name: "Smoke" }],
        page: 1,
        size: 100,
        totalCount: 1,
      }),
    );

    const result = await instance.handle({}, {} as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/workflows?size=100",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.workflows).toEqual([{ id: 1, name: "Smoke" }]);
  });

  it("should throw ToolError on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Unauthorized", { status: 401 });
    await expect(instance.handle({}, {} as any)).rejects.toThrow(
      "GET /workflows failed: 401",
    );
  });
});
