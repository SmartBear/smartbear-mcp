import { ENDPOINTS } from "../../config/constants";
import {
  type ProjectContext,
  ResolverKeys,
} from "../../config/field-resolution.types";
import type { ApiClient } from "../../http/api-client";
import { Resolver } from "./resolver";

export interface ResolvedTestCycle {
  uid: string;
}

/**
 * TestCycleUidResolver — batch-resolves human-readable test case keys to internal UIDs.
 *
 * Key format: '{PROJECT_KEY}-TR-{number}', e.g. 'SCRUM-TR-145'
 * No caching — each call hits the API directly for up-to-date UIDs and versions.
 */

export class TestCycleUidResolver extends Resolver {
  override readonly fieldKeys: readonly string[] = [
    ResolverKeys.SearchableField.TEST_CYCLE_KEY_TO_UID,
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
    // TestCycleUidResolver uses resolveAndReturn — this method is intentionally a no-op
  }

  async resolveAndReturn(
    projectId: number,
    keys: string[],
  ): Promise<Record<string, ResolvedTestCycle>> {
    if (keys.length === 0) return {};

    const response = await this.apiClient.get(
      ENDPOINTS.RESOLVE_TEST_CYCLE_IDS(projectId),
      { keys: keys.join(",") },
    );

    return response as Record<string, ResolvedTestCycle>;
  }

  clearCache(_projectKey?: string): void {
    // No cache — nothing to clear
  }
}
