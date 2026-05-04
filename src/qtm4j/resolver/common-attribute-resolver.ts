/**
 * CommonAttributeResolver — Resolves priority and status fields.
 *
 * Pre-loads all common attributes (priority, testcase/plan/cycle status)
 * when set_project_context is called. On resolve: cache-first → re-fetch on miss.
 */

import {
  CommonAttributeField,
  type FieldValues,
} from "../config/field-resolution.types";
import type { ApiClient } from "../http/api-client";
import { FieldMetadataCache } from "./field-metadata-cache";
import { FieldMetadataFetcher } from "./field-metadata-fetcher";

export class CommonAttributeResolver {
  readonly fieldKeys: readonly string[] = Object.values(CommonAttributeField);

  readonly cache = new FieldMetadataCache();
  protected readonly fetcher: FieldMetadataFetcher;

  constructor(apiClient: ApiClient) {
    this.fetcher = new FieldMetadataFetcher(apiClient);
  }

  async resolve(
    projectKey: string,
    projectId: number,
    fieldKey: string,
    name: string,
  ): Promise<string | undefined> {
    const cached = this.cache.matchValue(projectKey, fieldKey, name);
    if (cached !== undefined) return cached;

    await this.preload(projectKey, projectId);
    return this.cache.matchValue(projectKey, fieldKey, name);
  }

  async preload(
    projectKey: string,
    projectId: number,
  ): Promise<Record<string, FieldValues>> {
    const attributes = await this.fetcher.fetchCommonAttributes(projectId);
    for (const [key, values] of Object.entries(attributes)) {
      this.cache.set(projectKey, key, values);
    }
    return attributes;
  }

  clearCache(projectKey?: string): void {
    this.cache.clear(projectKey);
  }
}
