import { ToolError } from "../../common/tools";

// Length constraints enforced by the Portal API. Reused across portal and
// product helpers so the limits live in a single place.
export const SUBDOMAIN_MIN_LENGTH = 3;
export const SUBDOMAIN_MAX_LENGTH = 20;
export const PORTAL_NAME_MIN_LENGTH = 3;
export const PORTAL_NAME_MAX_LENGTH = 40;

/**
 * Whether a string's length falls within an inclusive range. Generic helper
 * reused for the various entity length rules (subdomain 3-20, portal/product
 * name 3-40, page title/description, etc.).
 */
export function isLengthWithin(
  value: string,
  min: number,
  max: number,
): boolean {
  return value.length >= min && value.length <= max;
}

/**
 * Sanitize a free-form string into a subdomain-safe slug: lowercase,
 * alphanumeric segments separated by single hyphens, trimmed to maxLength
 * with no trailing hyphen. Matches ^[a-z0-9]+(-[a-z0-9]+)*$.
 */
export function slugify(value: string, maxLength: number): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/, "");
}

/**
 * Build a portal subdomain candidate from the organization name, falling back
 * to an identifier derived from the organization UUID when the name is missing
 * or sanitizes to fewer than the minimum number of characters.
 */
export function buildSubdomainCandidate(
  organizationId: string,
  organizationName?: string,
): string {
  const fallback = `portal-${organizationId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8)}`;

  if (!organizationName) {
    return fallback;
  }

  const sanitized = slugify(organizationName, SUBDOMAIN_MAX_LENGTH);

  return sanitized.length >= SUBDOMAIN_MIN_LENGTH ? sanitized : fallback;
}

/**
 * Build a subdomain candidate suffixed with part of the organization UUID,
 * used to retry portal creation after a subdomain conflict while staying
 * within the maximum length.
 */
export function buildSuffixedSubdomain(
  baseSubdomain: string,
  organizationId: string,
): string {
  const idSuffix = organizationId
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 4);

  const trimmedBase = baseSubdomain
    .slice(0, SUBDOMAIN_MAX_LENGTH - idSuffix.length - 1)
    .replace(/-+$/, "");

  return `${trimmedBase}-${idSuffix}`;
}

/**
 * Resolve a valid portal display name from an organization name, or undefined
 * when the name is absent or too short to satisfy the API constraints.
 */
export function buildPortalName(organizationName?: string): string | undefined {
  const trimmed = organizationName?.trim();
  if (!trimmed || trimmed.length < PORTAL_NAME_MIN_LENGTH) {
    return undefined;
  }
  return trimmed.slice(0, PORTAL_NAME_MAX_LENGTH);
}

/** Whether an error represents an HTTP 409 conflict response. */
export function isConflictError(error: unknown): boolean {
  return (
    error instanceof ToolError &&
    (error.metadata?.get("status") === 409 ||
      error.message.startsWith("HTTP 409"))
  );
}
