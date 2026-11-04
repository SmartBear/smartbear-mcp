/**
 * Minimal JWT claim reader for analytics identity. Signatures are NOT
 * verified: claims are read for attribution only, from a token the product
 * API authenticates anyway. Never use this for an authorization decision.
 */

import { getRequestHeader } from "./request-context";

export type JwtClaims = Record<string, unknown>;

/** Decode a compact JWT's payload; `undefined` for anything that is not one. */
export function decodeJwtClaims(
  token: string | undefined | null,
): JwtClaims | undefined {
  const segments = token?.trim().split(".") ?? [];
  if (segments.length !== 3 || !segments[1]) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(
      Buffer.from(segments[1], "base64url").toString("utf8"),
    );
    return isRecord(parsed) ? parsed : undefined;
  } catch {
    return undefined;
  }
}

/** The standard credential header, and the fallback for every product. */
const AUTHORIZATION_HEADER = "Authorization";

/**
 * Claims of the current request's bearer token, if it is a JWT.
 *
 * Products that carry their credential in a product-specific header rather
 * than `Authorization` declare it via `Client.analytics.tokenHeader`. That
 * header is tried first, with `Authorization` as the fallback, mirroring how
 * those clients resolve their own auth token. The first candidate that
 * decodes as a JWT wins, so an opaque token in one header never masks a JWT
 * in the other.
 */
export function requestBearerClaims(
  tokenHeader?: string,
): JwtClaims | undefined {
  for (const header of candidateHeaders(tokenHeader)) {
    const claims = decodeJwtClaims(readRequestToken(header));
    if (claims) {
      return claims;
    }
  }
  return undefined;
}

/** The declared header then `Authorization`, without reading either twice. */
function candidateHeaders(tokenHeader?: string): string[] {
  const declared = tokenHeader?.trim();
  if (
    !declared ||
    declared.toLowerCase() === AUTHORIZATION_HEADER.toLowerCase()
  ) {
    return [AUTHORIZATION_HEADER];
  }
  return [declared, AUTHORIZATION_HEADER];
}

/** One header's value, with a `Bearer` prefix stripped when present. */
function readRequestToken(name: string): string | undefined {
  const header = getRequestHeader(name);
  const value = Array.isArray(header) ? header[0] : header;
  return value?.replace(/^Bearer\s+/i, "");
}

/**
 * Read a claim by dot-separated path, e.g. `context.user.accountId`. The
 * final segment also matches Auth0-style namespaced keys (`https://x/email`).
 * Strings and finite numbers come back as trimmed strings; anything else is
 * `undefined`.
 */
export function getClaim(
  claims: JwtClaims | undefined,
  path: string,
): string | undefined {
  const segments = path.split(".");
  const leaf = segments.pop() as string;
  let node: unknown = claims;
  for (const segment of segments) {
    node = isRecord(node) ? node[segment] : undefined;
  }
  if (!isRecord(node)) {
    return undefined;
  }
  const direct = asClaimString(node[leaf]);
  if (direct) {
    return direct;
  }
  const namespaced = Object.entries(node).find(([key]) =>
    key.endsWith(`/${leaf}`),
  );
  return asClaimString(namespaced?.[1]);
}

/** First non-empty claim among `paths`, in order. */
export function firstClaim(
  claims: JwtClaims | undefined,
  paths: string[] | undefined,
): string | undefined {
  for (const path of paths ?? []) {
    const value = getClaim(claims, path);
    if (value) {
      return value;
    }
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asClaimString(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}
