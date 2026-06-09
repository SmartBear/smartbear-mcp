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
 * Priority is always a single value — no array handling.
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
    const name = body[inputField];
    if (name == null) return;

    const id = await this.resolveAndReturn(
      context.projectKey,
      context.projectId,
      resolverKey,
      name as string,
    );
    if (id === undefined) {
      delete body[inputField];
      warnings.push(
        `Skipped ${inputField} '${name}' — not a recognised defect priority in the current project.`,
      );
    } else {
      body[inputField] = Number(id);
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

    const response = await this.apiClient.get(
      ENDPOINTS.DEFECT_PRIORITIES(projectId),
      { priorityNames: name },
    );
    this.cache.set(projectKey, resolverKey, response as FieldValues);
    return this.cache.matchValue(projectKey, resolverKey, name);
  }

  clearCache(projectKey?: string): void {
    this.cache.clear(projectKey);
  }
}
