import { afterEach, describe, expect, it } from "vitest";
import {
  getCurrentClientIdentity,
  MCP_CLIENT_NAMES,
  normalizeClientName,
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

  describe("normalizeClientName", () => {
    it.each([
      ["claude-ai", MCP_CLIENT_NAMES.CLAUDE],
      ["Claude Code", MCP_CLIENT_NAMES.CLAUDE],
      ["cursor", MCP_CLIENT_NAMES.CURSOR],
      ["Cursor", MCP_CLIENT_NAMES.CURSOR],
      ["copilot-studio", MCP_CLIENT_NAMES.COPILOT_STUDIO],
      ["Copilot Studio", MCP_CLIENT_NAMES.COPILOT_STUDIO],
      ["Visual Studio Code", MCP_CLIENT_NAMES.VSCODE],
      ["vscode", MCP_CLIENT_NAMES.VSCODE],
      ["continue", MCP_CLIENT_NAMES.CONTINUE],
      ["cline", MCP_CLIENT_NAMES.CLINE],
      ["windsurf", MCP_CLIENT_NAMES.WINDSURF],
      ["zed", MCP_CLIENT_NAMES.ZED],
      ["goose", MCP_CLIENT_NAMES.GOOSE],
      ["mcp-inspector", MCP_CLIENT_NAMES.MCP_INSPECTOR],
    ])("normalizes %s -> %s", (raw, expected) => {
      expect(normalizeClientName(raw)).toBe(expected);
    });

    it("matches copilot-studio before the broader studio/code rules", () => {
      expect(normalizeClientName("github-copilot-studio")).toBe(
        MCP_CLIENT_NAMES.COPILOT_STUDIO,
      );
    });

    it("returns unknown for empty, whitespace, or unrecognized names", () => {
      expect(normalizeClientName(undefined)).toBe(MCP_CLIENT_NAMES.UNKNOWN);
      expect(normalizeClientName("")).toBe(MCP_CLIENT_NAMES.UNKNOWN);
      expect(normalizeClientName("   ")).toBe(MCP_CLIENT_NAMES.UNKNOWN);
      expect(normalizeClientName("some-random-wrapper")).toBe(
        MCP_CLIENT_NAMES.UNKNOWN,
      );
    });
  });

  describe("toClientIdentity", () => {
    it("preserves raw name/version and adds the normalized name + protocol", () => {
      expect(
        toClientIdentity({ name: "claude-ai", version: "1.2.3" }, "2025-06-18"),
      ).toEqual({
        name: "claude-ai",
        version: "1.2.3",
        protocolVersion: "2025-06-18",
        normalizedName: MCP_CLIENT_NAMES.CLAUDE,
      });
    });

    it("handles a missing clientInfo object", () => {
      expect(toClientIdentity(undefined)).toEqual({
        name: undefined,
        version: undefined,
        protocolVersion: undefined,
        normalizedName: MCP_CLIENT_NAMES.UNKNOWN,
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

    it("returns the base unchanged for an unknown client with no name", () => {
      requestContextStorage.run(
        { headers: {}, mcpClient: toClientIdentity(undefined) },
        () => {
          expect(appendClientIdentity("Base/1.0")).toBe("Base/1.0");
        },
      );
    });

    it("appends normalized name and version as a comment segment", () => {
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

    it("uses 'unknown' version and forwards even an unrecognized named client", () => {
      const identity = toClientIdentity({ name: "weird-wrapper" });
      requestContextStorage.run({ headers: {}, mcpClient: identity }, () => {
        expect(appendClientIdentity("Base/1.0")).toBe(
          "Base/1.0 (client: unknown; clientVersion: unknown)",
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
