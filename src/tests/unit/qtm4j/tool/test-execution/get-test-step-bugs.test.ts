import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../../../../qtm4j/config/constants";
import { ResolverKeys } from "../../../../../qtm4j/config/field-resolution.types";
import { GetTestStepBugsBody } from "../../../../../qtm4j/schema/get-bugs.schema";
import { GetTestStepBugs } from "../../../../../qtm4j/tool/test-execution/get-test-step-bugs";

describe("GetTestStepBugs", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockFieldResolver: any;
  let instance: GetTestStepBugs;

  const PROJECT_CONTEXT = {
    projectId: 10007,
    projectKey: "PROJ",
    projectName: "Test Project",
  };

  const STEP_EXECUTION_CONTEXT_RESPONSE = {
    "PROJ-TC-42": {
      1: 2548098,
      2: 2548099,
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
        level: "teststep_execution",
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
        if (key === ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT) {
          return {
            resolve: vi.fn(),
            resolveAndReturn: vi
              .fn()
              .mockResolvedValue(STEP_EXECUTION_CONTEXT_RESPONSE),
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

    instance = new GetTestStepBugs(mockClient as any);
  });

  // ---------------------------------------------------------------------------
  // specification
  // ---------------------------------------------------------------------------

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe(
        "Get Linked Bugs of Test Step Execution",
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
    it("should reject missing testStepSeqNo", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
        }),
      ).rejects.toThrow();
    });

    it("should reject non-positive testStepSeqNo", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 0,
        }),
      ).rejects.toThrow();
    });

    it("should reject maxResults > 100", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 1,
          maxResults: 101,
        }),
      ).rejects.toThrow();
    });

    it("should throw when step not found in STEP_EXECUTION_CONTEXT", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 99,
        }),
      ).rejects.toThrow("Step 99 was not found in this execution");
    });

    it("should throw when STEP_EXECUTION_CONTEXT returns empty map", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT) {
          return {
            resolve: vi.fn(),
            resolveAndReturn: vi.fn().mockResolvedValue({}),
          };
        }
        return makeArrayResolver();
      });

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 1,
        }),
      ).rejects.toThrow("Step 1 was not found in this execution");
    });

    it("should throw when project context is not set", async () => {
      mockFieldResolver.requireProjectContext.mockImplementation(() => {
        throw new Error("No active project set");
      });

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 1,
        }),
      ).rejects.toThrow("No active project set");
    });
  });

  // ---------------------------------------------------------------------------
  // handle — happy path
  // ---------------------------------------------------------------------------

  describe("handle", () => {
    it("should resolve step via STEP_EXECUTION_CONTEXT and POST to correct testStep endpoint", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 2,
      });

      const calledEndpoint = mockApiClient.post.mock.calls[0][0];
      expect(calledEndpoint).toContain(
        ENDPOINTS.GET_LINKED_BUGS_TEST_STEP_EXECUTION("PROJ-TR-101", 2548099),
      );
    });

    it("should POST with pagination params", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 1,
        startAt: 10,
        maxResults: 50,
      });

      const calledEndpoint = mockApiClient.post.mock.calls[0][0];
      expect(calledEndpoint).toContain("startAt=10");
      expect(calledEndpoint).toContain("maxResults=50");
    });

    it("should not include a level query param", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 1,
      });

      const calledEndpoint = mockApiClient.post.mock.calls[0][0];
      expect(calledEndpoint).not.toContain("level=");
    });

    it("should return paginated response", async () => {
      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 2,
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
        testStepSeqNo: 1,
      });

      expect(result.structuredContent.total).toBe(0);
      expect(result.structuredContent.data).toHaveLength(0);
      expect(result.content).toEqual([]);
    });

    it("should send empty body when no filter provided", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 1,
      });

      const calledBody = mockApiClient.post.mock.calls[0][1];
      expect(calledBody).toEqual({});
    });

    it("should resolve priority filter names to IDs and include in filter body", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 1,
        filter: { priority: ["High"] },
      });

      const calledBody = mockApiClient.post.mock.calls[0][1];
      expect(calledBody).toEqual({ filter: { priority: [2] } });
    });

    it("should resolve status filter names to IDs and include in filter body", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 1,
        filter: { status: ["In Progress"] },
      });

      const calledBody = mockApiClient.post.mock.calls[0][1];
      expect(calledBody).toEqual({ filter: { status: [10001] } });
    });

    it("should warn and skip unresolvable priority filter names", async () => {
      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 1,
        filter: { priority: ["Nonexistent"] },
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
          testStepSeqNo: 1,
        }),
      ).rejects.toThrow("API Error");
    });
  });
});

// ---------------------------------------------------------------------------
// Schema tests
// ---------------------------------------------------------------------------

describe("GetTestStepBugsBody", () => {
  it("should accept minimal valid input", () => {
    const result = GetTestStepBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      testStepSeqNo: 2,
    });
    expect(result.success).toBe(true);
  });

  it("should require testStepSeqNo", () => {
    const result = GetTestStepBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
    });
    expect(result.success).toBe(false);
  });

  it("should reject non-positive testStepSeqNo", () => {
    const result = GetTestStepBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      testStepSeqNo: 0,
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative testStepSeqNo", () => {
    const result = GetTestStepBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      testStepSeqNo: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should apply default startAt=0 and maxResults=20", () => {
    const result = GetTestStepBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      testStepSeqNo: 1,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startAt).toBe(0);
      expect(result.data.maxResults).toBe(20);
    }
  });

  it("should accept filter with priority and status", () => {
    const result = GetTestStepBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      testStepSeqNo: 1,
      filter: { priority: ["High"], status: ["To Do"] },
    });
    expect(result.success).toBe(true);
  });

  it("should not have a level field", () => {
    const result = GetTestStepBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      testStepSeqNo: 1,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect("level" in result.data).toBe(false);
    }
  });
});
