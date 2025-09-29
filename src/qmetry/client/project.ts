import { qmetryRequest } from "./api/client-api.js";
import { QMETRY_PATHS } from "../config/rest-endpoints.js";
import { QMETRY_DEFAULTS } from "../config/constants.js";

/**
 * Retrieves project information from QMetry
 *
 * This function serves dual purpose:
 * 1. SET_PROJECT_INFO - Sets/switches the current project context
 * 2. FETCH_PROJECT_INFO - Retrieves project details and configuration
 *
 * Both operations use the same API endpoint as QMetry handles project context
 * switching and information retrieval through the same GET request.
 *
 * @param token - QMetry API authentication token
 * @param baseUrl - QMetry instance base URL (defaults to configured URL)
 * @param project - Project key to retrieve info for (defaults to configured project)
 * @returns Promise resolving to project information including viewIds, folders, and configuration
 */
export async function getProjectInfo(
  token: string,
  baseUrl: string,
  project?: string,
) {
  return qmetryRequest({
    method: "GET",
    path: QMETRY_PATHS.PROJECT.GET_INFO,
    token,
    baseUrl: baseUrl || QMETRY_DEFAULTS.BASE_URL,
    project: project || QMETRY_DEFAULTS.PROJECT_KEY,
  });
}
