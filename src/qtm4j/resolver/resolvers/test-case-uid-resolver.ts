import { ENDPOINTS } from "../../config/constants.ts";
import {
  type ProjectContext,
  ResolverKeys,
} from "../../config/field-resolution.types.ts";
import type { ApiClient } from "../../http/api-client.ts";
import { Resolver } from "./resolver.ts";

export interface ResolvedTestCase {
  uid: string;
  latestVersion: number;
}

/**
 * TestCaseUidResolver — batch-resolves human-readable test case keys to internal UIDs.
 *
 * Key format: '{PROJECT_KEY}-TC-{number}', e.g. 'SCRUM-TC-145'
 * No caching — each call hits the API directly for up-to-date UIDs and versions.
 */

export class TestCaseUidResolver extends Resolver {
  override readonly fieldKeys: readonly string[] = [
    ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID,
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
    // TestCaseUidResolver uses resolveAndReturn — this method is intentionally a no-op
  }

  async resolveAndReturn(
    projectId: number,
    keys: string[],
  ): Promise<Record<string, ResolvedTestCase>> {
    if (keys.length === 0) return {};

    const response = await this.apiClient.get(
      ENDPOINTS.RESOLVE_TEST_CASE_IDS(projectId),
      { keys: keys.join(",") },
    );

    return response as Record<string, ResolvedTestCase>;
  }

  clearCache(_projectKey?: string): void {
    // No cache — nothing to clear
  }
}
