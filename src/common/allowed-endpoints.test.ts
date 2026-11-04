import { afterEach, describe, expect, it, vi } from "vitest";
import { matchAllowedEndpoints } from "./allowed-endpoints";

describe("matchAllowedEndpoints", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns undefined when MCP_ALLOWED_ENDPOINTS is not configured", () => {
    vi.stubEnv("MCP_ALLOWED_ENDPOINTS", undefined);
    expect(matchAllowedEndpoints("https://x.example")).toBeUndefined();
  });

  it("matches exact entries, trimming whitespace", () => {
    vi.stubEnv(
      "MCP_ALLOWED_ENDPOINTS",
      "https://a.example , https://b.example",
    );
    expect(matchAllowedEndpoints("https://b.example")).toBe(true);
    expect(matchAllowedEndpoints("https://b.example/extra")).toBe(false);
  });

  it("matches /regex/ entries", () => {
    vi.stubEnv(
      "MCP_ALLOWED_ENDPOINTS",
      "/^https:\\/\\/[a-z]+\\.corp\\.example$/",
    );
    expect(matchAllowedEndpoints("https://api.corp.example")).toBe(true);
    expect(matchAllowedEndpoints("https://evil.example")).toBe(false);
  });

  it("warns on an invalid regex and does not match it", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("MCP_ALLOWED_ENDPOINTS", "/(/");
    expect(matchAllowedEndpoints("https://x.example")).toBe(false);
    expect(warn).toHaveBeenCalled();
  });
});
