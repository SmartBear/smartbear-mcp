import { ENDPOINTS } from "../../config/constants";
import {
  type ProjectContext,
  ResolverKeys,
} from "../../config/field-resolution.types";
import type { ApiClient } from "../../http/api-client";
import { Resolver } from "./resolver";

export interface ResolvedRequirement {
  id: string;
}

/**
 * RequirementIdResolver — batch-resolves human-readable requirement keys to internal Jira issue IDs. *
 * Key format: '{PROJECT_KEY}-{number}', e.g. 'SCRUM-145'
 * No caching — each call hits the API directly for up-to-date IDs.
 */

export class RequirementIdResolver extends Resolver {
  override readonly fieldKeys: readonly string[] = [
    ResolverKeys.SearchableField.REQUIREMENT_KEY_TO_ID,
  ];

  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    super();
    this.apiClient = apiClient;
  }

  async resolve(
    _inputField: string,
    _resolverKey: string,
    _body: Record<string, unknown>,
    _context: ProjectContext,
    _warnings: string[],
  ): Promise<void> {
    // RequirementIdResolver uses resolveAndReturn — this method is intentionally a no-op
  }

  async resolveAndReturn(
    projectId: number,
    keys: string[],
  ): Promise<Record<string, ResolvedRequirement>> {
    if (keys.length === 0) return {};

    const response = await this.apiClient
      .skipAnalytics()
      .get(ENDPOINTS.RESOLVE_REQUIREMENT_IDS(projectId), {
        keys: keys.join(","),
      });

    return response as Record<string, ResolvedRequirement>;
  }

  clearCache(_projectKey?: string): void {
    // No cache — nothing to clear
  }
}
