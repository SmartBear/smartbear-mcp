/**
 * Pact V4 consumer tests for the PactflowClient pacticipant API — pacticipant CRUD, branches, versions and labels.
 *
 * Each test creates its own ephemeral mock server via executeTest(), so tests
 * are fully isolated. Generated pact files land in ./pacts/ at the project root.
 *
 * Run with:
 *   npx vitest run --config vitest.pact.config.ts src/pactflow/client/pacticipant-api.pact.test.ts
 */

import { Matchers } from "@pact-foundation/pact";
import { describe, expect, it } from "vitest";
import {
  authHeader,
  createClient,
  expectErrorStatus,
  halJsonResponseHeaders,
  halLink,
  jsonHeaders,
  pageBody,
  provider,
  selfLink,
  timestamp,
} from "./pact-helpers";

const { like, eachLike } = Matchers;

const titledLink = like({
  title: "Resource",
  name: "resource",
  href: "https://example.pactflow.io/resource",
});

function pacticipantBody(
  name: string,
  displayName: string,
  mainBranch: string,
) {
  return {
    name,
    displayName,
    mainBranch,
    createdAt: timestamp,
    _embedded: { labels: eachLike({ name: "team-a" }, 0) },
    _links: {
      ...selfLink,
      "pb:branch-version": halLink,
      "pb:branches": halLink,
      "pb:can-i-deploy-badge": halLink,
      "pb:can-i-deploy-branch-to-environment-badge": halLink,
      "pb:label": halLink,
      "pb:version": halLink,
      "pb:version-tag": halLink,
      "pb:versions": halLink,
      curies: eachLike({
        name: "pb",
        href: "https://example.pactflow.io/doc/{rel}",
        templated: true,
      }),
      versions: halLink,
    },
  };
}

describe("Pacticipant – core", () => {
  it("GET /pacticipants – returns list of pacticipants", () =>
    provider
      .addInteraction()
      .given("pacticipants exist")
      .uponReceiving("a request to list all pacticipants")
      .withRequest("GET", "/pacticipants", (builder) => {
        builder.headers({ Authorization: like("Bearer test-token") });
      })
      .willRespondWith(200, (builder) => {
        builder.headers(halJsonResponseHeaders).jsonBody({
          _embedded: { pacticipants: eachLike({ name: like("ServiceA") }) },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listPacticipants();
        expect(Array.isArray(result._embedded.pacticipants)).toBe(true);
        expect(result._embedded.pacticipants.length).toBeGreaterThanOrEqual(1);
        expect(result._embedded.pacticipants[0].name).toBeDefined();
      }));

  it("GET /pacticipants/{name} – returns pacticipant metadata", () =>
    provider
      .addInteraction()
      .given("a pacticipant named ServiceA exists")
      .uponReceiving("a request to get pacticipant ServiceA")
      .withRequest("GET", "/pacticipants/ServiceA", (builder) => {
        builder.headers({ Authorization: like("Bearer test-token") });
      })
      .willRespondWith(200, (builder) => {
        builder
          .headers(halJsonResponseHeaders)
          .jsonBody(like(pacticipantBody("ServiceA", "Service A", "main")));
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getPacticipant({
          pacticipantName: "ServiceA",
        });
        expect(result.name).toBe("ServiceA");
        expect(result.mainBranch).toBe("main");
      }));
});

describe("Pacticipant CRUD", () => {
  it("POST /pacticipants – creates a pacticipant", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to create pacticipant NewService")
      .withRequest("POST", "/pacticipants", (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({
            name: "NewService",
            displayName: "New Service",
            mainBranch: "main",
          }),
        );
      })
      .willRespondWith(201, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(pacticipantBody("NewService", "New Service", "main")),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.createPacticipant({
          name: "NewService",
          displayName: "New Service",
          mainBranch: "main",
        });
        expect(result.name).toBe("NewService");
      }));

  it("DELETE /pacticipants/{name} – deletes a pacticipant", () =>
    provider
      .addInteraction()
      .given("a pacticipant named OldService exists")
      .uponReceiving("a request to delete pacticipant OldService")
      .withRequest("DELETE", "/pacticipants/OldService", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.deletePacticipant({ pacticipantName: "OldService" }),
        ).resolves.toBeUndefined();
      }));

  it("PUT /pacticipants/{name} – updates a pacticipant", () =>
    provider
      .addInteraction()
      .given("a pacticipant named ServiceA exists")
      .uponReceiving("a request to update pacticipant ServiceA")
      .withRequest("PUT", "/pacticipants/ServiceA", (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({ mainBranch: "main", displayName: "Service A" }),
        );
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(pacticipantBody("ServiceA", "Service A", "main")),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.updatePacticipant({
          pacticipantName: "ServiceA",
          mainBranch: "main",
          displayName: "Service A",
        });
        expect(result.name).toBe("ServiceA");
      }));

  it("PATCH /pacticipants/{name} – partially updates a pacticipant", () =>
    provider
      .addInteraction()
      .given("a pacticipant named ServiceA exists")
      .uponReceiving("a request to patch pacticipant ServiceA")
      .withRequest("PATCH", "/pacticipants/ServiceA", (b) => {
        b.headers(jsonHeaders).jsonBody(like({ mainBranch: "develop" }));
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(pacticipantBody("ServiceA", "Service A", "develop")),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.patchPacticipant({
          pacticipantName: "ServiceA",
          mainBranch: "develop",
        });
        expect(result.name).toBe("ServiceA");
      }));
});

