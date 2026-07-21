import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENDPOINTS } from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types";
import {
  LinkBugsResponse,
  LinkTestCaseBugsBody,
} from "../../schema/link-bugs.schema";
import { LinkTestCaseBugs } from "./link-test-case-bugs";

describe("LinkTestCaseBugs", () => {
  let mockClient: any;
  let mockApiClient: any;
  let mockFieldResolver: any;
  let instance: LinkTestCaseBugs;

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

  const DEFECT_ID_MAP: Record<string, number> = {
    "PROJ-456": 14488,
    "PROJ-789": 14489,
    "PROJ-999": 14490,
  };

  function makeDefectIdResolver(idMap: Record<string, number> = DEFECT_ID_MAP) {
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
            const keys = body[inputField] as string[];
            if (!Array.isArray(keys) || keys.length === 0) return;
            const resolvedIds: number[] = [];
            const unresolvedKeys: string[] = [];
            for (const key of keys) {
              const id = idMap[key];
              if (id !== undefined) {
                resolvedIds.push(id);
              } else {
                unresolvedKeys.push(key);
              }
            }
            if (resolvedIds.length > 0) {
              body[inputField] = resolvedIds;
            } else {
              delete body[inputField];
            }
            for (const key of unresolvedKeys) {
              warnings.push(
                `Bug key '${key}' not found in QTM4J defect tracking — skipped.`,
              );
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
        if (key === ResolverKeys.SearchableField.DEFECT_KEY_TO_ID) {
          return makeDefectIdResolver();
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

    instance = new LinkTestCaseBugs(mockClient as any);
  });

  // ---------------------------------------------------------------------------
  // specification
  // ---------------------------------------------------------------------------

  describe("specification", () => {
    it("should have correct tool metadata", () => {
      expect(instance.specification.title).toBe(
        "Link Bugs to Test Case Execution",
      );
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
        instance.handle({
          testCaseKey: "PROJ-TC-42",
          defectIDs: ["PROJ-456"],
        }),
      ).rejects.toThrow();
    });

    it("should reject missing testCaseKey", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          defectIDs: ["PROJ-456"],
        }),
      ).rejects.toThrow();
    });

    it("should reject missing defectIDs", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
        }),
      ).rejects.toThrow();
    });

    it("should reject empty defectIDs array", async () => {
      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          defectIDs: [],
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
        return { resolve: vi.fn(), resolveAndReturn: vi.fn() };
      });

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-999",
          testCaseKey: "PROJ-TC-42",
          defectIDs: ["PROJ-456"],
        }),
      ).rejects.toThrow("is not linked to test cycle");
    });

    it("should throw when testCaseExecutionId is null (no execution started)", async () => {
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
        return { resolve: vi.fn(), resolveAndReturn: vi.fn() };
      });

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          defectIDs: ["PROJ-456"],
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
          defectIDs: ["PROJ-456"],
        }),
      ).rejects.toThrow("No active project set");
    });
  });

  // ---------------------------------------------------------------------------
  // handle — happy path
  // ---------------------------------------------------------------------------

  describe("handle — happy path", () => {
    it("should PUT to the correct endpoint with resolved defect IDs", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        defectIDs: ["PROJ-456", "PROJ-789"],
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.stringContaining(
          ENDPOINTS.GET_LINKED_BUGS_TEST_CASE_EXECUTION("PROJ-TR-101", 725982),
        ),
        { defectIDs: [14488, 14489] },
      );
    });

    it("should deduplicate defectIDs before sending (via schema transform)", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        defectIDs: ["PROJ-456", "PROJ-456", "PROJ-789"],
      });

      const calledBody = mockApiClient.put.mock.calls[0][1];
      expect(calledBody.defectIDs).toEqual([14488, 14489]);
    });

    it("should include returnLinkedDefectCount=true in URL by default", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        defectIDs: ["PROJ-456"],
      });

      const calledEndpoint = mockApiClient.put.mock.calls[0][0];
      expect(calledEndpoint).toContain("returnLinkedDefectCount=true");
    });

    it("should NOT include returnLinkedDefectCount param when set to false", async () => {
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        defectIDs: ["PROJ-456"],
        returnLinkedDefectCount: false,
      });

      const calledEndpoint = mockApiClient.put.mock.calls[0][0];
      expect(calledEndpoint).not.toContain("returnLinkedDefectCount");
    });

    it("should return linked: true in structuredContent", async () => {
      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        defectIDs: ["PROJ-456"],
      });

      expect(result.structuredContent).toMatchObject({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        linked: true,
      });
    });

    it("should return empty content when no warnings", async () => {
      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        defectIDs: ["PROJ-456"],
      });

      expect(result.content).toEqual([]);
    });

    it("should include filter.jql in the request body when provided", async () => {
      const jql = "project = PROJ AND status = 'To Do'";
      await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        defectIDs: ["PROJ-456"],
        filter: { jql },
      });

      expect(mockApiClient.put).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ filter: { jql } }),
      );
    });

    it("should surface warningMessages from API response in content", async () => {
      mockApiClient.put.mockResolvedValueOnce({
        warningMessages: ["PROJ-999 is not accessible in Jira."],
      });

      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        defectIDs: ["PROJ-456", "PROJ-999"],
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("PROJ-999 is not accessible");
    });

    it("should include linkedDefectCount in structuredContent when returned by API", async () => {
      mockApiClient.put.mockResolvedValueOnce({ linkedDefectCount: 2 });

      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        defectIDs: ["PROJ-456", "PROJ-789"],
      });

      expect(result.structuredContent.linkedDefectCount).toBe(2);
    });

    it("should throw ToolError when all defect keys are unresolvable and no filter.jql provided", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT) {
          return {
            resolve: vi.fn(),
            resolveAndReturn: vi
              .fn()
              .mockResolvedValue(EXECUTION_CONTEXT_RESPONSE),
          };
        }
        if (key === ResolverKeys.SearchableField.DEFECT_KEY_TO_ID) {
          return makeDefectIdResolver({});
        }
        return { resolve: vi.fn(), resolveAndReturn: vi.fn() };
      });

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          defectIDs: ["PROJ-UNKNOWN"],
        }),
      ).rejects.toThrow("No bugs to link after resolution");
    });

    it("should warn (not throw) when some defect keys unresolvable but others succeed", async () => {
      mockFieldResolver.getResolver.mockImplementation((key: string) => {
        if (key === ResolverKeys.SearchableField.EXECUTION_CONTEXT) {
          return {
            resolve: vi.fn(),
            resolveAndReturn: vi
              .fn()
              .mockResolvedValue(EXECUTION_CONTEXT_RESPONSE),
          };
        }
        if (key === ResolverKeys.SearchableField.DEFECT_KEY_TO_ID) {
          // Only PROJ-456 resolves; PROJ-UNKNOWN does not
          return makeDefectIdResolver({ "PROJ-456": 14488 });
        }
        return { resolve: vi.fn(), resolveAndReturn: vi.fn() };
      });

      const result = await instance.handle({
        testCycleKey: "PROJ-TR-101",
        testCaseKey: "PROJ-TC-42",
        defectIDs: ["PROJ-456", "PROJ-UNKNOWN"],
      });

      expect(result.content).toHaveLength(1);
      expect(result.content[0].text).toContain("PROJ-UNKNOWN");
      expect(result.structuredContent.linked).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // handle — API error
  // ---------------------------------------------------------------------------

  describe("handle — API errors", () => {
    it("should propagate API errors from PUT", async () => {
      mockApiClient.put.mockRejectedValueOnce(new Error("API Error"));

      await expect(
        instance.handle({
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          defectIDs: ["PROJ-456"],
        }),
      ).rejects.toThrow("API Error");
    });
  });
});

