import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../../../../qtm4j/config/constants";
import { ResolverKeys } from "../../../../../qtm4j/config/field-resolution.types";
import {
  UpdateTestStepExecutionBody,
  UpdateTestStepExecutionResponse,
} from "../../../../../qtm4j/schema/update-test-step-execution.schema";
import { UpdateTestStepExecution } from "../../../../../qtm4j/tool/test-execution/update-test-step-execution";

describe("UpdateTestStepExecution", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockFieldResolver: any;
  let instance: UpdateTestStepExecution;

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

  const STEP_EXECUTION_CONTEXT_RESPONSE = {
    "PROJ-TC-42": {
      "1": 2548098,
      "2": 2548099,
      "3": 2548100,
    },
  };

  function makeExecutionContextResolver(result: any) {
    return {
      resolve: vi.fn().mockResolvedValue(undefined),
      resolveAndReturn: vi.fn().mockResolvedValue(result),
    };
  }

  function makeStatusResolver(statusId?: number) {
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
            if (statusId !== undefined) {
              body[inputField] = statusId;
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
        if (key === ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT) {
          return {
            resolve: vi.fn(),
            resolveAndReturn: vi
              .fn()
              .mockResolvedValue(STEP_EXECUTION_CONTEXT_RESPONSE),
          };
        }
        if (key === ResolverKeys.CommonAttribute.EXECUTION_RESULT) {
          return makeStatusResolver(19434); // "Pass" → 19434
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

    instance = new UpdateTestStepExecution(mockClient as any);
  });

  // ---------------------------------------------------------------------------
  // specification
  // ---------------------------------------------------------------------------

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe("Update Test Step Execution");
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
          testStepSeqNo: 1,
          executionResultId: "Pass",
        }),
      ).rejects.toThrow();
    });

    it("should reject missing testCaseKey", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testStepSeqNo: 1,
          executionResultId: "Pass",
        }),
      ).rejects.toThrow();
    });

    it("should reject missing testStepSeqNo", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          executionResultId: "Pass",
        }),
      ).rejects.toThrow();
    });

    it("should reject non-positive testStepSeqNo", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 0,
          executionResultId: "Pass",
        }),
      ).rejects.toThrow();
    });

    it("should reject when no updatable field is provided", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 1,
        }),
      ).rejects.toThrow("Provide at least one updatable field.");
    });

    it("should throw when step seqNo not found in step context", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT) {
          return {
            resolve: vi.fn(),
            resolveAndReturn: vi.fn().mockResolvedValue({}),
          };
        }
        if (key === ResolverKeys.CommonAttribute.EXECUTION_RESULT)
          return makeStatusResolver(19434);
        return { resolve: vi.fn(), resolveAndReturn: vi.fn() };
      });

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-999",
          testStepSeqNo: 1,
          executionResultId: "Pass",
        }),
      ).rejects.toThrow("Step 1 was not found in this execution");
    });

    it("should throw when step context returns null for the step ID", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT) {
          return {
            resolve: vi.fn(),
            resolveAndReturn: vi.fn().mockResolvedValue({
              "PROJ-TC-42": { "2": 2548099 }, // step 1 absent
            }),
          };
        }
        if (key === ResolverKeys.CommonAttribute.EXECUTION_RESULT)
          return makeStatusResolver(19434);
        return { resolve: vi.fn(), resolveAndReturn: vi.fn() };
      });

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 1,
          executionResultId: "Pass",
        }),
      ).rejects.toThrow("Step 1 was not found in this execution");
    });

    it("should throw ToolError when all resolvable fields fail and body becomes empty", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT) {
          return makeExecutionContextResolver(EXECUTION_CONTEXT_RESPONSE);
        }
        if (key === ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT) {
          return {
            resolve: vi.fn(),
            resolveAndReturn: vi
              .fn()
              .mockResolvedValue(STEP_EXECUTION_CONTEXT_RESPONSE),
          };
        }
        return makeStatusResolver(); // no ID → deletes field, adds warning
      });

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 2,
          executionResultId: "InvalidStatus",
        }),
      ).rejects.toThrow("No updatable fields remain after resolution");
    });

    it("should throw when step seqNo not found", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 99,
          executionResultId: "Pass",
        }),
      ).rejects.toThrow("Step 99 was not found in this execution");
    });

    it("should throw when step resolver returns empty map", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT)
          return makeExecutionContextResolver(EXECUTION_CONTEXT_RESPONSE);
        if (key === ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT) {
          return {
            resolve: vi.fn(),
            resolveAndReturn: vi.fn().mockResolvedValue({}),
          };
        }
        return makeStatusResolver(19434);
      });

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 2,
          executionResultId: "Pass",
        }),
      ).rejects.toThrow("Step 2 was not found in this execution");
    });
  });

  // ---------------------------------------------------------------------------
  // handle
  // ---------------------------------------------------------------------------

  describe("handle", () => {
    it("should resolve step seqNo and PUT to the correct testStep endpoint", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 2,
        executionResultId: "Pass",
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        ENDPOINTS.UPDATE_TEST_STEP_EXECUTION("PROJ-TR-101", 2548099),
        expect.any(Object),
      );
    });

    it("should resolve status name to executionResultId", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 2,
        executionResultId: "Pass",
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ executionResultId: 19434 }),
      );
    });

    it("should include executionResultId, comment, and actualResult in PUT body", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 2,
        executionResultId: "Pass",
        comment: "Step passed.",
        actualResult: "Login page loaded.",
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          executionResultId: 19434,
          comment: "Step passed.",
          actualResult: "Login page loaded.",
        }),
      );
    });

    it("should pass null actualResult through to body (clear)", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 1,
        actualResult: null,
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ actualResult: null }),
      );
    });

    it("should warn and exclude status when it cannot be resolved", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT)
          return makeExecutionContextResolver(EXECUTION_CONTEXT_RESPONSE);
        if (key === ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT) {
          return {
            resolve: vi.fn(),
            resolveAndReturn: vi
              .fn()
              .mockResolvedValue(STEP_EXECUTION_CONTEXT_RESPONSE),
          };
        }
        if (key === ResolverKeys.CommonAttribute.EXECUTION_RESULT)
          return makeStatusResolver(); // no ID → warning
        return { resolve: vi.fn(), resolveAndReturn: vi.fn() };
      });

      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 2,
        executionResultId: "InvalidStatus",
        comment: "Still updating",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("InvalidStatus");
    });

    it("should return confirmation response with testStepSeqNo", async () => {
      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 2,
        executionResultId: "Pass",
      });

      expect(result.structuredContent).toMatchObject({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 2,
        updated: true,
      });
    });

    it("should return empty content when no warnings", async () => {
      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 2,
        executionResultId: "Pass",
      });

      expect(result.content).toEqual([]);
    });

    it("should include executionResultName in structuredContent when API returns it", async () => {
      mockApiClient.put.mockResolvedValueOnce({ executionResultName: "Pass" });

      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        testStepSeqNo: 2,
        executionResultId: "Pass",
      });

      expect(result.structuredContent.executionResultName).toBe("Pass");
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
          testStepSeqNo: 2,
          executionResultId: "Pass",
        }),
      ).rejects.toThrow("API Error 500");
    });
  });
});