describe("Branch & version management", () => {
  it("GET /pacticipants/{name}/versions/{version} – returns a specific version", () =>
    provider
      .addInteraction()
      .given("pacticipant ServiceA version 1.0.0 exists")
      .uponReceiving("a request to get version 1.0.0 of ServiceA")
      .withRequest("GET", "/pacticipants/ServiceA/versions/1.0.0", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            number: "1.0.0",
            createdAt: timestamp,
            _embedded: {
              branchVersions: eachLike({ name: "main" }, 0),
              tags: eachLike({ name: "main" }, 0),
            },
            _links: selfLink,
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getVersion({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
        });
        expect(result.number).toBe("1.0.0");
      }));
});

describe("Labels", () => {
  it("GET /labels – lists all labels", () =>
    provider
      .addInteraction()
      .given("labels exist")
      .uponReceiving("a request to list all labels")
      .withRequest("GET", "/labels", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: { labels: eachLike({ name: like("team-a") }, 0) },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listLabels();
        expect(Array.isArray(result._embedded.labels)).toBe(true);
      }));

  it("GET /pacticipants/{name}/labels/{label} – gets a label for a pacticipant", () =>
    provider
      .addInteraction()
      .given("pacticipant ServiceA has label team-a")
      .uponReceiving("a request to get label team-a for ServiceA")
      .withRequest("GET", "/pacticipants/ServiceA/labels/team-a", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            name: "team-a",
            createdAt: timestamp,
            _links: { self: titledLink, pacticipant: titledLink },
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getPacticipantLabel({
          pacticipantName: "ServiceA",
          labelName: "team-a",
        });
        expect(result.name).toBe("team-a");
      }));

  it("GET /pacticipants/label/{label} – lists pacticipants with a label", () =>
    provider
      .addInteraction()
      .given("pacticipants with label team-a exist")
      .uponReceiving("a request to list pacticipants with label team-a")
      .withRequest("GET", "/pacticipants/label/team-a", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: { pacticipants: eachLike({ name: like("ServiceA") }) },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listPacticipantsByLabel({
          labelName: "team-a",
        });
        expect(Array.isArray(result._embedded.pacticipants)).toBe(true);
      }));

  it("PUT /pacticipants/{name}/labels/{label} – adds a label to a pacticipant", () =>
    provider
      .addInteraction()
      .given("a pacticipant named ConsumerApp exists")
      .uponReceiving("a request to add label mobile to ConsumerApp")
      .withRequest("PUT", "/pacticipants/ConsumerApp/labels/mobile", (b) => {
        b.headers(jsonHeaders).jsonBody(like({}));
      })
      .willRespondWith(201, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            name: "mobile",
            createdAt: timestamp,
            _links: { self: titledLink, pacticipant: titledLink },
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.addLabel({
            pacticipantName: "ConsumerApp",
            labelName: "mobile",
          }),
        ).resolves.toBeDefined();
      }));

  it("DELETE /pacticipants/{name}/labels/{label} – removes a label", () =>
    provider
      .addInteraction()
      .given("pacticipant ConsumerApp has label mobile")
      .uponReceiving("a request to remove label mobile from ConsumerApp")
      .withRequest("DELETE", "/pacticipants/ConsumerApp/labels/mobile", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.removeLabel({
            pacticipantName: "ConsumerApp",
            labelName: "mobile",
          }),
        ).resolves.toBeUndefined();
      }));
});

