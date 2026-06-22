import { ENDPOINTS } from "../../config/constants";
import {
  type ProjectContext,
  ResolverKeys,
} from "../../config/field-resolution.types";
import type { ApiClient } from "../../http/api-client";
import { Resolver } from "./resolver.ts";

/**
 * DefectIdResolver — batch-resolves Jira defect issue keys to their numeric issueIds.
 *
 * Key format: '{PROJECT_KEY}-{number}', e.g. 'PROJ-456'
 * Backed by GET /projects/{projectId}/mcp/defects/resolve-ids?keys=PROJ-456,PROJ-789
 *
 * IMPORTANT: This resolver only knows about defects already tracked in QTM4J (bugs linked
 * to at least one execution before). Keys not yet tracked are silently OMITTED from the
 * response — for those, callers should fall back to the JQL approach in linkBugsToExecution.
 *
 * No caching — each call hits the API directly for up-to-date issueIds.
 */
export class DefectIdResolver extends Resolver {
  override readonly fieldKeys: readonly string[] = [
    ResolverKeys.SearchableField.DEFECT_KEY_TO_ID,
  ];
  private readonly apiClient: ApiClient;

  constructor(apiClient: ApiClient) {
    super();
    this.apiClient = apiClient;
  }

  async resolve(
    inputField: string,
    _resolverKey: string,
    body: Record<string, unknown>,
    context: ProjectContext,
    warnings: string[],
  ): Promise<void> {
    const value = body[inputField];
    if (value == null) return;

    const keys = (Array.isArray(value) ? value : [value]).map(String);
    if (keys.length === 0) return;

    const defectMap = await this.resolveAndReturn(context.projectId, keys);
    const resolvedIds = Object.values(defectMap);

    if (resolvedIds.length > 0) {
      body[inputField] = resolvedIds;
    } else {
      delete body[inputField];
    }

    const unresolvedKeys = keys.filter((k) => !(k in defectMap));
    for (const key of unresolvedKeys) {
      warnings.push(
        `Bug key '${key}' not found in QTM4J defect tracking — skipped.`,
      );
    }
  }

  async resolveAndReturn(
    projectId: number,
    keys: string[],
  ): Promise<Record<string, number>> {
    if (keys.length === 0) return {};

    const response = await this.apiClient
      .skipAnalytics()
      .get(ENDPOINTS.RESOLVE_DEFECT_IDS(projectId), { keys: keys.join(",") });

    return response as Record<string, number>;
  }

  clearCache(_projectKey?: string): void {
    // No cache — nothing to clear
  }
}
