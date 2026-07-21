import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types";
import {
  UpdateTestCaseExecutionBody,
  UpdateTestCaseExecutionResponse,
} from "../../schema/update-test-case-execution.schema";
import { UpdateTestCaseExecution } from "./update-test-case-execution";

describe("UpdateTestCaseExecution", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockFieldResolver: any;
  let instance: UpdateTestCaseExecution;

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

  function makeExecutionContextResolver(result: any) {
    return {
      resolve: vi.fn().mockResolvedValue(undefined),
      resolveAndReturn: vi.fn().mockResolvedValue(result),
    };
  }

  function makeFieldResolver(resolvedId?: number) {
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
            const name = body[inputField];
            if (name == null) return;
            if (resolvedId !== undefined) {
              body[inputField] = resolvedId;
            } else {
              delete body[inputField];
              warnings.push(
                `Skipped ${inputField} '${name}' — not available in the current project.`,
              );
            }
          },
        ),
    };
  }

  beforeEach(() => {
    vi.clearAllMocks();

    mockFieldResolver = {
      requireProjectContext: vi.fn().mockReturnValue(PROJECT_CONTEXT),
      getResolver: vi.fn().mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT) {
          return makeExecutionContextResolver(EXECUTION_CONTEXT_RESPONSE);
        }
        if (key === ResolverKeys.CommonAttribute.EXECUTION_RESULT) {
          return makeFieldResolver(19434); // "Pass" → 19434
        }
        if (key === ResolverKeys.SearchableField.ENVIRONMENT) {
          return makeFieldResolver(5410); // "Production" → 5410
        }
        if (key === ResolverKeys.SearchableField.BUILD) {
          return makeFieldResolver(1562); // "Build 2.0" → 1562
        }
        return { resolve: vi.fn(), resolveAndReturn: vi.fn() };
      }),
    };

    mockApiClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn(),
    };

    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockFieldResolver),
    };

    instance = new UpdateTestCaseExecution(mockClient as any);
  });

  // ---------------------------------------------------------------------------
  // specification
  // ---------------------------------------------------------------------------

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe("Update Test Case Execution");
      expect(instance.specification.readOnly).toBe(false);
      expect(instance.specification.idempotent).toBe(true);
    });

    it("should have use cases", () => {
      expect(instance.specification.useCases?.length).toBeGreaterThan(0);
    });

    it("should have examples", () => {
      expect(instance.specification.examples?.length).toBeGreaterThan(0);
    });

    it("should have hints", () => {
      expect(instance.specification.hints?.length).toBeGreaterThan(0);
    });
  });

  // ---------------------------------------------------------------------------
  // handle — validation
  // ---------------------------------------------------------------------------

  describe("handle — validation", () => {
    it("should reject missing testCycleKey", async () => {
      await expect(
        instance.handle({
          testCaseKey: "PROJ-TC-42",
          executionResultId: "Pass",
        }),
      ).rejects.toThrow();
    });

    it("should reject missing testCaseKey", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          executionResultId: "Pass",
        }),
      ).rejects.toThrow();
    });

    it("should reject when no updatable field is provided", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
        }),
      ).rejects.toThrow("Provide at least one updatable field.");
    });

    it("should reject invalid actualTime format", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          actualTime: "1h30m",
        }),
      ).rejects.toThrow();
    });

    it("should reject invalid plannedDate format", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          executionPlannedDate: "2025-10-15",
        }),
      ).rejects.toThrow();
    });

    it("should throw when test case not linked to cycle", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT) {
          return makeExecutionContextResolver({});
        }
        return makeFieldResolver(19434);
      });

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-999",
          executionResultId: "Pass",
        }),
      ).rejects.toThrow("is not linked to test cycle");
    });

    it("should throw ToolError when all resolvable fields fail and body becomes empty", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT) {
          return makeExecutionContextResolver(EXECUTION_CONTEXT_RESPONSE);
        }
        return makeFieldResolver(); // no ID → deletes field, adds warning
      });

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          executionResultId: "InvalidStatus",
        }),
      ).rejects.toThrow("No updatable fields remain after resolution");
    });

    it("should throw when no execution started (testCaseExecutionId is null)", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT) {
          return makeExecutionContextResolver({
            "PROJ-TC-42": {
              testCycleTestCaseMapId: 614823,
              testCaseExecutionId: null,
            },
          });
        }
        return makeFieldResolver(19434);
      });

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          executionResultId: "Pass",
        }),
      ).rejects.toThrow("No execution has been started");
    });
  });

  // ---------------------------------------------------------------------------
  // handle
  // ---------------------------------------------------------------------------

  describe("handle", () => {
    it("should PUT to the correct testCase endpoint", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        executionResultId: "Pass",
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        ENDPOINTS.UPDATE_TEST_CASE_EXECUTION("PROJ-TR-101", 725982),
        expect.any(Object),
      );
    });

    it("should resolve status name to executionResultId", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        executionResultId: "Pass",
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ executionResultId: 19434 }),
      );
    });

    it("should resolve environment name to numeric ID", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        environmentId: "Production",
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ environmentId: 5410 }),
      );
    });

    it("should resolve build name to numeric ID", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        buildId: "Build 2.0",
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ buildId: 1562 }),
      );
    });

    it("should include comment and actualTime in PUT body unchanged", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        comment: "All passed.",
        actualTime: "01:30:00",
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          comment: "All passed.",
          actualTime: "01:30:00",
        }),
      );
    });

    it("should pass executionPlannedDate through to body unchanged", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        executionPlannedDate: "15/Oct/2025",
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ executionPlannedDate: "15/Oct/2025" }),
      );
    });

    it("should pass null comment through to body (clear)", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        comment: null,
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ comment: null }),
      );
    });

    it("should pass null actualTime through to body (clear)", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        actualTime: null,
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ actualTime: null }),
      );
    });

    it("should pass null buildId through to body (clear)", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        buildId: null,
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ buildId: null }),
      );
    });

    it("should pass executionAssignee through to body", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        executionAssignee: "user-abc-123",
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ executionAssignee: "user-abc-123" }),
      );
    });

    it("should warn and exclude executionResultId when it cannot be resolved", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT) {
          return makeExecutionContextResolver(EXECUTION_CONTEXT_RESPONSE);
        }
        if (key === ResolverKeys.CommonAttribute.EXECUTION_RESULT) {
          return makeFieldResolver(); // no ID → warning
        }
        return { resolve: vi.fn(), resolveAndReturn: vi.fn() };
      });

      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        executionResultId: "InvalidStatus",
        comment: "Still updating",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("InvalidStatus");
    });

    it("should warn and exclude environmentId when it cannot be resolved", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT) {
          return makeExecutionContextResolver(EXECUTION_CONTEXT_RESPONSE);
        }
        if (key === ResolverKeys.SearchableField.ENVIRONMENT) {
          return makeFieldResolver(); // no ID → warning
        }
        return makeFieldResolver(19434);
      });

      // comment keeps body non-empty so update proceeds with a warning
      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        environmentId: "UnknownEnv",
        comment: "Still updating",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("UnknownEnv");
    });

    it("should warn and exclude buildId when it cannot be resolved", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT) {
          return makeExecutionContextResolver(EXECUTION_CONTEXT_RESPONSE);
        }
        if (key === ResolverKeys.SearchableField.BUILD) {
          return makeFieldResolver(); // no ID → warning
        }
        return makeFieldResolver(19434);
      });

      // comment keeps body non-empty so update proceeds with a warning
      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        buildId: "UnknownBuild",
        comment: "Still updating",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("UnknownBuild");
    });

    it("should return confirmation response", async () => {
      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        executionResultId: "Pass",
      });

      expect(result.structuredContent).toMatchObject({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        updated: true,
      });
    });

    it("should return empty content when no warnings", async () => {
      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        executionResultId: "Pass",
      });

      expect(result.content).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // handle — API errors
  // ---------------------------------------------------------------------------

  describe("handle — API errors", () => {
    it("should propagate API errors from PUT", async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error("API Error 500"));

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          executionResultId: "Pass",
        }),
      ).rejects.toThrow("API Error 500");
    });
  });
});

