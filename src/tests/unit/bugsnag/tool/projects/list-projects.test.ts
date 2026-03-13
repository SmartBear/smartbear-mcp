import { beforeEach, describe, expect, it, vi } from "vitest";
import { BugsnagClient } from "../../../../../bugsnag/client.ts";
import { getMockProject } from "../../utils/factories.ts";

describe("List projects", () => {
  const registerToolsSpy = vi.fn();
  const getInputFunctionSpy = vi.fn();
  const mockCache = {
    get: vi.fn(),
  };

  async function createClient() {
    const client = new BugsnagClient();
    const mockServer = { getCache: () => mockCache } as any;
    await client.configure(mockServer, { auth_token: "test-token" });

    await client.registerTools(registerToolsSpy, getInputFunctionSpy);
    // biome-ignore lint/style/noNonNullAssertion: non-null assertion is fine a test context
    const toolHandler = registerToolsSpy.mock.calls.find(
      (call: any) => call[0].title === "List Projects",
    )![1];

    return { client, toolHandler };
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return all projects", async () => {
    const mockProjects = [getMockProject("proj-1", "Project 1")];
    mockCache.get.mockReturnValue(mockProjects);

    const { toolHandler } = await createClient();
    const result = await toolHandler({});

    const expectedResult = {
      data: mockProjects,
      count: 1,
    };
    expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
  });

  it("should handle no projects found", async () => {
    mockCache.get.mockReturnValue([]);

    const { toolHandler } = await createClient();

    await expect(toolHandler({})).rejects.toThrow(
      "No BugSnag projects found for the current user.",
    );
  });

  it("should filter projects by API key parameter", async () => {
    const mockProjects = [
      getMockProject("proj-1", "Project 1", "key-1"),
      getMockProject("proj-2", "Project 2", "key-2"),
    ];
    mockCache.get.mockReturnValue(mockProjects);

    const { toolHandler } = await createClient();

    const result = await toolHandler({ apiKey: "key-2" });
    const expectedResult = {
      data: [mockProjects[1]],
      count: 1,
    };
    expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
  });

  it("should filter projects by apiKey parameter - no match", async () => {
    const mockProjects = [getMockProject("proj-1", "Project 1", "key-1")];
    mockCache.get.mockReturnValue(mockProjects);

    const { toolHandler } = await createClient();

    const result = await toolHandler({ apiKey: "key-x" });
    const expectedResult = {
      data: [],
      count: 0,
    };
    expect(result.content[0].text).toBe(JSON.stringify(expectedResult));
  });
});
