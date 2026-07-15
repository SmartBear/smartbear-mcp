import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../../../../qtm4j/config/constants";
import { ResolverKeys } from "../../../../../qtm4j/config/field-resolution.types";
import {
  GetBugsResponse,
  GetTestCaseBugsBody,
} from "../../../../../qtm4j/schema/get-bugs.schema";
import { GetTestCaseBugs } from "../../../../../qtm4j/tool/test-execution/get-test-case-bugs";

describe("GetTestCaseBugs", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockFieldResolver: any;
  let instance: GetTestCaseBugs;

  const PROJECT_CONTEXT = {
    projectId: 10007,
    projectKey: "PROJ",
    projectName: "Test Project",
  };

  const EXECUTION_CONTEXT_RESPONSE = {
    "PROJ-TC-42": {
      testCycleTestCaseMapId: 614823,
      testCaseExecutionId: 725982,
    },
  };

  const LINKED_BUGS_RESPONSE = {
    startAt: 0,
    maxResults: 20,
    total: 1,
    data: [
      {
        id: 14487,
        key: "PROJ-456",
        summary: "Login page crash",
        status: { id: 10000, name: "To Do", color: "blue-gray" },
        priority: { id: 3, name: "Medium" },
        issueType: { id: 10004, name: "Bug" },
        level: "testcase_execution",
      },
    ],
  };

  const EMPTY_BUGS_RESPONSE = {
    startAt: 0,
    maxResults: 20,
    total: 0,
    data: [],
  };

  function makeArrayResolver(idMap: Record<string, number> = {}) {
    return {
      resolve: vi
        .fn()
        .mockImplementation(
          async (
            inputField: string,
            _resolverKey: string,
            body: Record<string, unknown>,
            _context: unknown,
            warnings: string[],
          ) => {
            const value = body[inputField];
            if (!Array.isArray(value) || value.length === 0) return;
            const resolvedIds: number[] = [];
            for (const item of value) {
              const id = idMap[item as string];
              if (id !== undefined) {
                resolvedIds.push(id);
              } else {
                warnings.push(
                  `Skipped ${inputField} '${item}' — not a recognised value.`,
                );
              }
            }
            if (resolvedIds.length > 0) {
              body[inputField] = resolvedIds;
            } else {
              delete body[inputField];
            }
          },
        ),
      resolveAndReturn: vi.fn(),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mockFieldResolver = {
      requireProjectContext: vi.fn().mockReturnValue(PROJECT_CONTEXT),
      getResolver: vi.fn().mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT) {
          return {
            resolve: vi.fn(),
            resolveAndReturn: vi
              .fn()
              .mockResolvedValue(EXECUTION_CONTEXT_RESPONSE),
          };
        }
        if (key === ResolverKeys.SearchableField.DEFECT_PRIORITY) {
          return makeArrayResolver({ High: 2, Medium: 3 });
        }
        if (key === ResolverKeys.SearchableField.DEFECT_STATUS) {
          return makeArrayResolver({ "To Do": 10000, "In Progress": 10001 });
        }
        return { resolve: vi.fn(), resolveAndReturn: vi.fn() };
      }),
    };

    mockApiClient = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue(LINKED_BUGS_RESPONSE),
      put: vi.fn(),
      delete: vi.fn(),
    };

    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockFieldResolver),
    };

    instance = new GetTestCaseBugs(mockClient as any);
  });

  // ---------------------------------------------------------------------------
  // specification
  // ---------------------------------------------------------------------------

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe(
        "Get Linked Bugs of Test Case Execution",
      );
      expect(instance.specification.readOnly).toBe(true);
      expect(instance.specification.idempotent).toBe(true);
    });

    it("should have use cases, examples and hints", () => {
      expect(instance.specification.useCases?.length).toBeGreaterThan(0);
      expect(instance.specification.examples?.length).toBeGreaterThan(0);
      expect(instance.specification.hints?.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // handle — validation
  // ---------------------------------------------------------------------------

  describe("handle — validation", () => {
    it("should reject maxResults > 100", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          maxResults: 101,
        }),
      ).rejects.toThrow();
    });

    it("should reject maxResults = 0", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          maxResults: 0,
        }),
      ).rejects.toThrow();
    });

    it("should throw when test case not found in response (empty map)", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT) {
          return {
            resolve: vi.fn(),
            resolveAndReturn: vi.fn().mockResolvedValue({}),
          };
        }
        return makeArrayResolver();
      });

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-999",
          testCaseKey: "PROJ-TC-42",
        }),
      ).rejects.toThrow("is not linked to test cycle");
    });

    it("should throw when test case not linked to cycle", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-99",
        }),
      ).rejects.toThrow("is not linked to test cycle");
    });

    it("should throw when no execution has been started", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT) {
          return {
            resolve: vi.fn(),
            resolveAndReturn: vi.fn().mockResolvedValue({
              "PROJ-TC-42": {
                testCycleTestCaseMapId: 614823,
                testCaseExecutionId: null,
              },
            }),
          };
        }
        return makeArrayResolver();
      });

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
        }),
      ).rejects.toThrow("No execution has been started");
    });

    it("should throw when project context is not set", async () => {
      mockFieldResolver.requireProjectContext.mockImplementation(() => {
        throw new Error("No active project set");
      });

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
        }),
      ).rejects.toThrow("No active project set");
    });
  });

  // ---------------------------------------------------------------------------
  // handle — happy path
  // ---------------------------------------------------------------------------

  describe("handle", () => {
    it("should POST to correct testCase endpoint with pagination params", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        startAt: 0,
        maxResults: 20,
      });

      const calledEndpoint = mockApiClient.post.mock.calls[0][0];
      expect(calledEndpoint).toContain(
        ENDPOINTS.GET_LINKED_BUGS_TEST_CASE_EXECUTION("PROJ-TR-101", 725982),
      );
      expect(calledEndpoint).toContain("startAt=0");
      expect(calledEndpoint).toContain("maxResults=20");
    });

    it("should always include level param in URL", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
      });

      const calledEndpoint = mockApiClient.post.mock.calls[0][0];
      expect(calledEndpoint).toContain("level=");
    });

    it("should include custom level in URL when provided", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        level: "testcase_execution",
      });

      const calledEndpoint = mockApiClient.post.mock.calls[0][0];
      expect(calledEndpoint).toContain("level=testcase_execution");
    });

    it("should return paginated response", async () => {
      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
      });

      expect(result.structuredContent).toMatchObject({
        startAt: 0,
        maxResults: 20,
        total: 1,
      });
      expect(result.structuredContent.data).toHaveLength(1);
    });

    it("should return empty data without error when total = 0", async () => {
      mockApiClient.post.mockResolvedValueOnce(EMPTY_BUGS_RESPONSE);

      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
      });

      expect(result.structuredContent.total).toBe(0);
      expect(result.structuredContent.data).toHaveLength(0);
      expect(result.content).toEqual([]);
    });

    it("should send empty body when no filter provided", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
      });

      const calledBody = mockApiClient.post.mock.calls[0][1];
      expect(calledBody).toEqual({});
    });

    it("should never call GET (no step resolution at test case level)", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
      });
      expect(mockApiClient.get).not.toHaveBeenCalled();
    });

    it("should resolve priority filter names to IDs and include in filter body", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        filter: { priority: ["High"] },
      });

      const calledBody = mockApiClient.post.mock.calls[0][1];
      expect(calledBody).toEqual({ filter: { priority: [2] } });
    });

    it("should resolve status filter names to IDs and include in filter body", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        filter: { status: ["To Do"] },
      });

      const calledBody = mockApiClient.post.mock.calls[0][1];
      expect(calledBody).toEqual({ filter: { status: [10000] } });
    });

    it("should resolve both priority and status filters together", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        filter: { priority: ["High"], status: ["In Progress"] },
      });

      const calledBody = mockApiClient.post.mock.calls[0][1];
      expect(calledBody).toEqual({
        filter: { priority: [2], status: [10001] },
      });
    });

    it("should warn and skip unresolvable priority filter names", async () => {
      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        filter: { priority: ["Nonexistent"] },
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("Nonexistent");
    });

    it("should warn and skip unresolvable status filter names", async () => {
      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        filter: { status: ["Nonexistent"] },
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("Nonexistent");
    });
  });

  // ---------------------------------------------------------------------------
  // handle — API errors
  // ---------------------------------------------------------------------------

  describe("handle — API errors", () => {
    it("should propagate API errors from POST", async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error("API Error"));

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
        }),
      ).rejects.toThrow("API Error");
    });
  });
});

