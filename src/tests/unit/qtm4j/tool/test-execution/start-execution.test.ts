import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../../../../qtm4j/config/constants";
import { ResolverKeys } from "../../../../../qtm4j/config/field-resolution.types";
import {
  StartExecutionBody,
  StartExecutionResponse,
} from "../../../../../qtm4j/schema/start-execution.schema";
import { StartExecution } from "../../../../../qtm4j/tool/test-execution/start-execution";

// ---------------------------------------------------------------------------
// StartExecution tool tests
// ---------------------------------------------------------------------------

describe("StartExecution", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockFieldResolver: any;
  let execContextResolver: any;
  let stepExecContextResolver: any;
  let instance: StartExecution;

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

  beforeEach(() => {
    vi.clearAllMocks();

    execContextResolver = {
      resolve: vi.fn().mockResolvedValue(undefined),
      resolveAndReturn: vi.fn().mockResolvedValue(EXECUTION_CONTEXT_RESPONSE),
      clearCache: vi.fn(),
    };

    stepExecContextResolver = {
      resolve: vi.fn().mockResolvedValue(undefined),
      resolveAndReturn: vi.fn().mockResolvedValue(undefined),
      clearCache: vi.fn(),
    };

    mockFieldResolver = {
      requireProjectContext: vi.fn().mockReturnValue(PROJECT_CONTEXT),
      getResolver: vi.fn().mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT)
          return execContextResolver;
        if (key === ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT)
          return stepExecContextResolver;
        // Default no-op resolver for environment, build, etc.
        return {
          resolve: vi.fn().mockResolvedValue(undefined),
          resolveAndReturn: vi.fn().mockResolvedValue(undefined),
          clearCache: vi.fn(),
        };
      }),
    };

    mockApiClient = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue(undefined),
      put: vi.fn(),
      delete: vi.fn(),
    };

    mockClient = {
      getApiClient: vi.fn().mockReturnValue(mockApiClient),
      getResolverRegistry: vi.fn().mockReturnValue(mockFieldResolver),
    };

    instance = new StartExecution(mockClient as any);
  });

  // ---------------------------------------------------------------------------
  // specification
  // ---------------------------------------------------------------------------

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe("Start New Execution");
      expect(instance.specification.readOnly).toBe(false);
      expect(instance.specification.idempotent).toBe(false);
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
        instance.handle({ testCaseKey: "PROJ-TC-42" }),
      ).rejects.toThrow();
    });

    it("should reject missing testCaseKey", async () => {
      await expect(
        instance.handle({ testCycleKey: "PROJ-TR-101" }),
      ).rejects.toThrow();
    });

    it("should reject invalid executionPlannedDate format (ISO 8601)", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          executionPlannedDate: "2025-10-15",
        }),
      ).rejects.toThrow();
    });

    it("should reject lowercase month in executionPlannedDate", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          executionPlannedDate: "15/oct/2025",
        }),
      ).rejects.toThrow();
    });

    it("should reject actualTime in HH:mm format (missing seconds)", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          actualTime: "02:30",
        }),
      ).rejects.toThrow();
    });

    it("should reject actualTime in invalid format", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          actualTime: "2h30m",
        }),
      ).rejects.toThrow();
    });

    it("should accept cloneFrom = 0 (nonnegative)", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          cloneFrom: 0,
        }),
      ).resolves.toBeDefined();
    });

    it("should reject cloneFrom < 0", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          cloneFrom: -1,
        }),
      ).rejects.toThrow();
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

    it("should throw ToolError when test case not found in execution context (empty map)", async () => {
      execContextResolver.resolveAndReturn.mockResolvedValue({});
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-999",
          testCaseKey: "PROJ-TC-42",
        }),
      ).rejects.toThrow("is not linked to test cycle");
    });

    it("should throw ToolError when test case key not found in execution context map", async () => {
      execContextResolver.resolveAndReturn.mockResolvedValue({});
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-999",
        }),
      ).rejects.toThrow("is not linked to test cycle");
    });
  });

  // ---------------------------------------------------------------------------
  // handle — happy path
  // ---------------------------------------------------------------------------

  describe("handle — happy path", () => {
    it("should POST to the correct endpoint with testCycleTestCaseMapId", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
      });

      const calledEndpoint = mockApiClient.post.mock.calls[0][0];
      expect(calledEndpoint).toContain(
        ENDPOINTS.START_NEW_EXECUTION("PROJ-TR-101", 614823),
      );
    });

    it("should return structured response with testCycleKey, testCaseKey and created: true", async () => {
      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
      });

      expect(result.structuredContent).toMatchObject({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        created: true,
      });
    });

    it("should return empty content when no warnings", async () => {
      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
      });

      expect(result.content).toEqual([]);
    });

    it("should include assignee and actualTime in the POST body", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        assignee: "user-abc",
        actualTime: "02:30:00",
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          assignee: "user-abc",
          actualTime: "02:30:00",
        }),
      );
    });

    it("should include executionPlannedDate in the POST body as-is (no conversion)", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        executionPlannedDate: "15/Oct/2025",
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ executionPlannedDate: "15/Oct/2025" }),
      );
    });

    it("should NOT include testCycleKey, testCaseKey, or cloneFrom in the POST body", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        cloneFrom: 725981,
      });

      const body = mockApiClient.post.mock.calls[0][1];
      expect(body).not.toHaveProperty("testCycleKey");
      expect(body).not.toHaveProperty("testCaseKey");
      expect(body).not.toHaveProperty("cloneFrom");
    });

    it("should append cloneFrom as query param when provided", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        cloneFrom: 725981,
      });

      const calledEndpoint = mockApiClient.post.mock.calls[0][0];
      expect(calledEndpoint).toContain("cloneFrom=725981");
    });

    it("should NOT append cloneFrom to query params when omitted", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
      });

      const calledEndpoint = mockApiClient.post.mock.calls[0][0];
      expect(calledEndpoint).not.toContain("cloneFrom");
    });

    it("should send empty body when cloneFrom is set (server ignores all body fields)", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        cloneFrom: 725981,
        cloneExecutionCustomFields: true,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(expect.any(String), {});
    });

    it("should include cloneExecutionCustomFields in POST body when cloneFrom is not set", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        cloneExecutionCustomFields: true,
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ cloneExecutionCustomFields: true }),
      );
    });

    it("should call ExecutionContextResolver with correct args", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
      });

      expect(execContextResolver.resolveAndReturn).toHaveBeenCalledWith(
        PROJECT_CONTEXT.projectKey,
        PROJECT_CONTEXT.projectId,
        "PROJ-TR-101",
        ["PROJ-TC-42"],
      );
    });
  });

  // ---------------------------------------------------------------------------
  // handle — environment resolution
  // ---------------------------------------------------------------------------

  describe("handle — environment resolution", () => {
    it("should resolve environment name to numeric ID in the POST body", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT)
          return execContextResolver;
        if (key === ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT)
          return stepExecContextResolver;
        if (key === ResolverKeys.SearchableField.ENVIRONMENT) {
          return {
            resolve: vi
              .fn()
              .mockImplementation(
                async (
                  inputField: string,
                  _rk: string,
                  body: Record<string, unknown>,
                ) => {
                  body[inputField] = 1562;
                },
              ),
            resolveAndReturn: vi.fn(),
            clearCache: vi.fn(),
          };
        }
        return {
          resolve: vi.fn().mockResolvedValue(undefined),
          resolveAndReturn: vi.fn(),
          clearCache: vi.fn(),
        };
      });

      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        environmentId: "Production",
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ environmentId: 1562 }),
      );
    });

    it("should warn and omit environmentId when name cannot be resolved", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT)
          return execContextResolver;
        if (key === ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT)
          return stepExecContextResolver;
        if (key === ResolverKeys.SearchableField.ENVIRONMENT) {
          return {
            resolve: vi
              .fn()
              .mockImplementation(
                async (
                  inputField: string,
                  _rk: string,
                  body: Record<string, unknown>,
                  _ctx: unknown,
                  warnings: string[],
                ) => {
                  delete body[inputField];
                  warnings.push(
                    `Skipped ${inputField} 'UnknownEnv' — not available.`,
                  );
                },
              ),
            resolveAndReturn: vi.fn(),
            clearCache: vi.fn(),
          };
        }
        return {
          resolve: vi.fn().mockResolvedValue(undefined),
          resolveAndReturn: vi.fn(),
          clearCache: vi.fn(),
        };
      });

      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        environmentId: "UnknownEnv",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("UnknownEnv");
    });
  });

  // ---------------------------------------------------------------------------
  // handle — build resolution
  // ---------------------------------------------------------------------------

  describe("handle — build resolution", () => {
    it("should resolve build name to numeric ID in the POST body", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT)
          return execContextResolver;
        if (key === ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT)
          return stepExecContextResolver;
        if (key === ResolverKeys.SearchableField.BUILD) {
          return {
            resolve: vi
              .fn()
              .mockImplementation(
                async (
                  inputField: string,
                  _rk: string,
                  body: Record<string, unknown>,
                ) => {
                  body[inputField] = 2001;
                },
              ),
            resolveAndReturn: vi.fn(),
            clearCache: vi.fn(),
          };
        }
        return {
          resolve: vi.fn().mockResolvedValue(undefined),
          resolveAndReturn: vi.fn(),
          clearCache: vi.fn(),
        };
      });

      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        buildId: "Build 2.0",
      });

      expect(mockApiClient.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ buildId: 2001 }),
      );
    });

    it("should warn and omit buildId when name cannot be resolved", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT)
          return execContextResolver;
        if (key === ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT)
          return stepExecContextResolver;
        if (key === ResolverKeys.SearchableField.BUILD) {
          return {
            resolve: vi
              .fn()
              .mockImplementation(
                async (
                  inputField: string,
                  _rk: string,
                  body: Record<string, unknown>,
                  _ctx: unknown,
                  warnings: string[],
                ) => {
                  delete body[inputField];
                  warnings.push(
                    `Skipped ${inputField} 'UnknownBuild' — not available.`,
                  );
                },
              ),
            resolveAndReturn: vi.fn(),
            clearCache: vi.fn(),
          };
        }
        return {
          resolve: vi.fn().mockResolvedValue(undefined),
          resolveAndReturn: vi.fn(),
          clearCache: vi.fn(),
        };
      });

      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        buildId: "UnknownBuild",
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("UnknownBuild");
    });
  });

  // ---------------------------------------------------------------------------
  // handle — cache eviction
  // ---------------------------------------------------------------------------

  describe("handle — cache eviction", () => {
    it("should clear ExecutionContext cache after a successful POST", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
      });

      expect(execContextResolver.clearCache).toHaveBeenCalledWith(
        PROJECT_CONTEXT.projectKey,
      );
    });

    it("should clear StepExecutionContext cache after a successful POST", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
      });

      expect(stepExecContextResolver.clearCache).toHaveBeenCalledWith(
        PROJECT_CONTEXT.projectKey,
      );
    });

    it("should NOT clear cache when POST fails", async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error("Network error"));

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
        }),
      ).rejects.toThrow();

      expect(execContextResolver.clearCache).not.toHaveBeenCalled();
      expect(stepExecContextResolver.clearCache).not.toHaveBeenCalled();
    });
  });

  // ---------------------------------------------------------------------------
  // handle — API errors
  // ---------------------------------------------------------------------------

  describe("handle — API errors", () => {
    it("should propagate API errors from POST", async () => {
      mockApiClient.post.mockRejectedValueOnce(new Error("API Error 500"));

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
        }),
      ).rejects.toThrow("API Error 500");
    });
  });
});

