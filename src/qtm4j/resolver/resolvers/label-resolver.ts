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

export class LabelResolver extends Resolver {
  override readonly fieldKeys: readonly string[] = [
    ResolverKeys.SearchableField.LABEL,
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
    const raw = body[inputField];
    if (raw == null) return;

    const isArray = Array.isArray(raw);
    const names = isArray ? (raw as string[]) : [raw as string];
    const ids: number[] = [];

    for (const name of names) {
      const id = await this.resolveAndReturn(
        context.projectKey,
        context.projectId,
        resolverKey,
        name,
      );
      if (id !== undefined) {
        ids.push(Number(id));
      } else {
        warnings.push(
          `Skipped ${inputField} '${name}' — not available in the current project.`,
        );
      }
    }

    if (ids.length > 0) {
      body[inputField] = isArray ? ids : ids[0];
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

    const response = await this.apiClient.get(ENDPOINTS.LABELS(projectId), {
      search: name,
    });
    this.cache.set(projectKey, resolverKey, response as FieldValues);
    return this.cache.matchValue(projectKey, resolverKey, name);
  }

  clearCache(projectKey?: string): void {
    this.cache.clear(projectKey);
  }
}
