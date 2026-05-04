/**
 * LabelResolver — Resolves label fields on demand.
 *
 * Fetches from the labels search API on first resolve, then caches results.
 */

import {
  type FieldValues,
  SearchableField,
} from "../config/field-resolution.types";
import type { ApiClient } from "../http/api-client";
import { FieldMetadataCache } from "./field-metadata-cache";
import { FieldMetadataFetcher } from "./field-metadata-fetcher";

export class LabelResolver {
  readonly fieldKeys: readonly string[] = [SearchableField.LABEL];

  protected readonly cache = new FieldMetadataCache();
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

    const values = await this.fetcher.fetchSearchableField(
      SearchableField.LABEL,
      projectId,
      name,
    );
    this.cache.set(projectKey, fieldKey, values);
    return this.cache.matchValue(projectKey, fieldKey, name);
  }

  async preload(
    _projectKey: string,
    _projectId: number,
  ): Promise<Record<string, FieldValues>> {
    return {};
  }

  clearCache(projectKey?: string): void {
    this.cache.clear(projectKey);
  }
}
