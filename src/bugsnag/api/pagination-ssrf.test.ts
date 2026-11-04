import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Configuration } from "../client/api/configuration";
import { ErrorAPI } from "../client/api/Error";
import { ProjectAPI } from "../client/api/Project";

// Regression coverage for HackerOne #4048125 at every call site: whatever
// absolute/protocol-relative `nextUrl` a caller supplies, the outbound request
// must stay on the configured API host.
const BASE = "https://api.bugsnag.com";
const HOSTILE_NEXT_URLS = [
  "http://169.254.169.254/latest/meta-data?page=2",
  "https://evil.example/projects/p/errors?offset=1",
  "//evil.example/x?page=2",
  "http://a//evil.example/x?page=2",
];

describe("nextUrl SSRF protection at API call sites", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn(async () => new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const config = () =>
    new Configuration({ basePath: BASE, apiKey: () => "token" });

  const calls: [string, (n: string) => Promise<unknown>][] = [
    [
      "ErrorAPI.listEventsOnProject",
      (n) =>
        new ErrorAPI(config()).listEventsOnProject(
          "p",
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          n,
        ),
    ],
    [
      "ErrorAPI.listProjectErrors",
      (n) =>
        new ErrorAPI(config()).listProjectErrors(
          "p",
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          n,
        ),
    ],
    [
      "ErrorAPI.listErrorEvents",
      (n) =>
        new ErrorAPI(config()).listErrorEvents(
          "p",
          "e",
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          n,
        ),
    ],
    [
      "ProjectAPI.listProjectReleaseGroups",
      (n) =>
        new ProjectAPI(config()).listProjectReleaseGroups(
          "p",
          "production",
          undefined,
          undefined,
          undefined,
          n,
        ),
    ],
    [
      "ProjectAPI.listProjectSpanGroups",
      (n) =>
        new ProjectAPI(config()).listProjectSpanGroups(
          "p",
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          undefined,
          n,
        ),
    ],
    [
      "ProjectAPI.listSpansBySpanGroupId",
      (n) =>
        new ProjectAPI(config()).listSpansBySpanGroupId(
          "p",
          "s",
          undefined,
          undefined,
          undefined,
          undefined,
          n,
        ),
    ],
  ];

  describe.each(calls)("%s", (_name, call) => {
    it.each(
      HOSTILE_NEXT_URLS,
    )("never leaves the API host for %s", async (n) => {
      await call(n);
      expect(fetchMock).toHaveBeenCalled();
      for (const [requested] of fetchMock.mock.calls) {
        expect(new URL(String(requested)).host).toBe("api.bugsnag.com");
      }
    });
  });
});