describe("Branches & versions – list and update", () => {
  const versionLinks = {
    "pb:pacticipant": halLink,
    "pb:versions": eachLike({ href: "https://example.pactflow.io/versions" }),
    pacticipant: halLink,
    self: halLink,
    versions: eachLike({ href: "https://example.pactflow.io/versions" }),
  };

  it("GET /pacticipants/{name}/branches – lists branches", () =>
    provider
      .addInteraction()
      .given("a pacticipant named ServiceA with branch main exists")
      .uponReceiving("a request to list branches for ServiceA")
      .withRequest("GET", "/pacticipants/ServiceA/branches", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          page: pageBody,
          _embedded: { branches: eachLike({ name: like("main") }) },
          _links: {
            self: halLink,
            "pb:branches": eachLike({
              href: "https://example.pactflow.io/branches",
            }),
          },
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listBranches({
          pacticipantName: "ServiceA",
        });
        expect(Array.isArray(result._embedded.branches)).toBe(true);
      }));

  it("GET /pacticipants/{name}/branches/{branch} – retrieves a branch", () =>
    provider
      .addInteraction()
      .given("a pacticipant named ServiceA with branch main exists")
      .uponReceiving("a request to get branch main of ServiceA")
      .withRequest("GET", "/pacticipants/ServiceA/branches/main", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            name: "main",
            createdAt: timestamp,
            _links: { ...selfLink, "pb:latest-version": halLink },
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getBranch({
          pacticipantName: "ServiceA",
          branchName: "main",
        });
        expect(result.name).toBe("main");
      }));

  it("DELETE /pacticipants/{name}/branches/{branch} – deletes a branch", () =>
    provider
      .addInteraction()
      .given("a pacticipant named ServiceA with branch old-feature exists")
      .uponReceiving("a request to delete branch old-feature of ServiceA")
      .withRequest(
        "DELETE",
        "/pacticipants/ServiceA/branches/old-feature",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.deleteBranch({
            pacticipantName: "ServiceA",
            branchName: "old-feature",
          }),
        ).resolves.toBeUndefined();
      }));

  it("GET /pacticipants/{name}/branches/{branch}/versions – lists versions on a branch", () =>
    provider
      .addInteraction()
      .given("a pacticipant named ServiceA with branch main exists")
      .uponReceiving("a request to list versions on branch main of ServiceA")
      .withRequest(
        "GET",
        "/pacticipants/ServiceA/branches/main/versions",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: { versions: eachLike({ number: like("1.0.0") }) },
          _links: versionLinks,
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getBranchVersions({
          pacticipantName: "ServiceA",
          branchName: "main",
        });
        expect(Array.isArray(result._embedded.versions)).toBe(true);
      }));

  it("GET /pacticipants/{name}/versions – lists versions", () =>
    provider
      .addInteraction()
      .given("a pacticipant named ServiceA with versions exists")
      .uponReceiving("a request to list versions of ServiceA")
      .withRequest("GET", "/pacticipants/ServiceA/versions", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: { versions: eachLike({ number: like("1.0.0") }) },
          _links: versionLinks,
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listVersions({
          pacticipantName: "ServiceA",
        });
        expect(Array.isArray(result._embedded.versions)).toBe(true);
      }));

  it("PUT /pacticipants/{name}/versions/{version} – creates or updates a version", () =>
    provider
      .addInteraction()
      .given("a pacticipant named ServiceA exists")
      .uponReceiving("a request to update version 1.0.0 of ServiceA")
      .withRequest("PUT", "/pacticipants/ServiceA/versions/1.0.0", (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({ buildUrl: "https://ci.example.com/builds/42" }),
        );
      })
      .willRespondWith(201, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            number: "1.0.0",
            buildUrl: "https://ci.example.com/builds/42",
            createdAt: timestamp,
            _embedded: {
              branchVersions: eachLike({ name: "main" }, 0),
              tags: eachLike({ name: "main" }, 0),
            },
            _links: {
              ...selfLink,
              "pb:latest-verification-results-where-pacticipant-is-consumer":
                halLink,
              "pb:pact-versions": eachLike(
                { href: "https://example.pactflow.io/pact-versions" },
                0,
              ),
              "pb:pacticipant": halLink,
              "pb:tag": halLink,
              curies: eachLike({
                name: "pb",
                href: "https://example.pactflow.io/doc/{rel}",
                templated: true,
              }),
              "pb:record-deployment": eachLike(
                { href: "https://example.pactflow.io/record-deployment" },
                0,
              ),
              "pb:record-release": eachLike(
                { href: "https://example.pactflow.io/record-release" },
                0,
              ),
            },
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.updateVersion({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
          buildUrl: "https://ci.example.com/builds/42",
        });
        expect(result.number).toBe("1.0.0");
      }));
});

