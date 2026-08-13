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
 * BuildResolver — resolves a human-readable build name (e.g. "Build 2.0")
 * to its numeric build ID before calling startNewExecution / updateExecution.
 *
 * Backed by GET /projects/{projectId}/mcp/builds?search=
 * which returns { lowercased_name → numeric_id_as_string }.
 *
 * Lazy-loaded on first use and cached per project (same strategy as labels/components).
 * Build is always a single value — no array handling.
 */
export class BuildResolver extends Resolver {
  override readonly fieldKeys: readonly string[] = [
    ResolverKeys.SearchableField.BUILD,
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
    if (name == null || typeof name === "number") return;
    const trimmed = (name as string).trim();

    const id = await this.resolveAndReturn(
      context.projectKey,
      context.projectId,
      resolverKey,
      trimmed,
    );
    if (id !== undefined) {
      body[inputField] = Number(id);
    } else {
      delete body[inputField];
      warnings.push(
        `Skipped ${inputField} '${trimmed}' — not available in the current project.`,
      );
    }
  }

  async resolveAndReturn(
    projectKey: string,
    projectId: number,
    resolverKey: string,
    name: string,
  ): Promise<string | undefined> {
    const trimmed = name.trim();
    const cached = this.cache.matchValue(projectKey, resolverKey, trimmed);
    if (cached !== undefined) return cached;

    const response = await this.apiClient
      .skipAnalytics()
      .get(ENDPOINTS.BUILDS(projectId), {
        search: trimmed,
      });
    this.cache.set(projectKey, resolverKey, response as FieldValues);
    return this.cache.matchValue(projectKey, resolverKey, trimmed);
  }

  clearCache(projectKey?: string): void {
    this.cache.clear(projectKey);
  }
}
