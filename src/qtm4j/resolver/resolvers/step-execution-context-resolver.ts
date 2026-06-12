import type { CacheService } from "../../../common/cache";
import { ENDPOINTS } from "../../config/constants";
import {
  type ProjectContext,
  ResolverKeys,
} from "../../config/field-resolution.types";
import type { ApiClient } from "../../http/api-client";
import { Cache } from "../cache/cache";
import { Resolver } from "./resolver.ts";

/**
 * StepExecutionContextResolver — resolves testStepSeqNo → testStepExecutionId
 * for one or more step sequence numbers within a test case execution.
 *
 * Backed by GET /projects/{projectId}/mcp/testcycles/step-execution-context.
 * Replaces the old GET .../teststeps + client-side seqNo search approach.
 *
 * Response is nested: testCaseKey → { seqNo (string) → testStepExecutionId }.
 * Empty {} when none of the seqNos resolve (bad key or no execution started).
 *
 * Cache layout (mirrors LabelResolver):
 *   projectKey → cache namespace (cleared together on project switch)
 *   resolverKey → "stepExecutionContext" (static, from ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT)
 *   name → "TestCycle:{testCycleKey}.TestCase:{testCaseKey}.Step:{seqNo}" (lookup key via matchValue)
 * clearCache(projectKey) evicts all entries for that project.
 */
export class StepExecutionContextResolver extends Resolver {
  override readonly fieldKeys: readonly string[] = [
    ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT,
  ];
  private readonly apiClient: ApiClient;
  private readonly cache: Cache;

  constructor(apiClient: ApiClient, cacheService: CacheService) {
    super();
    this.apiClient = apiClient;
    this.cache = new Cache(cacheService);
  }

  /** Builds the cache lookup name for a step within a test case execution. */
  private buildCacheName(
    testCycleKey: string,
    testCaseKey: string,
    seqNo: number | string,
  ): string {
    return `TestCycle:${testCycleKey}.TestCase:${testCaseKey}.Step:${seqNo}`;
  }

  async resolve(
    _inputField: string,
    _resolverKey: string,
    _body: Record<string, unknown>,
    _context: ProjectContext,
    _warnings: string[],
  ): Promise<void> {
    // StepExecutionContextResolver uses resolveAndReturn — intentionally a no-op
  }

  async resolveAndReturn(
    projectKey: string,
    projectId: number,
    testCycleKey: string,
    testCaseKey: string,
    seqNos: number[],
  ): Promise<Record<string, Record<number, number>>> {
    const cachedSteps: Record<number, number> = {};
    const uncachedSeqNos: number[] = [];
    const resolverKey = ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT;

    // Check cache; collect seqNos that still need to be fetched
    for (const seqNo of seqNos) {
      const name = this.buildCacheName(testCycleKey, testCaseKey, seqNo);
      const cached = this.cache.matchValue(projectKey, resolverKey, name);
      if (cached === undefined) {
        uncachedSeqNos.push(seqNo);
      } else {
        cachedSteps[seqNo] = Number(cached);
      }
    }

    if (uncachedSeqNos.length === 0) {
      return Object.keys(cachedSteps).length > 0
        ? { [testCaseKey]: cachedSteps }
        : {};
    }

    // Fetch only the uncached seqNos from the API
    const response = await this.apiClient.get(
      ENDPOINTS.STEP_EXECUTION_CONTEXT(projectId),
      { testCycleKey, testCaseKey, seqNos: uncachedSeqNos.join(",") },
    );

    const fetched = response as Record<string, Record<string, number>>;
    const fetchedSteps = fetched[testCaseKey] ?? {};

    // Store each resolved step ID in the cache bucket
    const values: Record<string, string> = {};
    for (const [seqNo, stepExecutionId] of Object.entries(fetchedSteps)) {
      const name = this.buildCacheName(testCycleKey, testCaseKey, seqNo);
      values[name.toLowerCase()] = String(stepExecutionId);
      cachedSteps[Number(seqNo)] = stepExecutionId;
    }
    if (Object.keys(values).length > 0) {
      this.cache.set(projectKey, resolverKey, values);
    }

    return Object.keys(cachedSteps).length > 0
      ? { [testCaseKey]: cachedSteps }
      : {};
  }

  clearCache(projectKey?: string): void {
    this.cache.clear(projectKey);
  }
}
