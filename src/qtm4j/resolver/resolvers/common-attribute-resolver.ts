import type { CacheService } from "../../../common/cache.ts";
import { ENDPOINTS } from "../../config/constants.ts";
import {
  type FieldValues,
  type ProjectContext,
  ResolverKeys,
} from "../../config/field-resolution.types.ts";
import type { ApiClient } from "../../http/api-client.ts";
import { Cache } from "../cache/cache.ts";
import { Resolver } from "./resolver.ts";

export class CommonAttributeResolver extends Resolver {
  override readonly fieldKeys: readonly string[] = Object.values(
    ResolverKeys.CommonAttribute,
  );

  readonly cache: Cache;
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient, cacheService: CacheService) {
    super();
    this.apiClient = apiClient;
    this.cache = new Cache(cacheService);
  }

  // Priority and status are always single values — no array handling needed.
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
        `Skipped ${inputField} '${name}' — not available in the current project.`,
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

    await this.preload(projectKey, projectId);
    return this.cache.matchValue(projectKey, resolverKey, name);
  }

  async preload(
    projectKey: string,
    projectId: number,
  ): Promise<Record<string, FieldValues>> {
    const response = await this.apiClient.get(
      ENDPOINTS.COMMON_ATTRIBUTES(projectId),
    );
    const attributes = response as Record<string, FieldValues>;
    for (const [key, values] of Object.entries(attributes)) {
      this.cache.set(projectKey, key, values);
    }
    return attributes;
  }

  clearCache(projectKey?: string): void {
    this.cache.clear(projectKey);
  }
}
