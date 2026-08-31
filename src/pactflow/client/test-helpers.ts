import { vi } from "vitest";
import type { HttpClient } from "./http-client";

export function createMockHttpClient(baseUrl = "https://test.example.com") {
  const mock = {
    baseUrl,
    fetch: vi.fn().mockResolvedValue({}),
    fetchRaw: vi.fn().mockResolvedValue(new Response()),
  };
  return mock as typeof mock & HttpClient;
}
