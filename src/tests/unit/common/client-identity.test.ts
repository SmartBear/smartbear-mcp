import { afterEach, describe, expect, it } from "vitest";
import {
  getCurrentClientIdentity,
  setProcessClientIdentity,
  toClientIdentity,
} from "../../../common/client-identity";
import { appendClientIdentity, getUserAgent } from "../../../common/info";
import { requestContextStorage } from "../../../common/request-context";

describe("client-identity", () => {
  afterEach(() => {
    // Reset the process-wide fallback between tests.
    setProcessClientIdentity(undefined);
  });

  describe("toClientIdentity", () => {
    it("preserves raw name/version and protocol version", () => {
      expect(
        toClientIdentity({ name: "claude-ai", version: "1.2.3" }, "2025-06-18"),
      ).toEqual({
        name: "claude-ai",
        version: "1.2.3",
        protocolVersion: "2025-06-18",
      });
    });

    it("handles a missing clientInfo object", () => {
      expect(toClientIdentity(undefined)).toEqual({
        name: undefined,
        version: undefined,
        protocolVersion: undefined,
      });
    });
  });

  describe("getCurrentClientIdentity", () => {
    it("returns the request-context identity when present", () => {
      const identity = toClientIdentity({ name: "cursor", version: "0.40.0" });
      requestContextStorage.run({ headers: {}, mcpClient: identity }, () => {
        expect(getCurrentClientIdentity()).toBe(identity);
      });
    });

    it("falls back to the process identity (stdio) outside a request", () => {
      const identity = toClientIdentity({ name: "claude-ai", version: "9" });
      setProcessClientIdentity(identity);
      expect(getCurrentClientIdentity()).toBe(identity);
    });

    it("prefers the request-context identity over the process fallback", () => {
      const processId = toClientIdentity({ name: "claude-ai" });
      const requestId = toClientIdentity({ name: "cursor" });
      setProcessClientIdentity(processId);
      requestContextStorage.run({ headers: {}, mcpClient: requestId }, () => {
        expect(getCurrentClientIdentity()).toBe(requestId);
      });
    });
  });

  describe("appendClientIdentity / getUserAgent", () => {
    it("returns the base unchanged when no client is identified", () => {
      expect(appendClientIdentity("Base/1.0")).toBe("Base/1.0");
    });

    it("returns the base unchanged for a client with no name", () => {
      requestContextStorage.run(
        { headers: {}, mcpClient: toClientIdentity(undefined) },
        () => {
          expect(appendClientIdentity("Base/1.0")).toBe("Base/1.0");
        },
      );
    });

    it("appends raw client name and version as a comment segment", () => {
      const identity = toClientIdentity({ name: "cursor", version: "0.40.0" });
      requestContextStorage.run({ headers: {}, mcpClient: identity }, () => {
        expect(appendClientIdentity("Base/1.0")).toBe(
          "Base/1.0 (client: cursor; clientVersion: 0.40.0)",
        );
        expect(getUserAgent()).toContain(
          "(client: cursor; clientVersion: 0.40.0)",
        );
      });
    });

    it("forwards unrecognized client names as-is", () => {
      const identity = toClientIdentity({ name: "weird-wrapper" });
      requestContextStorage.run({ headers: {}, mcpClient: identity }, () => {
        expect(appendClientIdentity("Base/1.0")).toBe(
          "Base/1.0 (client: weird-wrapper; clientVersion: unknown)",
        );
      });
    });

    it("sanitizes characters that would break the UA comment syntax", () => {
      const identity = toClientIdentity({
        name: "cursor",
        version: "1.0 (beta);\n",
      });
      requestContextStorage.run({ headers: {}, mcpClient: identity }, () => {
        expect(appendClientIdentity("Base/1.0")).toBe(
          "Base/1.0 (client: cursor; clientVersion: 1.0 beta)",
        );
      });
    });
  });
});
