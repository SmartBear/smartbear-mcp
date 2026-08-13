import type { CacheService } from "../../../common/cache";
import { ENDPOINTS } from "../../config/constants";
import {
  type ProjectContext,
  ResolverKeys,
} from "../../config/field-resolution.types";
import type { ApiClient } from "../../http/api-client";
import { Cache } from "../cache/cache";
import { Resolver } from "./resolver.ts";

/** Execution context data for one test case within a test cycle. */
export interface ExecutionContextEntry {
  /**
   * ID of the test-case-to-test-cycle mapping record.
   * Required by startNewExecution.
   */
  testCycleTestCaseMapId: number;

  /**
   * ID of the latest test case execution.
   * Required by updateExecution, linkBugsToExecution, getLinkedBugsOfExecution.
   * Null when no execution has been started yet for this test case.
   */
  testCaseExecutionId: number | null;
}

/**
 * Response shape: testCaseKey → ExecutionContextEntry (flat — no cycle wrapper).
 * Missing keys are silently omitted (never an HTTP error). Empty {} when nothing resolves.
 */
export type ExecutionContextResponse = Record<string, ExecutionContextEntry>;

/**
 * ExecutionContextResolver — resolves testCycleTestCaseMapId and testCaseExecutionId
 * for one or more test cases within a test cycle, using only human-readable issue keys.
 *
 * This is the single resolver call all execution MCP tools make before any read/write
 * operation. Backed by GET /projects/{projectId}/mcp/testcycles/execution-context.
 *
 * testCycleKey and at least one testCaseKey are REQUIRED. Response is keyed by testCaseKey.
 *
 * Cache layout (mirrors LabelResolver):
 *   projectKey → cache namespace (cleared together on project switch)
 *   resolverKey → "executionContext" (static, from ResolverKeys.SearchableField.EXECUTION_CONTEXT)
 *   name → "TestCycle:{testCycleKey}.TestCase:{testCaseKey}" (lookup key via matchValue)
 * clearCache(projectKey) evicts all entries for that project.
 */
export class ExecutionContextResolver extends Resolver {
  override readonly fieldKeys: readonly string[] = [
    ResolverKeys.SearchableField.EXECUTION_CONTEXT,
  ];
  private readonly apiClient: ApiClient;
  private readonly cache: Cache<ExecutionContextEntry>;

  constructor(apiClient: ApiClient, cacheService: CacheService) {
    super();
    this.apiClient = apiClient;
    this.cache = new Cache<ExecutionContextEntry>(cacheService);
  }

  /** Builds the cache lookup name for a test case within a test cycle. */
  private buildCacheName(testCycleKey: string, testCaseKey: string): string {
    return `TestCycle:${testCycleKey}.TestCase:${testCaseKey}`.toLowerCase();
  }

  async resolve(
    _inputField: string,
    _resolverKey: string,
    _body: Record<string, unknown>,
    _context: ProjectContext,
    _warnings: string[],
  ): Promise<void> {
    // ExecutionContextResolver uses resolveAndReturn — this method is intentionally a no-op
  }

  async resolveAndReturn(
    projectKey: string,
    projectId: number,
    testCycleKey: string,
    testCaseKeys: string[],
  ): Promise<ExecutionContextResponse> {
    const result: ExecutionContextResponse = {};
    const uncachedKeys: string[] = [];
    const resolverKey = ResolverKeys.SearchableField.EXECUTION_CONTEXT;

    // Check cache; collect keys that still need to be fetched
    for (const testCaseKey of testCaseKeys) {
      const name = this.buildCacheName(testCycleKey, testCaseKey);
      const cached = this.cache.matchValue(projectKey, resolverKey, name);
      if (cached === undefined) {
        uncachedKeys.push(testCaseKey);
      } else {
        result[testCaseKey] = cached;
      }
    }

    if (uncachedKeys.length === 0) {
      return result;
    }

    // Fetch only the uncached keys from the API
    const response = await this.apiClient
      .skipAnalytics()
      .get(ENDPOINTS.EXECUTION_CONTEXT(projectId), {
        testCycleKey,
        testCaseKeys: uncachedKeys.join(","),
      });

    const fetched = response as ExecutionContextResponse;

    // Store each entry in the cache bucket and build the return value
    const values: Record<string, ExecutionContextEntry> = {};
    for (const [testCaseKey, entry] of Object.entries(fetched)) {
      const name = this.buildCacheName(testCycleKey, testCaseKey);
      values[name.toLowerCase()] = entry;
      result[testCaseKey] = entry;
    }
    this.cache.set(projectKey, resolverKey, values);

    return result;
  }

  clearCache(projectKey?: string): void {
    this.cache.clear(projectKey);
  }
}
