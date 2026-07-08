import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { ListEnvironments } from "../../../../../bearq/tool/environments/list-environments";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("ListEnvironments", () => {
  let mockClient: any;
  let instance: ListEnvironments;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.bearq.smartbear.com"),
      getHeaders: vi.fn().mockReturnValue({
        Authorization: "Bearer test-token",
        "Content-Type": "application/json",
      }),
    };
    instance = new ListEnvironments(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("List Environments");
    expect(instance.specification.readOnly).toBe(true);
  });

  it("should GET /environments with correct method and headers", async () => {
    fetchMock.mockResponseOnce(
      JSON.stringify({
        environments: [
          { id: 1, name: "Staging", isDefault: true },
          { id: 2, name: "Production", isDefault: false },
        ],
      }),
    );

    const result = await instance.handle({}, {} as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.bearq.smartbear.com/environments",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.environments).toHaveLength(2);
    expect(parsed.environments[0].name).toBe("Staging");
  });

  it("should throw ToolError on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Unauthorized", { status: 401 });
    await expect(instance.handle({}, {} as any)).rejects.toThrow(
      "GET /environments failed: 401",
    );
  });
});
