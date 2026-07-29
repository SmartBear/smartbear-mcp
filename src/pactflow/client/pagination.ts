import { createHmac, randomBytes } from "node:crypto";
import type { CacheService } from "../../common/cache";

/** TTL for tool-layer pagination cache entries, distinct from CacheService's global default. */
export const PAGINATION_CACHE_TTL_SECONDS = 30;

/**
 * Process-local secret used to key the cache-key HMAC below. Generated once
 * per process and never derived from (or persisted alongside) caller
 * credentials — this keeps `buildCacheKey` from ever running a bare hash
 * over an auth token, while still deriving a stable, collision-safe key for
 * the lifetime of this process.
 */
const CACHE_KEY_SECRET = randomBytes(32);

export interface PaginationMeta {
  pageNumber: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record).sort();
  const entries = keys.map(
    (key) => `${JSON.stringify(key)}:${stableStringify(record[key])}`,
  );
  return `{${entries.join(",")}}`;
}

/**
 * Builds a stable cache key from the handler name, the tool call's
 * non-pagination params, the target base URL, and the effective auth
 * token — so cached pages never leak across different tools, queries,
 * servers, or credentials.
 */
export function buildCacheKey(
  handlerName: string,
  keyParams: Record<string, unknown>,
  baseUrl: string,
  authToken: string | undefined,
): string {
  const raw = `${handlerName}|${stableStringify(keyParams)}|${baseUrl}|${authToken ?? ""}`;
  return createHmac("sha256", CACHE_KEY_SECRET).update(raw).digest("hex");
}

function buildMeta(
  totalItems: number,
  pageNumber: number,
  pageSize: number,
): PaginationMeta {
  return {
    pageNumber,
    pageSize,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
  };
}

function slice<T>(items: T[], pageNumber: number, pageSize: number): T[] {
  const start = (pageNumber - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

function findArrayContainer(obj: any): { container: any; key: string } | null {
  if (!obj || typeof obj !== "object") return null;

  const embedded = obj._embedded;
  if (embedded && typeof embedded === "object" && !Array.isArray(embedded)) {
    for (const [key, value] of Object.entries(embedded)) {
      if (Array.isArray(value)) {
        return { container: embedded, key };
      }
    }
  }

  for (const [key, value] of Object.entries(obj)) {
    if (key === "_links" || key === "_actions" || key === "_embedded") continue;
    if (Array.isArray(value)) {
      return { container: obj, key };
    }
  }

  return null;
}

/**
 * HAL-aware, auto-detecting paginator for a raw upstream response:
 *  - a top-level array is sliced directly;
 *  - an array nested under `_embedded.<name>` (PactFlow's usual shape) is
 *    sliced in place, leaving every sibling field untouched;
 *  - a bare top-level array property (e.g. `permissions`, `pacticipants`)
 *    is sliced the same way;
 *  - an object with no array anywhere (every BDCT response today) is
 *    passed through unchanged on page 1, and returns just pagination
 *    metadata for any page beyond that.
 * Never mutates `raw`.
 */
export function paginateRawResponse(
  raw: any,
  pageNumber: number,
  pageSize: number,
): any {
  if (Array.isArray(raw)) {
    return {
      items: slice(raw, pageNumber, pageSize),
      pagination: buildMeta(raw.length, pageNumber, pageSize),
    };
  }

  const found = findArrayContainer(raw);
  if (!found) {
    const totalItems = raw == null ? 0 : 1;
    if (pageNumber <= 1) {
      return { ...raw, pagination: buildMeta(totalItems, 1, pageSize) };
    }
    return { pagination: buildMeta(totalItems, pageNumber, pageSize) };
  }

  const { container, key } = found;
  const fullArray = container[key] as unknown[];
  const page = slice(fullArray, pageNumber, pageSize);
  const meta = buildMeta(fullArray.length, pageNumber, pageSize);

  if (container === raw) {
    return { ...raw, [key]: page, pagination: meta };
  }

  return {
    ...raw,
    _embedded: { ...raw._embedded, [key]: page },
    pagination: meta,
  };
}

/**
 * Wraps a raw (unpaginated) client method: strips pageNumber/pageSize out
 * of the tool args, fetches (and caches) the full upstream response keyed
 * on the handler name + remaining args + base URL + auth token, then
 * paginates the (possibly cached) result. A failed fetch is never cached.
 */
export async function withPagination(
  fn: (args: Record<string, any>) => Promise<any>,
  handlerName: string,
  args: Record<string, any> & { pageNumber?: number; pageSize?: number },
  context: {
    baseUrl: string;
    authToken: string | undefined;
    cache: CacheService;
  },
): Promise<any> {
  const { pageNumber = 1, pageSize = 5, ...rest } = args ?? {};
  const cacheKey = buildCacheKey(
    handlerName,
    rest,
    context.baseUrl,
    context.authToken,
  );

  let raw = context.cache.get<any>(cacheKey);
  if (raw === undefined) {
    raw = await fn(rest);
    context.cache.set(cacheKey, raw, PAGINATION_CACHE_TTL_SECONDS);
  }

  return paginateRawResponse(raw, pageNumber, pageSize);
}
