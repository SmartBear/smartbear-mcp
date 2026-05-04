/**
 * FieldMetadataFetcher — Extensible REST API Fetcher for Field Metadata
 *
 * Provides a full default implementation backed by the QTM4J REST API.
 * Extend this class to override fetching behaviour (e.g. mock, custom endpoints).
 *
 * To add a new searchable field, add one entry to SEARCHABLE_FIELD_ENDPOINTS.
 */

import { ENDPOINTS } from "../config/constants";
import {
  type FieldValues,
  SearchableField,
} from "../config/field-resolution.types";
import type { ApiClient } from "../http/api-client";

const SEARCHABLE_FIELD_ENDPOINTS: Record<
  SearchableField,
  (projectId: number) => string
> = {
  [SearchableField.LABEL]: ENDPOINTS.LABELS,
  [SearchableField.COMPONENTS]: ENDPOINTS.COMPONENTS,
} as const;

export class FieldMetadataFetcher {
  constructor(protected readonly apiClient: ApiClient) {}

  async fetchCommonAttributes(
    projectId: number,
  ): Promise<Record<string, FieldValues>> {
    const response = await this.apiClient.get(
      ENDPOINTS.COMMON_ATTRIBUTES(projectId),
    );
    return response as Record<string, FieldValues>;
  }

  async fetchSearchableField(
    fieldKey: SearchableField,
    projectId: number,
    search: string,
  ): Promise<FieldValues> {
    const response = await this.apiClient.get(
      SEARCHABLE_FIELD_ENDPOINTS[fieldKey](projectId),
      { search },
    );
    return response as FieldValues;
  }
}