// ---------------------------------------------------------------------------
// StartExecutionBody — schema unit tests
// ---------------------------------------------------------------------------

describe("StartExecutionBody", () => {
  it("should accept minimal valid input", () => {
    const result = StartExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
    });
    expect(result.success).toBe(true);
  });

  it("should accept valid executionPlannedDate in dd/MMM/yyyy format", () => {
    const result = StartExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      executionPlannedDate: "15/Oct/2025",
    });
    expect(result.success).toBe(true);
  });

  it("should reject executionPlannedDate in ISO 8601 format", () => {
    const result = StartExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      executionPlannedDate: "2025-10-15",
    });
    expect(result.success).toBe(false);
  });

  it("should reject lowercase month in executionPlannedDate", () => {
    const result = StartExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      executionPlannedDate: "15/oct/2025",
    });
    expect(result.success).toBe(false);
  });

  it("should accept valid actualTime in HH:mm:ss format", () => {
    const result = StartExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      actualTime: "02:30:00",
    });
    expect(result.success).toBe(true);
  });

  it("should reject actualTime in HH:mm format (missing seconds)", () => {
    const result = StartExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      actualTime: "02:30",
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid actualTime format", () => {
    const result = StartExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      actualTime: "2h30m",
    });
    expect(result.success).toBe(false);
  });

  it("should accept cloneFrom = 0 (nonnegative)", () => {
    const result = StartExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      cloneFrom: 0,
    });
    expect(result.success).toBe(true);
  });

  it("should accept positive cloneFrom", () => {
    const result = StartExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      cloneFrom: 725981,
    });
    expect(result.success).toBe(true);
  });

  it("should reject cloneFrom < 0", () => {
    const result = StartExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      cloneFrom: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should accept all optional fields together", () => {
    const result = StartExecutionBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      assignee: "5e4a642c1c9d440008f2a2b4",
      executionPlannedDate: "15/Oct/2025",
      environmentId: "Production",
      buildId: "Build 2.0",
      actualTime: "01:00:00",
      cloneFrom: 725981,
      cloneExecutionCustomFields: true,
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// StartExecutionResponse — schema unit tests
// ---------------------------------------------------------------------------

describe("StartExecutionResponse", () => {
  it("should accept a valid success response", () => {
    const result = StartExecutionResponse.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      created: true,
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing testCycleKey", () => {
    const result = StartExecutionResponse.safeParse({
      testCaseKey: "PROJ-TC-42",
      created: true,
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing testCaseKey", () => {
    const result = StartExecutionResponse.safeParse({
      testCycleKey: "PROJ-TR-101",
      created: true,
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing created field", () => {
    const result = StartExecutionResponse.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
    });
    expect(result.success).toBe(false);
  });

  it("should reject created: false (must be literal true)", () => {
    const result = StartExecutionResponse.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      created: false,
    });
    expect(result.success).toBe(false);
  });
});