// ---------------------------------------------------------------------------
// UpdateTestCaseExecutionBody schema tests
// ---------------------------------------------------------------------------

describe("UpdateTestCaseExecutionBody", () => {
  it("should accept minimal valid input", () => {
    const result = UpdateTestCaseExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      executionResultId: "Pass",
    });
    expect(result.success).toBe(true);
  });

  it("should accept null comment", () => {
    const result = UpdateTestCaseExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      comment: null,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.comment).toBeNull();
  });

  it("should accept null actualTime", () => {
    const result = UpdateTestCaseExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      actualTime: null,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.actualTime).toBeNull();
  });

  it("should accept valid actualTime format", () => {
    const result = UpdateTestCaseExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      actualTime: "01:30:00",
    });
    expect(result.success).toBe(true);
  });

  it("should accept null plannedDate", () => {
    const result = UpdateTestCaseExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      executionPlannedDate: null,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.executionPlannedDate).toBeNull();
  });

  it("should accept null buildId", () => {
    const result = UpdateTestCaseExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      buildId: null,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.buildId).toBeNull();
  });

  it("should reject invalid actualTime format", () => {
    const result = UpdateTestCaseExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      actualTime: "2h30m",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid plannedDate", () => {
    const result = UpdateTestCaseExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      executionPlannedDate: "2025-10-15",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing testCycleKey", () => {
    const result = UpdateTestCaseExecutionBody.safeParse({
      testCaseKey: "PROJ-TC-42",
      executionResultId: "Pass",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing testCaseKey", () => {
    const result = UpdateTestCaseExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      executionResultId: "Pass",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UpdateTestCaseExecutionResponse schema tests
// ---------------------------------------------------------------------------

describe("UpdateTestCaseExecutionResponse", () => {
  it("should accept valid response", () => {
    const result = UpdateTestCaseExecutionResponse.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      updated: true,
    });
    expect(result.success).toBe(true);
  });

  it("should reject when updated is false", () => {
    const result = UpdateTestCaseExecutionResponse.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      updated: false,
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing testCycleKey", () => {
    const result = UpdateTestCaseExecutionResponse.safeParse({
      testCaseKey: "PROJ-TC-42",
      updated: true,
    });
    expect(result.success).toBe(false);
  });
});
