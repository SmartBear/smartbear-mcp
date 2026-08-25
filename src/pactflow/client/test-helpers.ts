import { vi } from "vitest";
import type { HttpClient } from "./http-client";

export function createMockHttpClient(baseUrl = "https://test.example.com") {
  return {
    baseUrl,
    fetch: vi.fn().mockResolvedValue({}),
    fetchRaw: vi.fn().mockResolvedValue(new Response()),
  } as unknown as HttpClient;
}
