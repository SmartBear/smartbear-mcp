import { describe, expect, it, vi } from "vitest";
import { CacheService } from "../../common/cache";
import {
  buildCacheKey,
  paginateRawResponse,
  withPagination,
} from "./pagination";

describe("buildCacheKey", () => {
  it("produces the same key for the same inputs regardless of key order", () => {
    const a = buildCacheKey(
      "listWebhooks",
      { b: 2, a: 1 },
      "https://x.example",
      "tok",
    );
    const b = buildCacheKey(
      "listWebhooks",
      { a: 1, b: 2 },
      "https://x.example",
      "tok",
    );
    expect(a).toBe(b);
  });

  it("changes when the handler name changes", () => {
    const a = buildCacheKey(
      "listWebhooks",
      { a: 1 },
      "https://x.example",
      "tok",
    );
    const b = buildCacheKey(
      "listSecrets",
      { a: 1 },
      "https://x.example",
      "tok",
    );
    expect(a).not.toBe(b);
  });

  it("changes when the params change", () => {
    const a = buildCacheKey(
      "listWebhooks",
      { a: 1 },
      "https://x.example",
      "tok",
    );
    const b = buildCacheKey(
      "listWebhooks",
      { a: 2 },
      "https://x.example",
      "tok",
    );
    expect(a).not.toBe(b);
  });

  it("changes when the base URL changes", () => {
    const a = buildCacheKey(
      "listWebhooks",
      { a: 1 },
      "https://x.example",
      "tok",
    );
    const b = buildCacheKey(
      "listWebhooks",
      { a: 1 },
      "https://y.example",
      "tok",
    );
    expect(a).not.toBe(b);
  });

  it("changes when the auth token changes", () => {
    const a = buildCacheKey(
      "listWebhooks",
      { a: 1 },
      "https://x.example",
      "tok1",
    );
    const b = buildCacheKey(
      "listWebhooks",
      { a: 1 },
      "https://x.example",
      "tok2",
    );
    expect(a).not.toBe(b);
  });
});

describe("paginateRawResponse", () => {
  it("paginates a top-level array", () => {
    const raw = [1, 2, 3, 4, 5, 6, 7];
    const result = paginateRawResponse(raw, 2, 3);
    expect(result.items).toEqual([4, 5, 6]);
    expect(result.pagination).toEqual({
      pageNumber: 2,
      pageSize: 3,
      totalItems: 7,
      totalPages: 3,
    });
  });

  it("paginates an array nested under _embedded", () => {
    const raw = {
      _embedded: {
        webhooks: [{ id: "a" }, { id: "b" }, { id: "c" }],
      },
      _links: { self: "https://x" },
    };
    const result = paginateRawResponse(raw, 1, 2);
    expect(result._embedded.webhooks).toEqual([{ id: "a" }, { id: "b" }]);
    expect(result._links).toEqual({ self: "https://x" });
    expect(result.pagination).toEqual({
      pageNumber: 1,
      pageSize: 2,
      totalItems: 3,
      totalPages: 2,
    });
    // original object must not be mutated
    expect(raw._embedded.webhooks).toHaveLength(3);
  });

  it("paginates a bare top-level array property, ignoring _links", () => {
    const raw = {
      permissions: [{ scope: "a" }, { scope: "b" }, { scope: "c" }],
      _links: { self: "https://x" },
    };
    const result = paginateRawResponse(raw, 2, 2);
    expect(result.permissions).toEqual([{ scope: "c" }]);
    expect(result.pagination.totalItems).toBe(3);
  });

  it("passes a plain object with no array through unchanged on page 1", () => {
    const raw = {
      verificationStatus: "success",
      _embedded: { providerVersion: { number: "1.0.0" } },
    };
    const result = paginateRawResponse(raw, 1, 5);
    expect(result.verificationStatus).toBe("success");
    expect(result._embedded).toEqual({ providerVersion: { number: "1.0.0" } });
    expect(result.pagination).toEqual({
      pageNumber: 1,
      pageSize: 5,
      totalItems: 1,
      totalPages: 1,
    });
  });

  it("returns an empty page for a plain object with no array beyond page 1", () => {
    const raw = { verificationStatus: "success" };
    const result = paginateRawResponse(raw, 2, 5);
    expect(result.verificationStatus).toBeUndefined();
    expect(result.pagination).toEqual({
      pageNumber: 2,
      pageSize: 5,
      totalItems: 1,
      totalPages: 1,
    });
  });

  it("returns an empty slice when pageNumber is beyond the available data", () => {
    const result = paginateRawResponse([1, 2, 3], 5, 2);
    expect(result.items).toEqual([]);
    expect(result.pagination.totalPages).toBe(2);
  });

  it("returns everything on page 1 when pageSize exceeds the dataset", () => {
    const result = paginateRawResponse([1, 2, 3], 1, 100);
    expect(result.items).toEqual([1, 2, 3]);
    expect(result.pagination.totalPages).toBe(1);
  });
});

describe("withPagination", () => {
  const context = (
    overrides: Partial<{ baseUrl: string; authToken: string }> = {},
  ) => ({
    baseUrl: "https://example.com",
    authToken: "tok",
    cache: new CacheService(),
    ...overrides,
  });

  it("calls the fetcher once across two calls for different pages of the same query", async () => {
    const fn = vi.fn().mockResolvedValue({
      _embedded: { webhooks: [{ id: "a" }, { id: "b" }] },
    });
    const ctx = context();

    const page1 = await withPagination(
      fn,
      "listWebhooks",
      { pageNumber: 1, pageSize: 1 },
      ctx,
    );
    const page2 = await withPagination(
      fn,
      "listWebhooks",
      { pageNumber: 2, pageSize: 1 },
      ctx,
    );

    expect(fn).toHaveBeenCalledTimes(1);
    expect(page1._embedded.webhooks).toEqual([{ id: "a" }]);
    expect(page2._embedded.webhooks).toEqual([{ id: "b" }]);
  });

  it("refetches when the base URL differs", async () => {
    const fn = vi.fn().mockResolvedValue({ _embedded: { webhooks: [] } });
    const cache = new CacheService();

    await withPagination(fn, "listWebhooks", {}, context({ cache } as any));
    await withPagination(
      fn,
      "listWebhooks",
      {},
      context({ baseUrl: "https://other.example", cache } as any),
    );

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("refetches when the auth token differs", async () => {
    const fn = vi.fn().mockResolvedValue({ _embedded: { webhooks: [] } });
    const cache = new CacheService();

    await withPagination(fn, "listWebhooks", {}, context({ cache } as any));
    await withPagination(
      fn,
      "listWebhooks",
      {},
      context({ authToken: "other-tok", cache } as any),
    );

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("does not cache a failed fetch", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(new Error("boom"))
      .mockResolvedValueOnce({ _embedded: { webhooks: [] } });
    const ctx = context();

    await expect(withPagination(fn, "listWebhooks", {}, ctx)).rejects.toThrow(
      "boom",
    );
    await withPagination(fn, "listWebhooks", {}, ctx);

    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("passes only the non-pagination args through to the fetcher", async () => {
    const fn = vi.fn().mockResolvedValue({ _embedded: { webhooks: [] } });
    const ctx = context();

    await withPagination(
      fn,
      "listWebhooks",
      { pageNumber: 3, pageSize: 2, providerName: "foo" },
      ctx,
    );

    expect(fn).toHaveBeenCalledWith({ providerName: "foo" });
  });
});
