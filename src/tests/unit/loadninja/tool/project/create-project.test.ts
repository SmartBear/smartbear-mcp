import { beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { CreateProject } from "../../../../../loadninja/tool/project/create-project";

const fetchMock = createFetchMock(vi);
fetchMock.enableMocks();

describe("CreateProject", () => {
  let mockClient: any;
  let instance: CreateProject;

  beforeEach(() => {
    fetchMock.resetMocks();
    mockClient = {
      getBaseUrl: vi.fn().mockReturnValue("https://api.loadninja.com/v1"),
      getHeaders: vi.fn().mockReturnValue({
        authorization: "test-key",
        "Content-Type": "application/json",
      }),
    };
    instance = new CreateProject(mockClient);
  });

  it("should set specification correctly", () => {
    expect(instance.specification.title).toBe("Create Project");
    expect(instance.specification.readOnly).toBe(false);
  });

  it("should POST /project with name and description", async () => {
    const response = {
      message: "Project successfully created",
      data: { projectId: "new-id", name: "Test Project" },
    };
    fetchMock.mockResponseOnce(JSON.stringify(response));

    const result = await instance.handle(
      { name: "Test Project", description: "A test project" },
      {} as any,
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.loadninja.com/v1/project",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          authorization: "test-key",
        }),
        body: JSON.stringify({
          name: "Test Project",
          description: "A test project",
        }),
      }),
    );

    const parsed = JSON.parse((result.content[0] as any).text);
    expect(parsed.data.projectId).toBe("new-id");
  });

  it("should throw ToolError on non-2xx response", async () => {
    fetchMock.mockResponseOnce("Server Error", { status: 500 });
    await expect(
      instance.handle(
        { name: "Test Project", description: "desc" },
        {} as any,
      ),
    ).rejects.toThrow("POST /project failed: 500");
  });

  it("should throw on invalid input (name too short)", async () => {
    await expect(
      instance.handle({ name: "ab", description: "desc" }, {} as any),
    ).rejects.toThrow();
  });

  it("should throw on missing description", async () => {
    await expect(
      instance.handle({ name: "Valid Name" }, {} as any),
    ).rejects.toThrow();
  });
});
