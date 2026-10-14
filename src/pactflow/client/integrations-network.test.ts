import { describe, expect, it, vi } from "vitest";
import {
  assignGroups,
  buildNetwork,
  fetchIntegrationsNetwork,
  mapLimit,
  parseIntegrationPairs,
  statusFromSummary,
} from "./integrations-network";

describe("integrations network", () => {
  it("parses HAL integrations and DOT graphs", () => {
    const hal = {
      _embedded: {
        integrations: [
          {
            consumer: { name: "a" },
            provider: { name: "b" },
            verificationModes: ["replay"],
          },
          { consumer: { name: "x" } },
        ],
      },
    };
    expect(parseIntegrationPairs(hal)).toEqual([
      { consumer: "a", provider: "b", verificationModes: ["replay"] },
    ]);
    expect(parseIntegrationPairs('digraph { a -> "b c"\n  d -> e }')).toEqual([
      { consumer: "a", provider: "b c", verificationModes: [] },
      { consumer: "d", provider: "e", verificationModes: [] },
    ]);
  });

  it("derives status from a matrix summary", () => {
    expect(statusFromSummary({ success: 2, failed: 1 })).toBe("failed");
    expect(statusFromSummary({ success: 2, failed: 0 })).toBe("verified");
    expect(statusFromSummary({ success: 0, failed: 0, unknown: 1 })).toBe(
      "unverified",
    );
    expect(statusFromSummary(undefined)).toBe("unverified");
  });

  it("groups by team, then team-name-matching prefix, then shared prefix, then Other", () => {
    const groups = assignGroups([
      { id: "svc-a", teams: ["Payments"] },
      { id: "payments-x", teams: [] },
      { id: "foo-1", teams: [] },
      { id: "foo-2", teams: [] },
      { id: "lonely", teams: [] },
    ]);
    expect(groups.get("svc-a")).toBe("Payments");
    expect(groups.get("payments-x")).toBe("Payments");
    expect(groups.get("foo-1")).toBe("foo");
    expect(groups.get("foo-2")).toBe("foo");
    expect(groups.get("lonely")).toBe("Other");
  });

  it("builds nodes, summary counts and skips default teams", () => {
    const edge = (consumer: string, provider: string, status: any) => ({
      consumer,
      provider,
      status,
      success: 0,
      failed: 0,
      unknown: 0,
      verificationModes: [],
    });
    const net = buildNetwork(
      [edge("a", "b", "verified"), edge("a", "c", "failed")],
      new Map([
        [
          "a",
          {
            mainBranch: "main",
            _embedded: {
              teams: [{ name: "Default", isDefault: true }, { name: "T" }],
              labels: [{ name: "l" }],
              latestVersion: { number: "1" },
            },
          },
        ],
      ]),
    );
    expect(net.nodes.find((n) => n.id === "a")).toMatchObject({
      group: "T",
      teams: ["T"],
      labels: ["l"],
      latestVersion: "1",
      mainBranch: "main",
    });
    expect(net.summary).toMatchObject({
      pacticipants: 3,
      integrations: 2,
      verified: 1,
      failed: 1,
      unverified: 0,
    });
  });

  it("limits concurrency", async () => {
    let active = 0,
      peak = 0;
    await mapLimit([1, 2, 3, 4, 5, 6], 2, async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 2));
      active--;
    });
    expect(peak).toBeLessThanOrEqual(2);
  });

  it("fetches, filters by consumer and tolerates failed lookups", async () => {
    const fetch = vi.fn(async (url: string) => {
      if (url.endsWith("/integrations")) {
        return {
          _embedded: {
            integrations: [
              { consumer: { name: "a" }, provider: { name: "b" } },
              { consumer: { name: "z" }, provider: { name: "y" } },
            ],
          },
        };
      }
      if (url.includes("/matrix"))
        return {
          summary: { success: 1, failed: 0, unknown: 0 },
          matrix: [{ consumer: { version: { number: "v1", branch: "main" } } }],
        };
      throw new Error("boom");
    });
    const net = await fetchIntegrationsNetwork(
      { baseUrl: "https://x", fetch } as any,
      { consumer: "a" },
    );
    expect(net.edges).toHaveLength(1);
    expect(net.edges[0]).toMatchObject({
      status: "verified",
      consumerVersion: "v1",
      consumerBranch: "main",
    });
    expect(net.warnings?.join(" ")).toContain(
      "Could not load details for 2 pacticipants",
    );
    expect(net.warnings?.join(" ")).toContain("First error: boom");
  });
});

describe("failure details and provider states", () => {
  it("parses BDCT errors", async () => {
    const { parseBdctErrors } = await import("./integrations-network");
    expect(
      parseBdctErrors({
        _embedded: {
          crossContractVerificationResults: {
            results: {
              errors: [
                {
                  code: "response.body.incompatible",
                  message: "bad body",
                  mockDetails: { interactionDescription: "create space" },
                  specDetails: { pathMethod: "post", pathName: "/spaces" },
                },
              ],
            },
          },
        },
      }),
    ).toEqual([
      {
        summary: "bad body",
        interaction: "create space",
        location: "POST /spaces",
        code: "response.body.incompatible",
      },
    ]);
  });

  it("parses failed pact interactions with names", async () => {
    const { parsePactFailures } = await import("./integrations-network");
    const out = parsePactFailures(
      {
        testResults: [
          { interactionId: "a", success: false },
          { interactionId: "b", success: true },
        ],
      },
      { interactions: [{ _id: "a", description: "get user" }] },
    );
    expect(out).toHaveLength(1);
    expect(out[0].interaction).toBe("get user");
  });

  it("filters provider states by consumer", async () => {
    const { parseProviderStates } = await import("./integrations-network");
    expect(
      parseProviderStates(
        {
          providerStates: [
            { name: "x", consumers: ["c1"] },
            { name: "y", consumers: ["c2"] },
          ],
        },
        "c1",
      ),
    ).toEqual(["x"]);
  });
});

describe("consumer scoping", () => {
  const http: any = {
    baseUrl: "http://x",
    fetch: async (url: string) =>
      url.endsWith("/integrations")
        ? {
            _embedded: {
              integrations: [
                { consumer: { name: "App" }, provider: { name: "P1" } },
                { consumer: { name: "Other" }, provider: { name: "App" } },
              ],
            },
          }
        : {},
  };
  it("matches case-insensitively and only keeps its providers", async () => {
    const { fetchIntegrationsNetwork } = await import("./integrations-network");
    const net = await fetchIntegrationsNetwork(http, { consumer: "app" });
    expect(net.nodes.map((n) => n.id).sort()).toEqual(["App", "P1"]);
  });
  it("sets focus and resolves a unique partial name", async () => {
    const { fetchIntegrationsNetwork } = await import("./integrations-network");
    const net = await fetchIntegrationsNetwork(http, { consumer: "pp" });
    expect(net.focus).toBe("App");
    expect(net.edges).toHaveLength(1);
  });
  it("warns for unknown names", async () => {
    const { fetchIntegrationsNetwork } = await import("./integrations-network");
    const net = await fetchIntegrationsNetwork(http, { consumer: "zzz" });
    expect(net.edges).toHaveLength(0);
    expect(net.focus).toBeUndefined();
    expect(net.warnings?.[0]).toContain('No pacticipant named "zzz"');
  });
});
