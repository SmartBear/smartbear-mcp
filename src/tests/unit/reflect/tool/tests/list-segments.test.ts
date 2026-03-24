import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { ListSegments } from "../../../../../reflect/tool/tests/list-segments";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

const segmentsMock = {
  segments: [
    {
      id: 1,
      name: "Login Flow",
      description: "Standard login",
      stepCount: 3,
      steps: [],
    },
    {
      id: 2,
      name: "Logout Flow",
      description: "Standard logout",
      stepCount: 2,
      steps: [],
    },
  ],
  count: 2,
};

describe("ListSegments", () => {
  let mockClient: any;
  let instance: ListSegments;

  beforeEach(() => {
    fetchMock.resetMocks();

    mockClient = {
      getApiToken: vi.fn().mockReturnValue("test-api-key"),
    };

    instance = new ListSegments(mockClient as any);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("List Segments");
    expect(instance.specification.readOnly).toBe(true);
    expect(instance.specification.idempotent).toBe(true);
    expect(instance.specification.parameters).toHaveLength(3);
    expect(instance.specification.parameters?.[0].name).toBe("platform");
    expect(instance.specification.parameters?.[1].name).toBe("offset");
    expect(instance.specification.parameters?.[1].required).toBe(false);
    expect(instance.specification.parameters?.[2].name).toBe("limit");
    expect(instance.specification.parameters?.[2].required).toBe(false);
  });

  it("should call segments API and return results", async () => {
    fetchMock.mockResponseOnce(JSON.stringify(segmentsMock));

    const result = await instance.handle({ platform: "web" }, {});

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.reflect.run/v1/segments?type=web&offset=0&limit=25",
      expect.objectContaining({
        headers: expect.objectContaining({ "X-API-KEY": "test-api-key" }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.success).toBe(true);
    expect(parsed.count).toBe(2);
    expect(parsed.segments).toHaveLength(2);
  });

  it("should use provided offset and limit", async () => {
    fetchMock.mockResponseOnce(JSON.stringify({ segments: [], count: 0 }));

    await instance.handle({ platform: "web", offset: 10, limit: 5 }, {});

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.reflect.run/v1/segments?type=web&offset=10&limit=5",
      expect.anything(),
    );
  });

  it("should throw ToolError if fetch fails", async () => {
    fetchMock.mockResponseOnce("Not Found", { status: 404 });
    await expect(instance.handle({ platform: "web" }, {})).rejects.toThrow(
      "Failed to list segments",
    );
  });
});
