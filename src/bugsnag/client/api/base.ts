import { Configuration } from '../configuration.js';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

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
  return arr.map(obj => pickFields<T>(obj, keys));
}

// Utility to extract next URL path from Link header
export function getNextUrlPathFromHeader(headers: Headers, basePath: string) {
  if (!headers) return null;
  const link = headers.get("link") || headers.get("Link");
  if (!link) return null;
  const match = link.match(/<([^>]+)>;\s*rel="next"/)?.[1];
  if (!match) return null;
  return match.replace(basePath, "");
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
    paginate: boolean = false
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      ...this.configuration.headers,
      ...options.headers,
    };

    headers['Authorization'] = `token ${this.configuration.authToken}`;

    const fetchOptions: RequestInit = {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    };
    const url = options.url.startsWith('http') ? options.url : `${this.configuration.basePath || ''}${options.url}`;
    let results: T[] = [];
    let nextUrl: string | null = url;
    let apiResponse: ApiResponse<T>
    do {
      // TODO: Make this smarter
      nextUrl = nextUrl.startsWith('http') ? nextUrl : `${this.configuration.basePath || ''}${nextUrl}`;
      const response: Response = await fetch(nextUrl!, fetchOptions);
      if (!response.ok && response.status !== 429) { // 429 is handled separately
          const errorText = await response.text();
          throw new Error(`Request failed with status ${response.status}: ${errorText}`);
      }

      apiResponse = {
        status: response.status,
        headers: response.headers
      }
      
      // Just to make sure the server handles rate limiting properly
      if (response.status === 429) { 
        const retryAfter = response.headers.get('Retry-After')!; // According to spec, this header is present
        const waitTime = Number(retryAfter) * 1000;
        await new Promise(r => setTimeout(r, waitTime));
        continue; // Retry the request
      }

      const data: T = await response.json();
      if (paginate) {
        results = results.concat(data);
        nextUrl = getNextUrlPathFromHeader(response.headers, this.configuration.basePath!);
      } else {
        apiResponse.body = data;
      }
    } while (paginate && nextUrl);

    if (paginate) {
      apiResponse.body = results as T;
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
