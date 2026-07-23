import type { CacheService } from "../../../common/cache";
import { ENDPOINTS } from "../../config/constants";
import {
  type FieldValues,
  type ProjectContext,
  ResolverKeys,
} from "../../config/field-resolution.types";
import type { ApiClient } from "../../http/api-client";
import { Cache } from "../cache/cache";
import { Resolver } from "./resolver.ts";

/**
 * DefectPriorityResolver — resolves a human-readable defect priority name (e.g. "High")
 * to its internal numeric priority ID before setting priority on a defect execution record.
 *
 * Backed by GET /projects/{projectId}/mcp/defects/priorities?priorityNames={name}
 * which returns { lowercased_name → numeric_id }.
 *
 * Lazy-loaded on first use and cached per project.
 */
export class DefectPriorityResolver extends Resolver {
  override readonly fieldKeys: readonly string[] = [
    ResolverKeys.SearchableField.DEFECT_PRIORITY,
  ];

  private readonly cache: Cache;
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient, cacheService: CacheService) {
    super();
    this.apiClient = apiClient;
    this.cache = new Cache(cacheService);
  }

  async resolve(
    inputField: string,
    resolverKey: string,
    body: Record<string, unknown>,
    context: ProjectContext,
    warnings: string[],
  ): Promise<void> {
    const value = body[inputField];
    if (!Array.isArray(value) || value.length === 0) return;

    const resolvedIds: number[] = [];
    for (const item of value) {
      const trimmed = String(item).trim();
      const id = await this.resolveAndReturn(
        context.projectKey,
        context.projectId,
        resolverKey,
        trimmed,
      );
      if (id === undefined) {
        warnings.push(
          `Skipped ${inputField} '${trimmed}' — not a recognised defect priority in the current project.`,
        );
      } else {
        resolvedIds.push(Number(id));
      }
    }
    if (resolvedIds.length > 0) {
      body[inputField] = resolvedIds;
    } else {
      delete body[inputField];
    }
  }

  async resolveAndReturn(
    projectKey: string,
    projectId: number,
    resolverKey: string,
    name: string,
  ): Promise<string | undefined> {
    const cached = this.cache.matchValue(projectKey, resolverKey, name);
    if (cached !== undefined) return cached;

    const response = await this.apiClient
      .skipAnalytics()
      .get(ENDPOINTS.DEFECT_PRIORITIES(projectId), { priorityNames: name });
    this.cache.set(projectKey, resolverKey, response as FieldValues);
    return this.cache.matchValue(projectKey, resolverKey, name);
  }

  clearCache(projectKey?: string): void {
    this.cache.clear(projectKey);
  }
}
