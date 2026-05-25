import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { ListProjects } from "../../../../../loadninja/tool/project/list-projects";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("ListProjects", () => {
  let mockClient: any;
  let instance: ListProjects;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.loadninja.com/v1"),
      getHeaders: vi.fn().mockReturnValue({
        authorization: "test-key",
        "Content-Type": "application/json",
      }),
    };
    instance = new ListProjects(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("List Projects");
  });

  it("should GET /project with correct headers", async () => {
    const projects = [{ projectId: "abc-123", name: "My Project" }];
    fetchMock.mockResponseOnce(JSON.stringify(projects));

    const result = await instance.handle({}, {} as any);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.loadninja.com/v1/project",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          authorization: "test-key",
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed).toEqual(projects);
  });

  it("should throw ToolError on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Unauthorized", { status: 400 });
    await expect(instance.handle({}, {} as any)).rejects.toThrow(
      "GET /project failed: 400",
    );
  });
});
