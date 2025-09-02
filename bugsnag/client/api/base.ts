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

export class BaseAPI {
  protected configuration: Configuration;

  constructor(configuration: Configuration) {
    this.configuration = configuration;
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
    let nextUrl: string | undefined = url;
    let apiResponse: ApiResponse<T>
    do {
      const response: Response = await fetch(nextUrl!, fetchOptions);
      if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Request failed with status ${response.status}: ${errorText}`);
      }

      apiResponse = {
        status: response.status,
        headers: response.headers
      }

      const data: T = await response.json();
      if (paginate) {
        results = results.concat(data);
        const link: string | null = response.headers.get('Link');
        if (link) {
          const match: RegExpMatchArray | null = link.match(/<([^>]+)>;\s*rel="next"/);
          nextUrl = match ? match[1] : undefined;
        } else {
          nextUrl = undefined;
        }
      } else {
        apiResponse.body = data;
      }
    } while (paginate && nextUrl);
    
    if (paginate) {
      apiResponse.body = results as T;
    }

    return apiResponse;
  }
}
