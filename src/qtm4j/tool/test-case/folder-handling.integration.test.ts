import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../config/constants";
import { CreateTestCase } from "./create-test-case";
import { GetTestCases } from "./get-test-cases";
import { SearchTestCaseBody } from "../../schema/get-test-case.schema";

/**
 * Integration tests for folder handling fixes (issues #643, #631).
 *
 * Bug 1 (#643): folderId was hardcoded to "MCP Generated", ignoring the user's value.
 * Bug 2 (#643): folderId was in FIELD_CONFIG, causing the resolver to treat the numeric ID
 *               as a name, fail to resolve it, and delete it from the body.
 * Bug 3 (#631): search filter used `folders: number[]` instead of `folderId: number`,
 *               so the API silently ignored the filter and returned all test cases.
 */

const PROJECT_CONTEXT = {
  projectKey: "PROJ",
  projectId: 10000,
  projectName: "Project Name",
};

const MOCK_CREATE_RESPONSE = {
  id: "abc123",
  key: "PROJ-TC-1",
  versionNo: 1,
  summary: "Test case",
};

const MOCK_SEARCH_RESPONSE = {
  total: 1,
  startAt: 0,
  maxResults: 50,
  data: [{ id: "abc123", key: "PROJ-TC-1", summary: "Test case" }],
};

// Simulates real CommonAttributeResolver behaviour: deletes any field it cannot resolve.
// This proves folderId survives because it is no longer in FIELD_CONFIG.
const makeRealisticResolver = () => ({
  resolve: vi
    .fn()
    .mockImplementation(
      async (
        inputField: string,
        _key: string,
        body: Record<string, unknown>,
        _ctx: unknown,
        warnings: string[],
      ) => {
        if (body[inputField] !== undefined) {
          delete body[inputField];
          warnings.push(`Skipped ${inputField} — not found in project`);
        }
      },
    ),
});

describe("create test case — folder placement (Bug 1 + Bug 2)", () => {
  let mockApiClient: any;
  let createTool: CreateTestCase;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient = { post: vi.fn().mockResolvedValue(MOCK_CREATE_RESPONSE) };
    createTool = new CreateTestCase({
      getApiClient: () => mockApiClient,
      getResolverRegistry: () => ({
        requireProjectContext: vi.fn().mockReturnValue(PROJECT_CONTEXT),
        getResolver: vi.fn().mockReturnValue(makeRealisticResolver()),
      }),
    } as any);
  });

  it("user-provided folderId reaches the API even when the resolver drops other unresolvable fields", async () => {
    await createTool.handle({
      summary: "Test case",
      folderId: 2628513,
      priority: "SomePriority",
    });

    const [endpoint, body] = mockApiClient.post.mock.calls[0];
    expect(endpoint).toBe(ENDPOINTS.CREATE_TEST_CASE);
    expect(body.folderId).toBe(2628513); // not overwritten (Bug 1) and not deleted by resolver (Bug 2)
    expect(body.priority).toBeUndefined(); // correctly dropped by resolver
  });

  it("defaults folderId to 'MCP Generated' when not provided", async () => {
    await createTool.handle({ summary: "Test case" });

    const [, body] = mockApiClient.post.mock.calls[0];
    expect(body.folderId).toBe("MCP Generated");
  });
});

describe("search test cases — folder filter (Bug 3)", () => {
  let mockApiClient: any;
  let searchTool: GetTestCases;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApiClient = { post: vi.fn().mockResolvedValue(MOCK_SEARCH_RESPONSE) };
    searchTool = new GetTestCases({
      getApiClient: () => mockApiClient,
      getResolverRegistry: () => ({
        requireProjectContext: vi.fn().mockReturnValue(PROJECT_CONTEXT),
      }),
    } as any);
  });

  it("folderId filter reaches the API correctly", async () => {
    await searchTool.handle({ filter: { folderId: 53554 } });

    const [, body] = mockApiClient.post.mock.calls[0];
    expect(body.filter.folderId).toBe(53554);
  });

  it("folderId is preserved alongside other filter fields", async () => {
    await searchTool.handle({
      filter: { folderId: 53554, status: ["Done"], priority: ["High"] },
    });

    const [, body] = mockApiClient.post.mock.calls[0];
    expect(body.filter.folderId).toBe(53554);
    expect(body.filter.status).toEqual(["Done"]);
    expect(body.filter.priority).toEqual(["High"]);
    expect(body.filter.projectId).toBe("10000"); // auto-injected from context
  });

  it("schema accepts folderId and strips the old broken field name 'folders'", () => {
    const withOldField = SearchTestCaseBody.parse({
      filter: { folders: [53554] },
    });
    expect((withOldField.filter as any)?.folders).toBeUndefined();

    const withNewField = SearchTestCaseBody.parse({
      filter: { folderId: 53554 },
    });
    expect(withNewField.filter?.folderId).toBe(53554);
  });
});