describe("Pacticipant – error responses", () => {
  it("POST /pacticipants – 400 for an invalid pacticipant name", () =>
    expectErrorStatus({
      description: "a request to create a pacticipant with an invalid name",
      method: "POST",
      path: "/pacticipants",
      body: like({ name: "" }),
      status: 400,
      call: (c) => c.createPacticipant({ name: "" }),
    }));

  it("GET /pacticipants/{name}/labels/{label} – 404 when the label is missing", () =>
    expectErrorStatus({
      description: "a request to get missing label unknown for ServiceA",
      state: "pacticipant ServiceA does not have label unknown",
      method: "GET",
      path: "/pacticipants/ServiceA/labels/unknown",
      status: 404,
      call: (c) =>
        c.getPacticipantLabel({
          pacticipantName: "ServiceA",
          labelName: "unknown",
        }),
    }));

  it("DELETE /pacticipants/{name}/labels/{label} – 404 when the label is missing", () =>
    expectErrorStatus({
      description: "a request to remove missing label unknown from ServiceA",
      state: "pacticipant ServiceA does not have label unknown",
      method: "DELETE",
      path: "/pacticipants/ServiceA/labels/unknown",
      status: 404,
      call: (c) =>
        c.removeLabel({ pacticipantName: "ServiceA", labelName: "unknown" }),
    }));

  // ── 409 Conflict ─────────────────────────────────────────────────────────
});

describe("Labels – update existing", () => {
  it("PUT /pacticipants/{name}/labels/{label} – 200 when the label already exists", () =>
    provider
      .addInteraction()
      .given("pacticipant ConsumerApp has label mobile")
      .uponReceiving("a request to add existing label mobile to ConsumerApp")
      .withRequest("PUT", "/pacticipants/ConsumerApp/labels/mobile", (b) => {
        b.headers(jsonHeaders).jsonBody(like({}));
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            name: "mobile",
            createdAt: timestamp,
            _links: { self: titledLink, pacticipant: titledLink },
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.addLabel({
          pacticipantName: "ConsumerApp",
          labelName: "mobile",
        });
        expect(result.name).toBe("mobile");
      }));
});
