import { QMETRY_DEFAULTS } from "../config/constants.js";

/**
 * Shared utility functions for QMetry client modules
 */

/**
 * Resolves default values for baseUrl and project parameters
 * @param baseUrl - Optional base URL, defaults to QMETRY_DEFAULTS.BASE_URL
 * @param project - Optional project key, defaults to QMETRY_DEFAULTS.PROJECT_KEY
 * @returns Object with resolved baseUrl and project values
 */
export function resolveDefaults(baseUrl?: string, project?: string) {
  return {
    resolvedBaseUrl: baseUrl || QMETRY_DEFAULTS.BASE_URL,
    resolvedProject: project || QMETRY_DEFAULTS.PROJECT_KEY,
  };
}
