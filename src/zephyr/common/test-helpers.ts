import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import { vi } from "vitest";
import type { ZephyrClient } from "../client.ts";

/**
 * Shared test double for {@link ZephyrClient}'s API client, used across the Zephyr
 * tool test suites. Only `getApiClient` is mocked since that is the only member of
 * `ZephyrClient` these tools interact with.
 */
export interface MockApiClient {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
}

export interface MockZephyrClient {
  getApiClient: ReturnType<typeof vi.fn>;
}

/**
 * Creates a mock {@link ZephyrClient} whose `getApiClient()` returns a mock API
 * client with `get`/`post`/`put` spies. Cast to `ZephyrClient` at tool construction
 * sites via {@link asZephyrClient} since this is intentionally a partial test double.
 */
export function createMockZephyrClient(): MockZephyrClient {
  const apiClient: MockApiClient = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  };
  return {
    getApiClient: vi.fn().mockReturnValue(apiClient),
  };
}

/** Narrows a {@link MockZephyrClient} test double to the real `ZephyrClient` type it stands in for. */
export function asZephyrClient(client: MockZephyrClient): ZephyrClient {
  return client as unknown as ZephyrClient;
}

/** A `RequestHandlerExtra` stand-in for tests that don't exercise the extra param. */
export const fakeExtra = {} as unknown as RequestHandlerExtra<
  ServerRequest,
  ServerNotification
>;
