import { ToolError } from "../../../common/tools";
import type { Configuration } from "./configuration";

export interface ApiResponse<T> {
  status: number;
  headers: Headers;
  body: T;
  nextUrl?: string | null;
  totalCount?: number | null;
}

// Utility to pick only allowed fields from an object
export function pickFields<T>(obj: any, keys: (keyof T)[]): T {
  const result = {} as T;
  if (!obj) return result;
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }
  return result;
}

// Utility to pick only allowed fields from an array of objects
export function pickFieldsFromArray<T>(arr: any[], keys: (keyof T)[]): T[] {
  return arr.map((obj) => pickFields<T>(obj, keys));
}

// Utility to extract next URL path from Link header
export function getNextUrlPathFromHeader(
  headers: Headers,
  basePath: string,
): string | null {
  if (!headers) return null;
  const link = headers.get("link") || headers.get("Link");
  if (!link) return null;
  const match = link.match(/<([^>]+)>;\s*rel="next"/)?.[1];
  if (!match) return null;
  return match.replace(basePath, "");
}

// Utility to extract total count from headers
function getTotalCountFromHeader(headers: Headers): number | null {
  if (!headers) return null;
  const totalCount = headers.get("X-Total-Count");
  if (!totalCount) return null;
  const parsed = parseInt(totalCount, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

// Ensure URL is absolute
// The MCP tools exposed use only the path for pagination
// For making requests, we need to ensure the URL is absolute
export function ensureFullUrl(url: string, basePath: string) {
  return url.startsWith("http") ? url : `${basePath}${url}`;
}

// Build the URL for a (possibly paginated) request.
//
// `nextUrl` is tool input: a caller can pass any absolute URL, and
// `new URL(nextUrl, basePath)` ignores `basePath` whenever `nextUrl` is
// already absolute. Without this check a caller could redirect the server's
// outbound request to an arbitrary host (SSRF), including internal/cloud
// metadata addresses.
//
// Only `nextUrl`'s path and query are ever used; the origin always comes
// from the configured `basePath`. This makes the result immune to SSRF
// regardless of what host `nextUrl` names, while still following the API's
// own pagination links normally — including when the API sits behind a
// reverse proxy/CDN whose externally-visible host differs from `basePath`,
// which would otherwise make a same-origin check reject legitimate links.
export function buildPaginatedUrl(
  nextUrl: string | undefined,
  fallbackUrl: string,
  basePath: string,
): URL {
  if (!nextUrl) {
    return new URL(fallbackUrl, basePath);
  }
  const parsed = new URL(nextUrl, basePath);
  const safeUrl = new URL(basePath);
  safeUrl.pathname = parsed.pathname;
  safeUrl.search = parsed.search;
  return safeUrl;
}

// Merge nextUrl query parameters with options query parameters (usually filters)
export function getQueryParams(
  nextUrl?: string | null,
  options?: Record<string, any>,
): Record<string, any> {
  const nextOptions = { query: {} as Record<string, any> };
  if (nextUrl) {
    nextOptions.query = {};
    if (!nextUrl.includes("?")) {
      throw new Error("nextUrl must contains query parameters");
    }
    new URLSearchParams(nextUrl.split("?")[1]).forEach((value, key) => {
      nextOptions.query[key] = value;
    });
  }
  if (options) {
    nextOptions.query = { ...nextOptions.query, ...options.query };
  }
  return nextOptions;
}

// Redirects are followed manually so that every hop can be validated. With
// fetch()'s default `redirect: "follow"`, an endpoint that passes the
// caller-supplied endpoint check could simply 3xx to a loopback or cloud
// metadata address, which would then be fetched (with credentials) without
// ever being inspected.
const MAX_REDIRECTS = 5;
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const CREDENTIAL_HEADERS = new Set(["authorization", "cookie"]);

export async function fetchWithValidatedRedirects(
  url: string,
  init: RequestInit & { headers?: Record<string, string> },
  validateRequestUrl?: (url: URL) => void,
): Promise<Response> {
  let currentUrl = new URL(url);
  let currentInit: RequestInit & { headers?: Record<string, string> } = {
    ...init,
    redirect: "manual",
  };

  for (let hop = 0; ; hop++) {
    const response = await fetch(currentUrl.toString(), currentInit);
    if (!REDIRECT_STATUSES.has(response.status)) {
      return response;
    }

    const location = response.headers?.get("location");
    if (!location) {
      return response;
    }
    if (hop >= MAX_REDIRECTS) {
      throw new ToolError(
        `Too many redirects (more than ${MAX_REDIRECTS}) requesting ${url}`,
      );
    }

    const nextUrl = new URL(location, currentUrl);
    if (nextUrl.protocol !== "https:" && nextUrl.protocol !== "http:") {
      throw new ToolError(
        `Refusing to follow redirect to unsupported protocol ${nextUrl.protocol}`,
      );
    }
    validateRequestUrl?.(nextUrl);

    let headers = currentInit.headers;
    // Never forward credentials to a different origin.
    if (headers && nextUrl.origin !== currentUrl.origin) {
      headers = Object.fromEntries(
        Object.entries(headers).filter(
          ([name]) => !CREDENTIAL_HEADERS.has(name.toLowerCase()),
        ),
      );
    }

    // Match fetch's method rewriting: 303 always becomes GET, and 301/302
    // turn a POST into a GET; 307/308 preserve method and body.
    const method = (currentInit.method ?? "GET").toUpperCase();
    const toGet =
      response.status === 303 ||
      ((response.status === 301 || response.status === 302) &&
        method === "POST");
    currentInit = toGet
      ? { ...currentInit, headers, method: "GET", body: undefined }
      : { ...currentInit, headers };
    currentUrl = nextUrl;
  }
}

export class BaseAPI {
  protected configuration: Configuration;
  protected filterFields: string[];

  constructor(configuration: Configuration, filterFields?: string[]) {
    this.configuration = configuration;
    this.filterFields = filterFields || [];
  }

  async requestObject<T extends Record<string, any>>(
    url: string,
    options: Record<string, any> = {},
    fields?: (keyof T)[],
  ): Promise<ApiResponse<T>> {
    if (!this.configuration.basePath) {
      throw new Error("Base path is not configured for API requests");
    }
    if (this.configuration.headers) {
      options.headers = {
        ...this.configuration.headers,
        ...options.headers,
      };
    }
    const response: Response = await fetchWithValidatedRedirects(
      ensureFullUrl(url, this.configuration.basePath),
      {
        ...options,
        headers: {
          ...options.headers,
          ...this.configuration.headers,
        },
      },
      this.configuration.validateRequestUrl,
    );
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `Request failed with status ${response.status}: ${errorText}`,
      );
    }

    const apiResponse = {
      status: response.status,
      headers: response.headers,
      body: await response.json(),
    };

    if (fields) {
      apiResponse.body = pickFields<T>(apiResponse.body, fields);
    }

    if (this.filterFields) {
      this.sanitizeResponse(apiResponse.body);
    }

    return apiResponse;
  }

  /**
   * Fetches an array of resources from the API with support for pagination and field filtering.
   *
   * @template T - The type of objects in the response array, must extend Record<string, any>
   * @param url - The API endpoint URL to fetch data from
   * @param options - Optional request configuration including headers and other fetch options
   * @param fetchAll - Whether to automatically fetch all pages of paginated results (default: false)
   * @param fields - Optional array of field names to include in the response objects
   * @returns A Promise resolving to an ApiResponse containing an array of type T
   *
   * @throws {ToolError} When the HTTP request fails with a non-ok status
   * @throws {Error} When the response data is not an array
   *
   * @example
   * ```typescript
   * const response = await client.requestArray<User>('/users', {}, true, ['id', 'name']);
   * console.log(response.body); // Array of User objects with only id and name fields
   * ```
   */
  async requestArray<T extends Record<string, any>>(
    url: string,
    options: Record<string, any> = {},
    fetchAll: boolean = true,
    fields?: (keyof T)[],
  ): Promise<ApiResponse<T[]>> {
    let results: T[] = [];
    let nextUrl: string | null = url;
    let apiResponse: ApiResponse<T[]>;
    do {
      // Follow-up pages come from the server's `Link` header. Pin them to the
      // configured origin (path + query only) so a Link pointing at another
      // host can't make us send the auth token there — the same rule the API
      // classes already apply to caller-supplied `nextUrl` values.
      const requestUrl = buildPaginatedUrl(
        nextUrl,
        nextUrl,
        this.configuration.basePath,
      ).toString();
      const response: Response = await fetchWithValidatedRedirects(
        requestUrl,
        {
          ...options,
          headers: {
            ...options.headers,
            ...this.configuration.headers,
          },
        },
        this.configuration.validateRequestUrl,
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new ToolError(
          `Request failed with status ${response.status}: ${errorText}`,
        );
      }

      const data: T = await response.json();
      nextUrl = getNextUrlPathFromHeader(
        response.headers,
        this.configuration.basePath,
      );
      if (!Array.isArray(data)) {
        throw new Error("Expected response to be an array");
      }
      results = results.concat(data);

      apiResponse = {
        status: response.status,
        headers: response.headers,
        nextUrl: nextUrl,
        totalCount: getTotalCountFromHeader(response.headers),
        body: results,
      };
    } while (fetchAll && nextUrl);

    if (fields) {
      apiResponse.body = pickFieldsFromArray<T>(apiResponse.body, fields);
    }

    if (this.filterFields) {
      apiResponse.body.forEach((item) => {
        this.sanitizeResponse(item);
      });
    }

    return apiResponse;
  }

  private sanitizeResponse<T extends Record<string, any>>(data: T): void {
    if (!data) return;
    for (const key of this.filterFields) {
      if (key in data) {
        delete data[key];
      }
    }
  }
}
