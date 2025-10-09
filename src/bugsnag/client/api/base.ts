import type { Configuration } from "../configuration.js";

export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS"
  | "HEAD";

export interface RequestOptions {
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: any;
}

export interface ApiResponse<T> {
  status: number;
  headers: Headers;
  body?: T;
  nextUrl?: string | null;
  totalCount?: number | null;
}

// Utility to pick only allowed fields from an object
export function pickFields<T>(obj: any, keys: (keyof T)[]): T {
  const result = {} as T;
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
export function getTotalCountFromHeader(headers: Headers): number | null {
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

export class BaseAPI {
  protected configuration: Configuration;
  protected filterFields: string[];

  constructor(configuration: Configuration, filterFields?: string[]) {
    this.configuration = configuration;
    this.filterFields = filterFields || [];
  }

  async request<T = any>(
    options: RequestOptions,
    fetchAll: boolean = true,
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      ...this.configuration.headers,
      ...options.headers,
    };

    headers.Authorization = `token ${this.configuration.authToken}`;

    const fetchOptions: RequestInit = {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    };
    let results: T[] = [];
    let nextUrl: string | null = options.url;
    let apiResponse: ApiResponse<T>;
    do {
      if (!this.configuration.basePath) {
        throw new Error("Base path is not configured for API requests");
      }
      nextUrl = ensureFullUrl(nextUrl, this.configuration.basePath);
      const response: Response = await fetch(nextUrl, fetchOptions);
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Request failed with status ${response.status}: ${errorText}`,
        );
      }

      apiResponse = {
        status: response.status,
        headers: response.headers,
      };

      const data: T = await response.json();
      nextUrl = getNextUrlPathFromHeader(
        response.headers,
        this.configuration.basePath,
      );
      if (Array.isArray(data)) {
        results = results.concat(data);
        apiResponse.nextUrl = nextUrl;
      } else {
        apiResponse.body = data;
      }
    } while (fetchAll && nextUrl);

    if (results.length > 0) {
      apiResponse.body = results as T;
      apiResponse.totalCount = getTotalCountFromHeader(apiResponse.headers);
    }

    if (Array.isArray(apiResponse.body)) {
      apiResponse.body.forEach(this.sanitizeResponse.bind(this));
    } else {
      this.sanitizeResponse(apiResponse.body ?? {});
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
