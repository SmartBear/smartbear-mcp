import type { IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import {
  getRequestContext,
  getRequestHeader,
  requestContextStorage,
  withRequestContext,
} from "./request-context.ts";

function fakeRequest(
  headers: Record<string, string | string[] | undefined>,
): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

describe("request-context", () => {
  describe("withRequestContext", () => {
    it("should make headers available via getRequestContext inside callback", () => {
      const req = fakeRequest({ authorization: "Bearer abc" });
      const result = withRequestContext(req, () => {
        const ctx = getRequestContext();
        return ctx?.headers.authorization;
      });
      expect(result).toBe("Bearer abc");
    });

    it("should return the callback's return value", () => {
      const req = fakeRequest({});
      const result = withRequestContext(req, () => 42);
      expect(result).toBe(42);
    });

    it("should work with async callbacks", async () => {
      const req = fakeRequest({ "x-token": "secret" });
      const result = await withRequestContext(req, async () =>
        getRequestHeader("x-token"),
      );
      expect(result).toBe("secret");
    });

    it("should not leak context outside the callback", () => {
      const req = fakeRequest({ "x-token": "secret" });
      withRequestContext(req, () => {});
      expect(getRequestContext()).toBeUndefined();
    });
  });

  describe("getRequestHeader", () => {
    it("should return undefined when no context exists", () => {
      expect(getRequestHeader("Authorization")).toBeUndefined();
    });

    it("should match header by exact case", () => {
      const req = fakeRequest({ "Bugsnag-Auth-Token": "my-pat" });
      const result = withRequestContext(req, () =>
        getRequestHeader("Bugsnag-Auth-Token"),
      );
      expect(result).toBe("my-pat");
    });

    it("should fall back to lowercase match", () => {
      const req = fakeRequest({ authorization: "Bearer xyz" });
      const result = withRequestContext(req, () =>
        getRequestHeader("Authorization"),
      );
      expect(result).toBe("Bearer xyz");
    });

    it("should handle array header values", () => {
      const req = fakeRequest({
        "x-multi": ["val1", "val2"] as unknown as string,
      });
      const result = withRequestContext(req, () => getRequestHeader("x-multi"));
      expect(result).toEqual(["val1", "val2"]);
    });

    it("should return undefined for missing headers", () => {
      const req = fakeRequest({ other: "value" });
      const result = withRequestContext(req, () =>
        getRequestHeader("Non-Existent"),
      );
      expect(result).toBeUndefined();
    });
  });

  describe("requestContextStorage (direct)", () => {
    it("should allow nested contexts", () => {
      requestContextStorage.run({ headers: { outer: "outer-val" } }, () => {
        expect(getRequestHeader("outer")).toBe("outer-val");

        requestContextStorage.run({ headers: { inner: "inner-val" } }, () => {
          expect(getRequestHeader("inner")).toBe("inner-val");
          expect(getRequestHeader("outer")).toBeUndefined();
        });

        // Outer context restored
        expect(getRequestHeader("outer")).toBe("outer-val");
      });
    });
  });
});