// ---------------------------------------------------------------------------
// Schema tests
// ---------------------------------------------------------------------------

describe("LinkTestCaseBugsBody", () => {
  it("should accept minimal valid input", () => {
    const result = LinkTestCaseBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      defectIDs: ["PROJ-456"],
    });
    expect(result.success).toBe(true);
  });

  it("should reject empty defectIDs", () => {
    const result = LinkTestCaseBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      defectIDs: [],
    });
    expect(result.success).toBe(false);
  });

  it("should deduplicate defectIDs via schema transform", () => {
    const result = LinkTestCaseBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      defectIDs: ["PROJ-456", "PROJ-456", "PROJ-789"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.defectIDs).toEqual(["PROJ-456", "PROJ-789"]);
    }
  });

  it("should default returnLinkedDefectCount to true", () => {
    const result = LinkTestCaseBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      defectIDs: ["PROJ-456"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.returnLinkedDefectCount).toBe(true);
    }
  });

  it("should accept filter.jql without defectIDs", () => {
    const result = LinkTestCaseBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      filter: { jql: "project = PROJ AND issuetype = Bug" },
    });
    expect(result.success).toBe(true);
  });

  it("should reject when neither defectIDs nor filter.jql provided", () => {
    const result = LinkTestCaseBugsBody.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
    });
    expect(result.success).toBe(false);
  });
});

describe("LinkBugsResponse", () => {
  it("should accept valid response", () => {
    const result = LinkBugsResponse.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      linked: true,
    });
    expect(result.success).toBe(true);
  });

  it("should accept response with linkedDefectCount and warningMessages", () => {
    const result = LinkBugsResponse.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      linked: true,
      linkedDefectCount: 2,
      warningMessages: ["Some warning"],
    });
    expect(result.success).toBe(true);
  });

  it("should reject linked: false", () => {
    const result = LinkBugsResponse.safeParse({
      testCycleKey: "PROJ-TR-101",
      testCaseKey: "PROJ-TC-42",
      linked: false,
    });
    expect(result.success).toBe(false);
  });
});
