import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import createFetchMock from "vitest-fetch-mock";
import { ToolError } from "../../common/tools";
import { HttpClient } from "./http-client";

const fetchMock = createFetchMock(vi);

describe("HttpClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.enableMocks();
    fetchMock.resetMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    fetchMock.disableMocks();
  });

  describe("fetch<T>", () => {
    it("sends Bearer token Authorization header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ ok: true }));

      const client = new HttpClient("https://example.com", () => ({
        Authorization: "Bearer my-token",
        "Content-Type": "application/json",
      }));

      await client.fetch("https://example.com/api");

      const request = fetchMock.requests()[0];
      expect(request.headers.get("Authorization")).toBe("Bearer my-token");
    });

    it("sends Basic auth Authorization header", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ ok: true }));

      const encoded = Buffer.from("user:pass").toString("base64");
      const client = new HttpClient("https://example.com", () => ({
        Authorization: `Basic ${encoded}`,
        "Content-Type": "application/json",
      }));

      await client.fetch("https://example.com/api");

      const request = fetchMock.requests()[0];
      expect(request.headers.get("Authorization")).toBe(`Basic ${encoded}`);
    });

    it("sends no Authorization header when getHeaders returns undefined", async () => {
      fetchMock.mockResponseOnce(JSON.stringify({ ok: true }));

      const client = new HttpClient(
        "https://example.com",
        () => undefined,
      );

      await client.fetch("https://example.com/api");

      const request = fetchMock.requests()[0];
      expect(request.headers.get("Authorization")).toBeNull();
    });

    it("returns parsed JSON for a 200 response", async () => {
      const data = { id: 1, name: "foo" };
      fetchMock.mockResponseOnce(JSON.stringify(data), { status: 200 });

      const client = new HttpClient("https://example.com", () => undefined);
      const result = await client.fetch<typeof data>("https://example.com/api");

      expect(result).toEqual(data);
    });

    it("returns undefined for a 204 response", async () => {
      // 204 is a null-body status; construct the Response manually to avoid
      // fetch-mock rejecting an empty string body with status 204.
      fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));

      const client = new HttpClient("https://example.com", () => undefined);
      const result = await client.fetch("https://example.com/api");

      expect(result).toBeUndefined();
    });

    it("throws ToolError with responseStatus metadata for a non-OK response", async () => {
      fetchMock.mockResponseOnce("Not Found", { status: 404, statusText: "Not Found" });

      const client = new HttpClient("https://example.com", () => undefined);

      await expect(
        client.fetch("https://example.com/api", { errorContext: "Get Resource" }),
      ).rejects.toSatisfy((err: unknown) => {
        expect(err).toBeInstanceOf(ToolError);
        const toolErr = err as ToolError;
        expect(toolErr.message).toContain("Get Resource Failed - status: 404");
        expect(toolErr.metadata?.get("responseStatus")).toBe(404);
        return true;
      });
    });

    it("throws ToolError with responseStatus 500 when fetch throws a network error", async () => {
      fetchMock.mockRejectOnce(new Error("Network failure"));

      const client = new HttpClient("https://example.com", () => undefined);

      await expect(
        client.fetch("https://example.com/api", { errorContext: "Net" }),
      ).rejects.toSatisfy((err: unknown) => {
        expect(err).toBeInstanceOf(ToolError);
        const toolErr = err as ToolError;
        expect(toolErr.message).toContain("Net Failed - Network failure");
        expect(toolErr.metadata?.get("responseStatus")).toBe(500);
        return true;
      });
    });
  });

  describe("fetchRaw", () => {
    it("returns the raw Response object with the correct status", async () => {
      fetchMock.mockResponseOnce("raw body", { status: 202 });

      const client = new HttpClient("https://example.com", () => undefined);
      const response = await client.fetchRaw("https://example.com/api");

      expect(response).toBeInstanceOf(Response);
      expect(response.status).toBe(202);
    });
  });
});
