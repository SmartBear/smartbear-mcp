import { AsyncLocalStorage } from "node:async_hooks";

// Define the shape of our request context
export interface RequestContext {
  headers: Record<string, string | string[] | undefined>;
}

// Create the storage instance
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

// Helper to get the current context
export function getRequestContext(): RequestContext | undefined {
  return requestContextStorage.getStore();
}

/**
 * Helper to get a specific header from the current request
 * @param name Header name (case-insensitive)
 * @returns Header value or undefined if not found
 */
export function getRequestHeader(name: string): string | string[] | undefined {
  const context = getRequestContext();
  if (!context?.headers) return undefined;

  // Headers are typically case-insensitive, but node http headers are lowercased
  // We'll try exact match first, then lowercase match
  const headerValue =
    context.headers[name] || context.headers[name.toLowerCase()];
  return headerValue;
}
