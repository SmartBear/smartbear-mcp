import { QMETRY_DEFAULTS } from "../config/constants.js";
import { QMETRY_PATHS } from "../config/rest-endpoints.js";
import {
  DEFAULT_FETCH_BUILD_PAYLOAD,
  DEFAULT_FETCH_PLATFORMS_PAYLOAD,
  type FetchBuildsPayload,
  type FetchPlatformsPayload,
} from "../types/project.js";
import { qmetryRequest } from "./api/client-api.js";

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

export async function getReleasesCycles(
  token: string,
  baseUrl: string,
  project?: string,
  payload: { showArchive?: boolean } = {},
) {
  let showArchiveValue: boolean;

  if (payload.showArchive !== undefined) {
    showArchiveValue = payload.showArchive;
  } else {
    showArchiveValue = false;
  }

  const body: { showArchive: boolean } = {
    showArchive: showArchiveValue,
  };

  return qmetryRequest({
    method: "POST",
    path: QMETRY_PATHS.PROJECT.GET_RELEASES_CYCLES,
    token,
    baseUrl: baseUrl || QMETRY_DEFAULTS.BASE_URL,
    project: project || QMETRY_DEFAULTS.PROJECT_KEY,
    body,
  });
}

/**
 * Fetches a List of Builds of the current project.
 */
export async function getBuilds(
  token: string,
  baseUrl: string,
  project: string,
  payload: FetchBuildsPayload,
) {
  const body: FetchBuildsPayload = {
    ...DEFAULT_FETCH_BUILD_PAYLOAD,
    ...payload,
  };

  return qmetryRequest<unknown>({
    method: "POST",
    path: QMETRY_PATHS.PROJECT.GET_BUILD,
    token,
    baseUrl: baseUrl || QMETRY_DEFAULTS.BASE_URL,
    project: project || QMETRY_DEFAULTS.PROJECT_KEY,
    body,
  });
}

/**
 * Fetches platforms from the current QMetry project
 *
 */
export async function getPlatforms(
  token: string,
  baseUrl: string,
  project: string,
  payload: FetchPlatformsPayload,
) {
  const body: FetchPlatformsPayload = {
    ...DEFAULT_FETCH_PLATFORMS_PAYLOAD,
    ...payload,
  };

  return qmetryRequest({
    method: "POST",
    path: QMETRY_PATHS.PROJECT.GET_PLATFORMS,
    token,
    baseUrl: baseUrl || QMETRY_DEFAULTS.BASE_URL,
    project: project || QMETRY_DEFAULTS.PROJECT_KEY,
    body,
  });
}
