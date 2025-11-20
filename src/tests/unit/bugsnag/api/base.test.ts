import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  BaseAPI,
  ensureFullUrl,
  getNextUrlPathFromHeader,
  getQueryParams,
  pickFields,
  pickFieldsFromArray,
} from "../../../../bugsnag/client/api/base";
import { Configuration } from "../../../../bugsnag/client/api/configuration.js";

describe("base.ts", () => {
  describe("pickFields", () => {
    it("should pick specified fields from an object", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keys = ["a", "c"];
      const result = pickFields(obj, keys);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("should handle empty objects", () => {
      const obj = {};
      const keys = ["a", "b"];
      const result = pickFields(obj, keys);
      expect(result).toEqual({});
    });

    it("should handle null objects", () => {
      const obj = null;
      const keys = ["a", "b"];
      const result = pickFields(obj, keys);
      expect(result).toEqual({});
    });

    it("should handle undefined objects", () => {
      const obj = undefined;
      const keys = ["a", "b"];
      const result = pickFields(obj, keys);
      expect(result).toEqual({});
    });

    it("should handle non-existent keys", () => {
      const obj = { a: 1, b: 2 };
      const keys = ["c", "d"];
      const result = pickFields(obj, keys);
      expect(result).toEqual({});
    });

    it("should handle mixed existing and non-existing keys", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keys = ["a", "d", "c", "e"];
      const result = pickFields(obj, keys);
      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("should handle empty keys array", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const keys: string[] = [];
      const result = pickFields(obj, keys);
      expect(result).toEqual({});
    });

    it("should preserve value types including falsy values", () => {
      const obj = { a: 0, b: false, c: null, d: undefined, e: "", f: [] };
      const keys = ["a", "b", "c", "d", "e", "f"];
      const result = pickFields(obj, keys);
      expect(result).toEqual({
        a: 0,
        b: false,
        c: null,
        d: undefined,
        e: "",
        f: [],
      });
    });
  });

  describe("pickFieldsFromArray", () => {
    it("should pick specified fields from an array of objects", () => {
      const arr = [
        { a: 1, b: 2 },
        { a: 3, b: 4 },
      ];
      const keys = ["a"];
      const result = pickFieldsFromArray(arr, keys);
      expect(result).toEqual([{ a: 1 }, { a: 3 }]);
    });

    it("should handle empty arrays", () => {
      const arr: any[] = [];
      const keys = ["a", "b"];
      const result = pickFieldsFromArray(arr, keys);
      expect(result).toEqual([]);
    });

    it("should handle arrays with null/undefined items", () => {
      const arr = [{ a: 1, b: 2 }, null, { a: 3, c: 4 }, undefined];
      const keys = ["a", "b"];
      const result = pickFieldsFromArray(arr, keys);
      expect(result).toEqual([{ a: 1, b: 2 }, {}, { a: 3 }, {}]);
    });

    it("should handle arrays with mixed object types", () => {
      const arr = [
        { a: 1, b: 2, c: 3 },
        { a: 4, d: 5 },
        { b: 6, e: 7 },
      ];
      const keys = ["a", "b"];
      const result = pickFieldsFromArray(arr, keys);
      expect(result).toEqual([{ a: 1, b: 2 }, { a: 4 }, { b: 6 }]);
    });

    it("should handle empty keys array", () => {
      const arr = [
        { a: 1, b: 2 },
        { c: 3, d: 4 },
      ];
      const keys: string[] = [];
      const result = pickFieldsFromArray(arr, keys);
      expect(result).toEqual([{}, {}]);
    });

    it("should preserve falsy values in array items", () => {
      const arr = [
        { a: 0, b: false, c: null },
        { a: "", b: undefined, c: [] },
      ];
      const keys = ["a", "b", "c"];
      const result = pickFieldsFromArray(arr, keys);
      expect(result).toEqual([
        { a: 0, b: false, c: null },
        { a: "", b: undefined, c: [] },
      ]);
    });
  });

  describe("getNextUrlPathFromHeader", () => {
    it("should extract the next URL path from the Link header", () => {
      const headers = new Headers();
      headers.append(
        "Link",
        '<http://localhost/api/v1/next?page=2>; rel="next"',
      );
      const basePath = "http://localhost/api/v1";
      const result = getNextUrlPathFromHeader(headers, basePath);
      expect(result).toBe("/next?page=2");
    });

    it("should return null if Link header is not present", () => {
      const headers = new Headers();
      const basePath = "http://localhost/api/v1";
      const result = getNextUrlPathFromHeader(headers, basePath);
      expect(result).toBeNull();
    });

    it("should handle case-insensitive Link header", () => {
      const headers = new Headers();
      headers.append(
        "link",
        '<http://localhost/api/v1/next?page=2>; rel="next"',
      );
      const basePath = "http://localhost/api/v1";
      const result = getNextUrlPathFromHeader(headers, basePath);
      expect(result).toBe("/next?page=2");
    });

    it("should return null if no next rel link found", () => {
      const headers = new Headers();
      headers.append(
        "Link",
        '<http://localhost/api/v1/prev?page=1>; rel="prev"',
      );
      const basePath = "http://localhost/api/v1";
      const result = getNextUrlPathFromHeader(headers, basePath);
      expect(result).toBeNull();
    });

    it("should handle multiple Link header values", () => {
      const headers = new Headers();
      headers.append(
        "Link",
        '<http://localhost/api/v1/prev?page=1>; rel="prev", <http://localhost/api/v1/next?page=3>; rel="next"',
      );
      const basePath = "http://localhost/api/v1";
      const result = getNextUrlPathFromHeader(headers, basePath);
      expect(result).toBe("/next?page=3");
    });

    it("should handle malformed Link headers gracefully", () => {
      const headers = new Headers();
      headers.append("Link", "malformed link header");
      const basePath = "http://localhost/api/v1";
      const result = getNextUrlPathFromHeader(headers, basePath);
      expect(result).toBeNull();
    });

    it("should handle null headers", () => {
      const result = getNextUrlPathFromHeader(
        null as any,
        "http://localhost/api/v1",
      );
      expect(result).toBeNull();
    });

    it("should handle undefined headers", () => {
      const result = getNextUrlPathFromHeader(
        undefined as any,
        "http://localhost/api/v1",
      );
      expect(result).toBeNull();
    });

    it("should handle different spacing in Link header", () => {
      const headers = new Headers();
      headers.append(
        "Link",
        '<http://localhost/api/v1/next?page=2>;rel="next"',
      );
      const basePath = "http://localhost/api/v1";
      const result = getNextUrlPathFromHeader(headers, basePath);
      expect(result).toBe("/next?page=2");
    });

    it("should handle complex URLs with query parameters", () => {
      const headers = new Headers();
      headers.append(
        "Link",
        '<http://localhost/api/v1/errors?offset=10&per_page=20&filter=active>; rel="next"',
      );
      const basePath = "http://localhost/api/v1";
      const result = getNextUrlPathFromHeader(headers, basePath);
      expect(result).toBe("/errors?offset=10&per_page=20&filter=active");
    });
  });

  describe("ensureFullUrl", () => {
    it("should return the same URL if it is already a full URL", () => {
      const url = "http://example.com/path";
      const basePath = "http://base.com";
      expect(ensureFullUrl(url, basePath)).toBe(url);
    });

    it("should prepend basePath if URL is a path", () => {
      const url = "/path";
      const basePath = "http://base.com";
      expect(ensureFullUrl(url, basePath)).toBe("http://base.com/path");
    });

    it("should handle HTTPS URLs", () => {
      const url = "https://secure.example.com/path";
      const basePath = "http://base.com";
      expect(ensureFullUrl(url, basePath)).toBe(url);
    });

    it("should handle complex paths with query parameters", () => {
      const url = "/api/v1/errors?page=2&filter=active";
      const basePath = "https://api.bugsnag.com";
      expect(ensureFullUrl(url, basePath)).toBe(
        "https://api.bugsnag.com/api/v1/errors?page=2&filter=active",
      );
    });

    it("should handle empty path", () => {
      const url = "";
      const basePath = "http://base.com";
      expect(ensureFullUrl(url, basePath)).toBe("http://base.com");
    });

    it("should handle root path", () => {
      const url = "/";
      const basePath = "http://base.com";
      expect(ensureFullUrl(url, basePath)).toBe("http://base.com/");
    });

    it("should handle basePath without trailing slash", () => {
      const url = "/path";
      const basePath = "http://base.com";
      expect(ensureFullUrl(url, basePath)).toBe("http://base.com/path");
    });

    it("should handle basePath with trailing slash", () => {
      const url = "/path";
      const basePath = "http://base.com/";
      expect(ensureFullUrl(url, basePath)).toBe("http://base.com//path");
    });
  });

  describe("getQueryParams", () => {
    it("should merge nextUrl and options query params", () => {
      const nextUrl = "/test?page=2";
      const options = { query: { filter: "active" } };
      const params = getQueryParams(nextUrl, options);
      expect(params.query).toEqual({ page: "2", filter: "active" });
    });

    it("should handle nextUrl without options", () => {
      const nextUrl = "/test?page=2&per_page=10";
      const params = getQueryParams(nextUrl);
      expect(params.query).toEqual({ page: "2", per_page: "10" });
    });

    it("should handle options without nextUrl", () => {
      const options = { query: { filter: "active", status: "open" } };
      const params = getQueryParams(null, options);
      expect(params.query).toEqual({ filter: "active", status: "open" });
    });

    it("should handle no parameters", () => {
      const params = getQueryParams();
      expect(params.query).toEqual({});
    });

    it("should throw error for nextUrl without query parameters", () => {
      const nextUrl = "/test";
      expect(() => getQueryParams(nextUrl)).toThrow(
        "nextUrl must contains query parameters",
      );
    });

    it("should handle empty nextUrl string", () => {
      const params = getQueryParams("");
      expect(params.query).toEqual({});
    });

    it("should handle complex query parameters", () => {
      const nextUrl =
        "/test?page=2&filter[status]=open&sort=created_at&direction=desc";
      const options = { query: { per_page: "50", search: "error" } };
      const params = getQueryParams(nextUrl, options);
      expect(params.query).toEqual({
        page: "2",
        "filter[status]": "open",
        sort: "created_at",
        direction: "desc",
        per_page: "50",
        search: "error",
      });
    });

    it("should handle duplicate keys - options should override nextUrl", () => {
      const nextUrl = "/test?page=1&filter=old";
      const options = { query: { page: "2", filter: "new" } };
      const params = getQueryParams(nextUrl, options);
      expect(params.query).toEqual({ page: "2", filter: "new" });
    });

    it("should handle URL encoded query parameters", () => {
      const nextUrl = "/test?query=hello%20world&special=%26%3D%3F";
      const params = getQueryParams(nextUrl);
      expect(params.query).toEqual({ query: "hello world", special: "&=?" });
    });
  });

  describe("BaseAPI", () => {
    const configuration = new Configuration({
      apiKey: "test-token",
      basePath: "http://localhost:3000",
      headers: { "X-Test-Header": "test-value" },
    });

    it("should construct with the correct configuration", () => {
      const baseApi = new BaseAPI(configuration);
      // biome-ignore lint/complexity/useLiteralKeys: reading internal field for testing
      const configuredObj = baseApi["configuration"];
      expect(configuredObj).toBe(configuration);
      expect(configuredObj.apiKey).toBe("test-token");
      expect(configuredObj.basePath).toBe("http://localhost:3000");
    });

    it("should construct with filterFields", () => {
      const filterFields = ["sensitive", "private"];
      const baseApi = new BaseAPI(configuration, filterFields);
      // biome-ignore lint/complexity/useLiteralKeys: reading internal field for testing
      expect(baseApi["filterFields"]).toEqual(filterFields);
    });

    it("should construct with empty filterFields when not provided", () => {
      const baseApi = new BaseAPI(configuration);
      // biome-ignore lint/complexity/useLiteralKeys: reading internal field for testing
      expect(baseApi["filterFields"]).toEqual([]);
    });

    it("should construct with minimal configuration", () => {
      const minimalConfig = new Configuration({
        basePath: "http://localhost:3000",
      });
      const baseApi = new BaseAPI(minimalConfig);
      // biome-ignore lint/complexity/useLiteralKeys: reading internal field for testing
      expect(baseApi["configuration"]).toBe(minimalConfig);
      // biome-ignore lint/complexity/useLiteralKeys: reading internal field for testing
      expect(baseApi["filterFields"]).toEqual([]);
    });

    describe("requestObject", () => {
      const baseApi = new BaseAPI(configuration);

      beforeEach(() => {
        vi.restoreAllMocks();
      });

      it("should make successful request and return parsed response", async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi
            .fn()
            .mockResolvedValue({ error_id: "123", error_class: "TestError" }),
          text: vi.fn(),
        };
        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        const result = await baseApi.requestObject("/test", { method: "GET" });

        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:3000/test",
          {
            method: "GET",
            headers: { "X-Test-Header": "test-value" },
          },
        );
        expect(result.status).toBe(200);
        expect(result.body).toEqual({
          errorId: "123",
          errorClass: "TestError",
        });
      });

      it("should throw error on failed request", async () => {
        const mockResponse = {
          ok: false,
          status: 404,
          text: vi.fn().mockResolvedValue("Not Found"),
        };
        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        await expect(
          baseApi.requestObject("/test", { method: "GET" }),
        ).rejects.toThrow("Request failed with status 404: Not Found");
      });

      it("should filter fields when specified", async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi
            .fn()
            .mockResolvedValue({ id: "123", name: "Test", secret: "hidden" }),
          text: vi.fn(),
        };
        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        const result = await baseApi.requestObject("/test", { method: "GET" }, [
          "id",
          "name",
        ]);

        expect(result.body).toEqual({ id: "123", name: "Test" });
      });

      it("should sanitize response when filterFields are configured", async () => {
        const apiWithFilter = new BaseAPI(configuration, ["secret", "private"]);
        const mockResponse = {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue({
            id: "123",
            name: "Test",
            secret: "hidden",
            private: "data",
          }),
          text: vi.fn(),
        };
        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        const result = await apiWithFilter.requestObject("/test", {
          method: "GET",
        });

        expect(result.body).toEqual({ id: "123", name: "Test" });
      });
    });

    describe("requestArray", () => {
      const baseApi = new BaseAPI(configuration);

      beforeEach(() => {
        vi.restoreAllMocks();
      });

      it("should make successful request and return array response", async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue([
            { error_id: "123", error_class: "TestError" },
            { error_id: "456", error_class: "AnotherError" },
          ]),
          text: vi.fn(),
        };
        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        const result = await baseApi.requestArray("/test", { method: "GET" });

        expect(global.fetch).toHaveBeenCalledWith(
          "http://localhost:3000/test",
          {
            method: "GET",
            headers: { "X-Test-Header": "test-value" },
          },
        );
        expect(result.body).toEqual([
          { errorId: "123", errorClass: "TestError" },
          { errorId: "456", errorClass: "AnotherError" },
        ]);
        expect(result.status).toBe(200);
        expect(result.totalCount).toBeNull();
        expect(result.nextUrl).toBeNull();
      });

      it("should handle pagination with fetchAll=true", async () => {
        const headers1 = new Headers();
        headers1.set("Link", '<http://localhost:3000/test?page=2>; rel="next"');
        const mockResponse1 = {
          ok: true,
          status: 200,
          headers: headers1,
          json: vi.fn().mockResolvedValue([{ id: "1" }]),
          text: vi.fn(),
        };

        const mockResponse2 = {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue([{ id: "2" }]),
          text: vi.fn(),
        };

        global.fetch = vi
          .fn()
          .mockResolvedValueOnce(mockResponse1)
          .mockResolvedValueOnce(mockResponse2);

        const result = await baseApi.requestArray(
          "/test",
          { method: "GET" },
          true,
        );

        expect(global.fetch).toHaveBeenCalledTimes(2);
        expect(result.body).toEqual([{ id: "1" }, { id: "2" }]);
        expect(result.status).toBe(200);
        expect(result.totalCount).toBeNull();
        expect(result.nextUrl).toBeNull();
      });

      it("should handle pagination with fetchAll=false", async () => {
        const headers = new Headers();
        headers.set("Link", '<http://localhost:3000/test?page=2>; rel="next"');
        const mockResponse = {
          ok: true,
          status: 200,
          headers: headers,
          json: vi.fn().mockResolvedValue([{ id: "1" }]),
          text: vi.fn(),
        };

        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        const result = await baseApi.requestArray(
          "/test",
          { method: "GET" },
          false,
        );

        expect(global.fetch).toHaveBeenCalledTimes(1);
        expect(result.body).toEqual([{ id: "1" }]);
        expect(result.nextUrl).toBe("/test?page=2");
        expect(result.status).toBe(200);
        expect(result.totalCount).toBeNull();
      });

      it("should handle X-Total-Count header", async () => {
        const headers = new Headers();
        headers.set("X-Total-Count", "42");
        const mockResponse = {
          ok: true,
          status: 200,
          headers: headers,
          json: vi.fn().mockResolvedValue([{ id: "1" }]),
          text: vi.fn(),
        };
        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        const result = await baseApi.requestArray("/test", { method: "GET" });

        expect(result.totalCount).toBe(42);
      });

      it("should handle X-Total-Count header", async () => {
        const headers = new Headers();
        headers.set("X-Total-Count", "not-a-number");
        const mockResponse = {
          ok: true,
          status: 200,
          headers: headers,
          json: vi.fn().mockResolvedValue([{ id: "1" }]),
          text: vi.fn(),
        };
        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        const result = await baseApi.requestArray("/test", { method: "GET" });

        expect(result.totalCount).toBeNull();
      });

      it("should throw error when response is not successful", async () => {
        const mockResponse = {
          ok: false,
          status: 404,
          headers: new Headers(),
          json: vi.fn(),
          text: () => "Not Found",
        };
        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        await expect(
          baseApi.requestArray("/test", { method: "GET" }),
        ).rejects.toThrow("Request failed with status 404: Not Found");
      });

      it("should throw error when response is not an array", async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue({ error: "not an array" }),
          text: vi.fn(),
        };
        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        await expect(
          baseApi.requestArray("/test", { method: "GET" }),
        ).rejects.toThrow("Expected response to be an array");
      });

      it("should filter fields from array items when specified", async () => {
        const mockResponse = {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue([
            { id: "123", name: "Test", secret: "hidden", empty: null },
            { id: "456", name: "Test2", secret: "hidden2", empty: null },
          ]),
          text: vi.fn(),
        };
        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        const result = await baseApi.requestArray(
          "/test",
          { method: "GET" },
          true,
          ["id", "name"],
        );

        expect(result.body).toEqual([
          { id: "123", name: "Test" },
          { id: "456", name: "Test2" },
        ]);
      });

      it("should sanitize array items when filterFields are configured", async () => {
        const apiWithFilter = new BaseAPI(configuration, ["secret"]);
        const mockResponse = {
          ok: true,
          status: 200,
          headers: new Headers(),
          json: vi.fn().mockResolvedValue([
            { id: "123", name: "Test", secret: "hidden", empty: null },
            { id: "456", name: "Test2", secret: "hidden2", empty: null },
          ]),
          text: vi.fn(),
        };
        global.fetch = vi.fn().mockResolvedValue(mockResponse);

        const result = await apiWithFilter.requestArray("/test", {
          method: "GET",
        });

        expect(result.body).toEqual([
          { id: "123", name: "Test", empty: null },
          { id: "456", name: "Test2", empty: null },
        ]);
      });
    });
  });
});
