import { ToolError } from "../../common/tools";

// Length constraints enforced by the Portal API. Reused across portal and
// product helpers so the limits live in a single place.
export const SUBDOMAIN_MIN_LENGTH = 3;
export const SUBDOMAIN_MAX_LENGTH = 20;
export const PORTAL_NAME_MIN_LENGTH = 3;
export const PORTAL_NAME_MAX_LENGTH = 40;

export type Rng = () => number;

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
 * Sanitize a free-form string into a subdomain-safe slug.
 * Matches ^[a-z0-9]+(-[a-z0-9]+)*$ within the 3-20 length limits.
 */
export function convertToValidSubdomain(
  value = "",
  rng: Rng = Math.random,
): string {
  let converted = value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "")
    .split("-")
    .filter(Boolean)
    .join("-");
  while (converted.length < SUBDOMAIN_MIN_LENGTH) {
    converted = `${converted}${Math.floor(rng() * 10)}`;
  }
  if (converted.length > SUBDOMAIN_MAX_LENGTH) {
    converted = converted.slice(0, SUBDOMAIN_MAX_LENGTH);
    if (converted.endsWith("-")) {
      converted = converted.slice(0, -1);
    }
  }
  return converted;
}

/**
 * Append a random "-<suffix>" to a subdomain base while staying within the
 * maximum length. Each call yields a fresh candidate, used to retry portal
 * creation after a subdomain conflict. The suffix is padded to a full 3
 * characters and no hyphen is left at the cut point; the base must already be
 * a sanitized slug (see convertToValidSubdomain) for the result to be valid.
 */
export function appendRandomSuffix(
  base: string,
  rng: Rng = Math.random,
): string {
  const randomChars = `-${rng().toString(36).substring(2, 5).padEnd(3, "0")}`;
  const baseSlug = base
    .slice(0, SUBDOMAIN_MAX_LENGTH - randomChars.length)
    .replace(/-+$/, "");
  return `${baseSlug}${randomChars}`;
}

/**
 * Build a portal subdomain candidate from the organization name: a sanitized
 * slug followed by a random suffix, appended even without a collision.
 */
export function buildSubdomainCandidate(
  organizationName?: string,
  rng: Rng = Math.random,
): string {
  return appendRandomSuffix(
    convertToValidSubdomain(organizationName, rng),
    rng,
  );
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

/**
 * Whether a 409 conflict reports that a portal is already mapped to the
 * organization (as opposed to a subdomain-taken conflict). The Portal API
 * returns a message such as "A portal already exists for this SwaggerHub
 * organization ID". This distinguishes the org-level conflict, which retrying
 * with a different subdomain cannot resolve.
 */
export function isOrganizationPortalConflict(error: unknown): boolean {
  if (!(error instanceof ToolError)) {
    return false;
  }
  const message = error.message.toLowerCase();
  return message.includes("already exists") && message.includes("organization");
}