// ---------------------------------------------------------------------------
// Schema tests
// ---------------------------------------------------------------------------

describe("GetTestCaseBugsBody", () => {
  it("should accept minimal valid input", () => {
    const result = GetTestCaseBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
    });
    expect(result.success).toBe(true);
  });

  it("should apply default startAt=0 and maxResults=20", () => {
    const result = GetTestCaseBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startAt).toBe(0);
      expect(result.data.maxResults).toBe(20);
    }
  });

  it("should apply default level when not provided", () => {
    const result = GetTestCaseBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.level).toBe("testcase_execution, teststep_execution");
    }
  });

  it("should accept custom level value", () => {
    const result = GetTestCaseBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      level: "testcase_execution",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.level).toBe("testcase_execution");
    }
  });

  it("should reject maxResults > 100", () => {
    const result = GetTestCaseBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      maxResults: 101,
    });
    expect(result.success).toBe(false);
  });

  it("should accept maxResults = 100", () => {
    const result = GetTestCaseBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      maxResults: 100,
    });
    expect(result.success).toBe(true);
  });

  it("should accept filter with priority array", () => {
    const result = GetTestCaseBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      filter: { priority: ["High", "Medium"] },
    });
    expect(result.success).toBe(true);
  });

  it("should accept filter with status array", () => {
    const result = GetTestCaseBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      filter: { status: ["To Do", "In Progress"] },
    });
    expect(result.success).toBe(true);
  });
});

describe("GetBugsResponse", () => {
  it("should accept valid paginated response", () => {
    const result = GetBugsResponse.safeParse({
      startAt: 0,
      maxResults: 20,
      total: 1,
      data: [
        {
          id: 14487,
          key: "PROJ-456",
          summary: "Login page crash",
          status: { id: 10000, name: "To Do" },
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty data array", () => {
    const result = GetBugsResponse.safeParse({
      startAt: 0,
      maxResults: 20,
      total: 0,
      data: [],
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing total", () => {
    const result = GetBugsResponse.safeParse({
      startAt: 0,
      maxResults: 20,
      data: [],
    });
    expect(result.success).toBe(false);
  });

  it("should accept bug with full priority and issueType", () => {
    const result = GetBugsResponse.safeParse({
      startAt: 0,
      maxResults: 20,
      total: 1,
      data: [
        {
          id: 14487,
          key: "PROJ-456",
          summary: "Crash on login",
          status: { id: 10000, name: "To Do" },
          priority: { id: 3, name: "Medium" },
          issueType: { id: 10004, name: "Bug" },
          level: "testcase_execution",
          stepSeqNo: null,
          parameterGroup: null,
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});
