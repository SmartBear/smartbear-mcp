import { QMETRY_DEFAULTS } from "../config/constants";
import { QMETRY_PATHS } from "../config/rest-endpoints";
import { qmetryRequest } from "./api/client-api";

export interface AnalyticsQueryPayload {
  query: string;
  page?: number;
  filterValue?: any[];
}

/**
 * Executes a SQL query against QMetry Analytics API.
 *
 * Supports querying across QMetry entities (requirements, testcases, testexecutions,
 * testsuites, issues) and their relationship tables using standard SQL syntax.
 *
 * @param token - QMetry API authentication token
 * @param baseUrl - QMetry instance base URL
 * @param project - Project key
 * @param payload - Query payload containing the SQL query, page, and optional filter values
 * @returns Promise resolving to query result data (rows and metadata)
 */
export async function executeAnalyticsQuery(
  token: string,
  baseUrl: string,
  project: string | undefined,
  payload: AnalyticsQueryPayload,
) {
  const body = {
    query: payload.query,
    page: payload.page ?? 0,
    filterValue: payload.filterValue ?? [],
  };

  return qmetryRequest({
    method: "POST",
    path: QMETRY_PATHS.ANALYTICS.EXECUTE_QUERY,
    token,
    baseUrl: baseUrl || QMETRY_DEFAULTS.BASE_URL,
    project: project || QMETRY_DEFAULTS.PROJECT_KEY,
    body,
  });
}
