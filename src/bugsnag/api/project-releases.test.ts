import { afterEach, describe, expect, it, vi } from "vitest";
import { Configuration } from "../client/api/configuration";
import { ProjectAPI } from "../client/api/Project";

describe("ProjectAPI release groups", () => {
  const api = new ProjectAPI(
    new Configuration({
      apiKey: "test-token",
      basePath: "http://localhost:3000",
    }),
  );

  function respondWith(...bodies: unknown[]) {
    const fetchMock = vi.fn();
    bodies.forEach((body, i) => {
      const headers = new Headers();
      if (i < bodies.length - 1) {
        headers.set(
          "Link",
          `<http://localhost:3000/release_groups/rg-1/releases?page_token=${i + 1}>; rel="next"`,
        );
      }
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers,
        json: vi.fn().mockResolvedValue(body),
      });
    });
    global.fetch = fetchMock;
    return fetchMock;
  }

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getReleaseGroup", () => {
    it("fetches the release group itself", async () => {
      const fetchMock = respondWith({ id: "rg-1", app_version: "3.2.0" });

      const result = await api.getReleaseGroup("rg-1");

      expect(fetchMock.mock.calls[0][0]).toBe(
        "http://localhost:3000/release_groups/rg-1",
      );
      expect(result.body).toMatchObject({ id: "rg-1", app_version: "3.2.0" });
    });
  });

  describe("listBuildsInRelease", () => {
    it("lists the builds from the release group's releases endpoint", async () => {
      const fetchMock = respondWith([
        { id: "build-1", app_version: "3.2.0", release_stage: "production" },
      ]);

      const result = await api.listBuildsInRelease("rg-1");

      expect(fetchMock.mock.calls[0][0]).toBe(
        "http://localhost:3000/release_groups/rg-1/releases",
      );
      expect(result.body).toEqual([
        { id: "build-1", app_version: "3.2.0", release_stage: "production" },
      ]);
    });

    it("does not request the release group object, which is not an array", async () => {
      // Shaped like the real API: the group is an object, its releases an array.
      global.fetch = vi.fn(async (url: string) => ({
        ok: true,
        status: 200,
        headers: new Headers(),
        json: async () =>
          url.endsWith("/releases")
            ? [{ id: "build-1", app_version: "3.2.0" }]
            : { id: "rg-1", app_version: "3.2.0" },
      })) as any;

      await expect(api.listBuildsInRelease("rg-1")).resolves.toMatchObject({
        body: [{ id: "build-1", app_version: "3.2.0" }],
      });
    });

    it("collects builds across every page", async () => {
      const fetchMock = respondWith([{ id: "build-1" }], [{ id: "build-2" }]);

      const result = await api.listBuildsInRelease("rg-1");

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(result.body?.map((b) => b.id)).toEqual(["build-1", "build-2"]);
    });

    it("keeps only the build fields the tools use", async () => {
      respondWith([
        { id: "build-1", app_version: "3.2.0", source_control: { a: 1 } },
      ]);

      const result = await api.listBuildsInRelease("rg-1");

      expect(Object.keys(result.body?.[0] ?? {})).toEqual(
        expect.arrayContaining(["id", "app_version"]),
      );
      for (const key of Object.keys(result.body?.[0] ?? {})) {
        expect(ProjectAPI.buildFields).toContain(key);
      }
    });
  });
});
