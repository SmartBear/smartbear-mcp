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
    const response: Response = await fetch(
      ensureFullUrl(url, this.configuration.basePath),
      {
        ...options,
        headers: {
          ...options.headers,
          ...this.configuration.headers,
        },
      },
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
      nextUrl = ensureFullUrl(nextUrl, this.configuration.basePath);
      const response: Response = await fetch(nextUrl, {
        ...options,
        headers: {
          ...options.headers,
          ...this.configuration.headers,
        },
      });
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
