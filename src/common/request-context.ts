import { AsyncLocalStorage } from "node:async_hooks";
import type { IncomingMessage } from "node:http";

// Storage for pre-request data that can be retrieved from a tool to prevent caching as part of the server instance in a session.
// For example, the auth token.
export interface RequestContext {
  headers: Record<string, string | string[] | undefined>;
}

// Create the storage instance
export const requestContextStorage = new AsyncLocalStorage<RequestContext>();

/**
 * Run a callback within the request context, extracting headers from the request.
 * This ensures request headers are available via AsyncLocalStorage to downstream code.
 */
export function withRequestContext<T>(req: IncomingMessage, fn: () => T): T {
  return requestContextStorage.run({ headers: req.headers }, fn);
}

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
