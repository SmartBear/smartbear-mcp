import { describe, expect, it } from "vitest";
import {
  ensureFullUrl,
  getNextUrlPathFromHeader,
  pickFields,
  pickFieldsFromArray,
} from "../../../bugsnag/client/api/base";

describe("API Utilities", () => {
  describe("pickFields", () => {
    it("should pick only specified fields from object", () => {
      const input = { id: "1", name: "Test", secret: "hidden", extra: "data" };
      const result = pickFields(input, ["id", "name"]);

      expect(result).toEqual({ id: "1", name: "Test" });
      expect(result).not.toHaveProperty("secret");
      expect(result).not.toHaveProperty("extra");
    });

    it("should handle missing fields gracefully", () => {
      const input = { id: "1" };
      const result = pickFields(input, ["id", "name", "missing"]);

      expect(result).toEqual({ id: "1" });
    });
  });

  describe("pickFieldsFromArray", () => {
    it("should pick fields from array of objects", () => {
      const input = [
        { id: "1", name: "Test1", secret: "hidden1" },
        { id: "2", name: "Test2", secret: "hidden2" },
      ];
      const result = pickFieldsFromArray(input, ["id", "name"]);

      expect(result).toEqual([
        { id: "1", name: "Test1" },
        { id: "2", name: "Test2" },
      ]);
    });
  });

  describe("getNextUrlPathFromHeader", () => {
    it("should extract next URL path from Link header", () => {
      const headers = new Headers();
      headers.append(
        "Link",
        '<https://api.bugsnag.com/projects/12345/errors?offset=30&per_page=30>; rel="next"',
      );

      const result = getNextUrlPathFromHeader(
        headers,
        "https://api.bugsnag.com",
      );
      expect(result).toBe("/projects/12345/errors?offset=30&per_page=30");
    });

    it("should handle case-insensitive Link header name", () => {
      const headers = new Headers();
      headers.append(
        "link",
        '<https://api.bugsnag.com/projects/12345/errors?offset=30&per_page=30>; rel="next"',
      );

      const result = getNextUrlPathFromHeader(
        headers,
        "https://api.bugsnag.com",
      );
      expect(result).toBe("/projects/12345/errors?offset=30&per_page=30");
    });

    it("should return null when Link header is missing", () => {
      const headers = new Headers();
      const result = getNextUrlPathFromHeader(
        headers,
        "https://api.bugsnag.com",
      );
      expect(result).toBeNull();
    });

    it('should return null when rel="next" is not in the Link header', () => {
      const headers = new Headers();
      headers.append(
        "Link",
        '<https://api.bugsnag.com/projects/12345/errors?offset=30&per_page=30>; rel="prev"',
      );

      const result = getNextUrlPathFromHeader(
        headers,
        "https://api.bugsnag.com",
      );
      expect(result).toBeNull();
    });
  });

  describe("ensureFullUrl", () => {
    it("should return the original URL if it already starts with http", () => {
      const url = "https://api.bugsnag.com/projects/12345/errors";
      const basePath = "https://api.bugsnag.com";

      const result = ensureFullUrl(url, basePath);

      expect(result).toBe(url);
    });

    it("should prepend the base path to a relative URL", () => {
      const url = "/projects/12345/errors";
      const basePath = "https://api.bugsnag.com";

      const result = ensureFullUrl(url, basePath);

      expect(result).toBe("https://api.bugsnag.com/projects/12345/errors");
    });

    it("should handle URLs with http protocol", () => {
      const url = "http://api.bugsnag.com/projects/12345/errors";
      const basePath = "https://api.bugsnag.com";

      const result = ensureFullUrl(url, basePath);

      expect(result).toBe(url);
    });

    it("should handle empty URL input", () => {
      const url = "";
      const basePath = "https://api.bugsnag.com";

      const result = ensureFullUrl(url, basePath);

      expect(result).toBe("https://api.bugsnag.com");
    });
  });
});