// ---------------------------------------------------------------------------
// UpdateTestStepExecutionBody schema tests
// ---------------------------------------------------------------------------

describe("UpdateTestStepExecutionBody", () => {
  it("should accept minimal valid input", () => {
    const result = UpdateTestStepExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      testStepSeqNo: 1,
      executionResultId: "Pass",
    });
    expect(result.success).toBe(true);
  });

  it("should accept null comment", () => {
    const result = UpdateTestStepExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      testStepSeqNo: 1,
      comment: null,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.comment).toBeNull();
  });

  it("should accept null actualResult", () => {
    const result = UpdateTestStepExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      testStepSeqNo: 2,
      actualResult: null,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.actualResult).toBeNull();
  });

  it("should reject missing testStepSeqNo", () => {
    const result = UpdateTestStepExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      executionResultId: "Pass",
    });
    expect(result.success).toBe(false);
  });

  it("should reject non-positive testStepSeqNo", () => {
    const result = UpdateTestStepExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      testStepSeqNo: 0,
      executionResultId: "Pass",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing testCycleKey", () => {
    const result = UpdateTestStepExecutionBody.safeParse({
      testCaseKey: "PROJ-TC-42",
      testStepSeqNo: 1,
      executionResultId: "Pass",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// UpdateTestStepExecutionResponse schema tests
// ---------------------------------------------------------------------------

describe("UpdateTestStepExecutionResponse", () => {
  it("should accept valid response", () => {
    const result = UpdateTestStepExecutionResponse.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      testStepSeqNo: 2,
      updated: true,
    });
    expect(result.success).toBe(true);
  });

  it("should reject when updated is false", () => {
    const result = UpdateTestStepExecutionResponse.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      testStepSeqNo: 2,
      updated: false,
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing testStepSeqNo", () => {
    const result = UpdateTestStepExecutionResponse.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      updated: true,
    });
    expect(result.success).toBe(false);
  });
});
