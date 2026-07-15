import { QMETRY_DEFAULTS } from "../config/constants.ts";

/**
 * Shared utility functions for QMetry client modules
 */

const HTML_TAG_PATTERN = /<[^>]+>/;
const HTML_ENTITY_PATTERN = /&(nbsp|amp|lt|gt|quot);/g;

const HTML_ENTITY_REPLACEMENTS: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
};

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

/**
 * Strips HTML tags from rich text (LARGETEXT) field values and decodes common
 * HTML entities. Values without any HTML tags are returned unchanged.
 */
export function stripHtml(value: string): string {
  if (!HTML_TAG_PATTERN.test(value)) {
    return value;
  }
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(
      HTML_ENTITY_PATTERN,
      (match, entity: string) => HTML_ENTITY_REPLACEMENTS[entity] ?? match,
    )
    .replace(/\s+/g, " ")
    .trim();
}
