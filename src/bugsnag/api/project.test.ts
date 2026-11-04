import { afterEach, describe, expect, it, vi } from "vitest";
import { Configuration } from "../client/api/configuration";
import { ProjectAPI } from "../client/api/Project";
import { getMockCollaborator } from "../utils/factories";

describe("ProjectAPI.listProjectCollaborators", () => {
  const api = new ProjectAPI(
    new Configuration({
      apiKey: "test-token",
      basePath: "http://localhost:3000",
    }),
  );

  const collaborators = [
    getMockCollaborator("collab-1", "Alice Smith", "alice@example.com", {
      two_factor_enabled: true,
      two_factor_enabled_on: "2026-01-01T00:00:00.000Z",
      recovery_codes_remaining: 4,
      password_updated_on: "2026-02-01T00:00:00.000Z",
    }),
    getMockCollaborator("collab-2", "Bob Johnson", "bob@example.com"),
    getMockCollaborator("collab-3", undefined as any, "pending@example.com", {
      pending_invitation: true,
    }),
  ];

  function respondWith(...pages: unknown[][]) {
    const fetchMock = vi.fn();
    pages.forEach((body, i) => {
      const headers = new Headers();
      if (i < pages.length - 1) {
        headers.set(
          "Link",
          `<http://localhost:3000/projects/proj-1/collaborators?offset=${i + 1}>; rel="next"`,
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

  it("requests the largest page size", async () => {
    const fetchMock = respondWith(collaborators);

    await api.listProjectCollaborators("proj-1");

    expect(fetchMock.mock.calls[0][0]).toContain(
      "/projects/proj-1/collaborators?per_page=100",
    );
  });

  it("returns only the allow-listed collaborator fields", async () => {
    respondWith(collaborators);

    const result = await api.listProjectCollaborators("proj-1");

    for (const collaborator of result.body ?? []) {
      for (const key of Object.keys(collaborator)) {
        expect(ProjectAPI.collaboratorFields).toContain(key);
      }
    }
    expect(result.body?.[0]).toEqual({
      id: "collab-1",
      name: "Alice Smith",
      email: "alice@example.com",
      is_admin: false,
      pending_invitation: false,
    });
    expect(JSON.stringify(result.body)).not.toMatch(
      /two_factor|recovery_codes|password_updated|heroku/,
    );
  });

  it("collects every page before filtering", async () => {
    const fetchMock = respondWith([collaborators[0]], [collaborators[1]]);

    const result = await api.listProjectCollaborators("proj-1", "bob");

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(result.body?.map((c) => c.id)).toEqual(["collab-2"]);
  });

  it.each([
    ["an exact ID", "collab-2", ["collab-2"]],
    ["part of a name, ignoring case", "aLiCe", ["collab-1"]],
    [
      "part of an email address",
      "@example.com",
      ["collab-1", "collab-2", "collab-3"],
    ],
    ["the email of a collaborator with no name", "pending@", ["collab-3"]],
  ])("filters by %s", async (_, filter, expectedIds) => {
    respondWith(collaborators);

    const result = await api.listProjectCollaborators("proj-1", filter);

    expect(result.body?.map((c) => c.id)).toEqual(expectedIds);
  });

  it("matches an ID exactly, not as a substring", async () => {
    respondWith(collaborators);

    const result = await api.listProjectCollaborators("proj-1", "collab");

    expect(result.body).toEqual([]);
  });

  it("returns every collaborator when no filter is given", async () => {
    respondWith(collaborators);

    const result = await api.listProjectCollaborators("proj-1");

    expect(result.body).toHaveLength(3);
  });
});
