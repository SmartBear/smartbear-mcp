import type { IncomingMessage } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { getBaseUrl, getHeaderName } from "../../../common/transport-http";
import type { Client } from "../../../common/types";

function fakeRequest(
  headers: Record<string, string | string[] | undefined>,
): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

function fakeClient(configPrefix: string): Client {
  return { configPrefix } as unknown as Client;
}

describe("transport-http helpers", () => {
  describe("getBaseUrl", () => {
    afterEach(() => {
      delete process.env.BASE_URL;
    });

    it("should return BASE_URL env var when set", () => {
      process.env.BASE_URL = "https://override.example.com";
      const req = fakeRequest({ host: "localhost:3000" });
      expect(getBaseUrl(req)).toBe("https://override.example.com");
    });

    it("should use x-forwarded-proto and x-forwarded-host when present", () => {
      const req = fakeRequest({
        "x-forwarded-proto": "https",
        "x-forwarded-host": "proxy.example.com",
        host: "localhost:3000",
      });
      expect(getBaseUrl(req)).toBe("https://proxy.example.com");
    });

    it("should default protocol to http when x-forwarded-proto is absent", () => {
      const req = fakeRequest({ host: "myhost:8080" });
      expect(getBaseUrl(req)).toBe("http://myhost:8080");
    });

    it("should fall back to host header when x-forwarded-host is absent", () => {
      const req = fakeRequest({
        "x-forwarded-proto": "https",
        host: "fallback.example.com",
      });
      expect(getBaseUrl(req)).toBe("https://fallback.example.com");
    });

    it("should prefer BASE_URL over proxy headers", () => {
      process.env.BASE_URL = "https://forced.example.com";
      const req = fakeRequest({
        "x-forwarded-proto": "https",
        "x-forwarded-host": "proxy.example.com",
      });
      expect(getBaseUrl(req)).toBe("https://forced.example.com");
    });
  });

  describe("getHeaderName", () => {
    it("should convert snake_case key to kebab-case with client prefix", () => {
      const client = fakeClient("Bugsnag");
      expect(getHeaderName(client, "auth_token")).toBe("Bugsnag-Auth-Token");
    });

    it("should handle single-word keys", () => {
      const client = fakeClient("Reflect");
      expect(getHeaderName(client, "token")).toBe("Reflect-Token");
    });

    it("should handle multi-word keys", () => {
      const client = fakeClient("Bugsnag");
      expect(getHeaderName(client, "project_api_key")).toBe(
        "Bugsnag-Project-Api-Key",
      );
    });

    it("should handle different client prefixes", () => {
      const client = fakeClient("Zephyr");
      expect(getHeaderName(client, "api_token")).toBe("Zephyr-Api-Token");
    });
  });
});
