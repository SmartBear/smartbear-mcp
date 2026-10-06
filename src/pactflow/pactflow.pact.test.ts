/**
 * Pact V4 consumer tests for PactflowClient.
 *
 * Covers all HTTP interactions exposed by PactflowClient:
 *   - Core: can-i-deploy, matrix, pacticipants, environments, deployments,
 *           releases, contracts, pacts, branches, metrics, AI entitlement
 *   - Environment CRUD
 *   - Pacticipant CRUD + update/patch
 *   - Branch & version management
 *   - Labels
 *   - Integrations & network
 *   - Webhooks
 *   - Secrets
 *   - User / settings / audit / team metrics
 *   - Admin: users, teams, roles, permissions, system accounts
 *   - BDCT (bi-directional contract testing)
 *
 * Each test creates its own ephemeral mock server via executeTest(), so there
 * is no shared beforeAll/afterAll server lifecycle — tests are fully isolated.
 *
 * Generated pact files land in ./pacts/ at the project root.
 *
 * Run with:
 *   npx vitest run src/tests/pactflow/pactflow.pact.test.ts
 */

import path from "node:path";
import { Matchers, PactV4 } from "@pact-foundation/pact";
import { describe, expect, it } from "vitest";
import { CacheService } from "../common/cache";
import { PactflowClient } from "./client";

const { like, eachLike, regex } = Matchers;

const provider = new PactV4({
  consumer: "smartbear-mcp",
  provider: "pactflow-application-saas",
  dir: path.resolve(process.cwd(), "pacts"),
  logLevel: "error",
});

async function createClient(baseUrl: string): Promise<PactflowClient> {
  const client = new PactflowClient();
  const mockServer = {
    getClientInfo: () => undefined,
    getCache: () => new CacheService(),
  } as any;
  await client.configure(mockServer, {
    base_url: baseUrl,
    token: "test-token",
  });
  return client;
}

// ── Helpers ────────────────────────────────────────────────────────────────

const authHeader = { Authorization: like("Bearer test-token") };
const jsonHeaders = {
  Authorization: like("Bearer test-token"),
  "Content-Type": regex("application/json.*", "application/json"),
};
const halJsonResponseHeaders = {
  "Content-Type": regex(
    "application/(hal\\+json|json)(;.*)?",
    "application/json",
  ),
};

// ── HAL response fixtures ──────────────────────────────────────────────────
// Bodies below carry every field the OpenAPI spec marks as required so the
// pacts exercise the full response contract, not just the fields the client reads.

const timestamp = like("2024-01-01T00:00:00.000Z");
const halLink = like({ href: "https://example.pactflow.io/resource" });
const selfLink = { self: halLink };
const titledLink = like({
  title: "Resource",
  name: "resource",
  href: "https://example.pactflow.io/resource",
});

const embeddedPacticipant = {
  name: "ServiceA",
  _links: like({
    self: { href: "https://example.pactflow.io/pacticipants/ServiceA" },
  }),
};
const embeddedVersion = {
  number: "1.0.0",
  _links: like({
    self: { href: "https://example.pactflow.io/versions/1.0.0" },
  }),
};

// Body for POST …/deployed-versions|released-versions/environment/{id}.
function environmentRecordBody(
  flag: "currentlyDeployed" | "currentlySupported",
) {
  return {
    uuid: "00000000-0000-0000-0000-000000000030",
    createdAt: timestamp,
    [flag]: true,
    _links: selfLink,
    _embedded: {
      environment: {
        uuid: "00000000-0000-0000-0000-000000000001",
        name: "production",
        displayName: "Production",
        production: true,
        createdAt: timestamp,
        _links: like({}),
      },
      pacticipant: embeddedPacticipant,
      version: embeddedVersion,
    },
  };
}

function webhookResponseBody(uuid: string) {
  return {
    uuid,
    description: "Trigger CI build",
    events: eachLike({ name: "contract_published" }),
    request: like({ method: "POST", url: "https://ci.example.com/trigger" }),
    createdAt: timestamp,
    _links: {
      ...selfLink,
      "pb:execute": halLink,
      "pb:webhooks": halLink,
    },
  };
}

// Body for POST /webhooks/execute and POST /webhooks/{id}/execute.
const webhookExecutionBody = {
  success: true,
  logs: "Webhook executed successfully",
  request: like({
    url: "https://ci.example.com/trigger",
    headers: like({}),
  }),
  _links: { "try-again": halLink },
};

function secretBody(uuid: string, name: string) {
  return {
    uuid,
    name,
    description: "CI token",
    createdAt: timestamp,
    _links: selfLink,
  };
}

function roleBody(uuid: string, name: string) {
  return {
    uuid,
    name,
    systemDefined: false,
    createdAt: timestamp,
    permissions: eachLike({
      uuid: "00000000-0000-0000-0000-000000000020",
      scope: "contract_data:read:*",
      label: "Read contract data",
      group: "Contract data",
      description: "Read all contract data",
    }),
    _actions: eachLike({
      name: "update",
      title: "Update role",
      method: "PUT",
      href: `https://example.pactflow.io/admin/roles/${uuid}`,
    }),
    _links: selfLink,
  };
}

function userBody(uuid: string, email: string, type: 0 | 1 = 0) {
  return {
    uuid,
    email,
    active: true,
    createdAt: timestamp,
    type,
    typeDescription: type === 0 ? "User" : "System Account",
    _links: selfLink,
    _embedded: {
      roles: eachLike({ uuid: "00000000-0000-0000-0000-000000000007" }),
      teams: eachLike({ uuid: "00000000-0000-0000-0000-000000000005" }),
    },
  };
}

// `members` is only part of the Team schema (GET); CreatedTeam (POST/PUT)
// forbids additional `_embedded` properties.
function teamBody(uuid: string, name: string, includeMembers = true) {
  return {
    uuid,
    name,
    numberOfMembers: 1,
    createdAt: timestamp,
    _embedded: {
      administrators: eachLike({
        uuid: "00000000-0000-0000-0000-000000000012",
      }),
      environments: eachLike({ uuid: "00000000-0000-0000-0000-000000000001" }),
      ...(includeMembers && {
        members: eachLike({ uuid: "00000000-0000-0000-0000-000000000012" }),
      }),
      pacticipants: eachLike({ name: "ServiceA" }),
    },
    _links: selfLink,
  };
}

function environmentBody(
  uuid: string,
  name: string,
  production: boolean,
  displayName: string,
) {
  return {
    uuid,
    name,
    displayName,
    production,
    createdAt: timestamp,
    _links: {
      ...selfLink,
      "pb:currently-deployed-deployed-versions": halLink,
      "pb:currently-supported-released-versions": halLink,
      "pb:environments": halLink,
    },
  };
}

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
    _embedded: { labels: eachLike({ name: "team-a" }) },
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

// ════════════════════════════════════════════════════════════════════════════
// Core
// ════════════════════════════════════════════════════════════════════════════

describe("Core", () => {
  it("GET /matrix – returns pact verification matrix with summary", () =>
    provider
      .addInteraction()
      .given("pacticipant ServiceA version 1.0.0 exists")
      .uponReceiving("a request to get the pact matrix for ServiceA 1.0.0")
      .withRequest("GET", "/matrix", (builder) => {
        builder
          .query({
            latestby: "cvp",
            limit: "100",
            "q[]pacticipant": "ServiceA",
            "q[]version": "1.0.0",
          })
          .headers({ Authorization: like("Bearer test-token") });
      })
      .willRespondWith(200, (builder) => {
        builder.headers(halJsonResponseHeaders).jsonBody({
          matrix: eachLike(like({})),
          notices: eachLike(like({})),
          summary: like({
            reason: "All verification results are successful",
            success: 0,
            unknown: 0,
          }),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getMatrix({
          latestby: "cvp",
          limit: 100,
          q: [{ pacticipant: "ServiceA", version: "1.0.0" }],
        });
        expect(result.summary).toBeDefined();
        expect(result.matrix).toBeDefined();
      }));

  it("GET /can-i-deploy – checks if a pacticipant version can be deployed", () =>
    provider
      .addInteraction()
      .given(
        "ServiceA version 1.0.0 is deployed to production environment 00000000-0000-0000-0000-000000000001",
      )
      .uponReceiving(
        "a request to check if ServiceA 1.0.0 can be deployed to production",
      )
      .withRequest("GET", "/can-i-deploy", (b) => {
        b.query({
          pacticipant: "ServiceA",
          version: "1.0.0",
          environment: "production",
        }).headers({ Authorization: like("Bearer test-token") });
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            summary: like({ reason: like("") }),
            matrix: like([]),
            notices: eachLike({
              text: "All required verification results are published and successful",
              type: "info",
            }),
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.canIDeploy({
          pacticipant: "ServiceA",
          version: "1.0.0",
          environment: "production",
        });
        expect(result.summary).toBeDefined();
      }));

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

  it("GET /environments – returns list of environments", () =>
    provider
      .addInteraction()
      .given(
        "an environment with uuid 00000000-0000-0000-0000-000000000001 exists",
      )
      .uponReceiving("a request to list all environments")
      .withRequest("GET", "/environments", (builder) => {
        builder.headers({ Authorization: like("Bearer test-token") });
      })
      .willRespondWith(200, (builder) => {
        builder.headers(halJsonResponseHeaders).jsonBody({
          _embedded: {
            environments: eachLike({
              name: like("production"),
              uuid: like("00000000-0000-0000-0000-000000000001"),
            }),
          },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listEnvironments();
        expect(Array.isArray(result._embedded.environments)).toBe(true);
        expect(result._embedded.environments.length).toBeGreaterThanOrEqual(1);
        expect(result._embedded.environments[0].name).toBeDefined();
        expect(result._embedded.environments[0].uuid).toBeDefined();
      }));

  it("GET /environments/{uuid} – returns environment details", () =>
    provider
      .addInteraction()
      .given(
        "an environment with uuid 00000000-0000-0000-0000-000000000001 exists",
      )
      .uponReceiving(
        "a request to get environment 00000000-0000-0000-0000-000000000001",
      )
      .withRequest(
        "GET",
        "/environments/00000000-0000-0000-0000-000000000001",
        (builder) => {
          builder.headers({ Authorization: like("Bearer test-token") });
        },
      )
      .willRespondWith(200, (builder) => {
        builder
          .headers(halJsonResponseHeaders)
          .jsonBody(
            like(
              environmentBody(
                "00000000-0000-0000-0000-000000000001",
                "production",
                true,
                "Production",
              ),
            ),
          );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getEnvironment({
          environmentId: "00000000-0000-0000-0000-000000000001",
        });
        expect(result.name).toBe("production");
        expect(result.uuid).toBe("00000000-0000-0000-0000-000000000001");
        expect(result.production).toBe(true);
      }));

  it("POST /deployed-versions – records a deployment and returns 201", () =>
    provider
      .addInteraction()
      .given(
        "pacticipant ServiceA version 1.0.0 and environment 00000000-0000-0000-0000-000000000001 exist",
      )
      .uponReceiving(
        "a request to record a deployment of ServiceA 1.0.0 to environment 00000000-0000-0000-0000-000000000001",
      )
      .withRequest(
        "POST",
        "/pacticipants/ServiceA/versions/1.0.0/deployed-versions/environment/00000000-0000-0000-0000-000000000001",
        (builder) => {
          builder
            .headers({
              Authorization: like("Bearer test-token"),
              "Content-Type": regex("application/json.*", "application/json"),
            })
            .jsonBody({});
        },
      )
      .willRespondWith(201, (builder) => {
        builder
          .headers(halJsonResponseHeaders)
          .jsonBody(like(environmentRecordBody("currentlyDeployed")));
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.recordDeployment({
            pacticipantName: "ServiceA",
            versionNumber: "1.0.0",
            environmentId: "00000000-0000-0000-0000-000000000001",
          }),
        ).resolves.toBeDefined();
      }));

  it("POST /released-versions – records a release and returns 201", () =>
    provider
      .addInteraction()
      .given(
        "pacticipant ServiceA version 1.0.0 and environment 00000000-0000-0000-0000-000000000001 exist",
      )
      .uponReceiving(
        "a request to record a release of ServiceA 1.0.0 to environment 00000000-0000-0000-0000-000000000001",
      )
      .withRequest(
        "POST",
        "/pacticipants/ServiceA/versions/1.0.0/released-versions/environment/00000000-0000-0000-0000-000000000001",
        (builder) => {
          builder
            .headers({
              Authorization: like("Bearer test-token"),
              "Content-Type": regex("application/json.*", "application/json"),
            })
            .jsonBody({});
        },
      )
      .willRespondWith(201, (builder) => {
        builder
          .headers(halJsonResponseHeaders)
          .jsonBody(like(environmentRecordBody("currentlySupported")));
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.recordRelease({
            pacticipantName: "ServiceA",
            versionNumber: "1.0.0",
            environmentId: "00000000-0000-0000-0000-000000000001",
          }),
        ).resolves.toBeDefined();
      }));

  it("GET /deployed-versions/currently-deployed – returns currently deployed versions", () =>
    provider
      .addInteraction()
      .given(
        "an environment with uuid 00000000-0000-0000-0000-000000000001 exists",
      )
      .uponReceiving(
        "a request to get currently deployed versions for environment 00000000-0000-0000-0000-000000000001",
      )
      .withRequest(
        "GET",
        "/environments/00000000-0000-0000-0000-000000000001/deployed-versions/currently-deployed",
        (builder) => {
          builder.headers({ Authorization: like("Bearer test-token") });
        },
      )
      .willRespondWith(200, (builder) => {
        builder
          .headers(halJsonResponseHeaders)
          .jsonBody({ _embedded: { deployedVersions: [] }, _links: like({}) });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getCurrentlyDeployed({
          environmentId: "00000000-0000-0000-0000-000000000001",
        });
        expect(Array.isArray(result._embedded.deployedVersions)).toBe(true);
      }));

  it("POST /contracts/publish – publishes consumer contracts", () => {
    const publishBody = {
      pacticipantName: "ConsumerApp",
      pacticipantVersionNumber: "1.0.0",
      contracts: [
        {
          consumerName: "ConsumerApp",
          providerName: "ProviderAPI",
          content: "eyJjb25zdW1lciI6IHsibmFtZSI6ICJDb25zdW1lckFwcCJ9fQ==",
          contentType: "application/json" as const,
          specification: "pact" as const,
        },
      ],
      branch: "main",
    };

    return provider
      .addInteraction()
      .given("a pacticipant named ConsumerApp exists")
      .uponReceiving(
        "a request to publish consumer contracts for ConsumerApp 1.0.0",
      )
      .withRequest("POST", "/contracts/publish", (builder) => {
        builder
          .headers({
            Authorization: like("Bearer test-token"),
            "Content-Type": regex("application/json.*", "application/json"),
          })
          .jsonBody(like(publishBody));
      })
      .willRespondWith(200, (builder) => {
        builder.headers(halJsonResponseHeaders).jsonBody(
          like({
            logs: [],
            notices: [],
            _embedded: like({}),
            _links: like({}),
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.publishContracts(publishBody);
        expect(result).toBeDefined();
        expect(result._embedded).toBeDefined();
      });
  });

  it("POST /pacts/provider/{name}/for-verification – returns pacts to verify", () =>
    provider
      .addInteraction()
      .given("a pacticipant named ProviderAPI exists")
      .uponReceiving("a request to get pacts for verification of ProviderAPI")
      .withRequest(
        "POST",
        "/pacts/provider/ProviderAPI/for-verification",
        (builder) => {
          builder
            .headers({
              Authorization: like("Bearer test-token"),
              "Content-Type": regex("application/json.*", "application/json"),
            })
            .jsonBody(
              like({
                consumerVersionSelectors: [{ mainBranch: true }],
                includePendingStatus: true,
              }),
            );
        },
      )
      .willRespondWith(200, (builder) => {
        builder
          .headers(halJsonResponseHeaders)
          .jsonBody({ _embedded: { pacts: [] }, _links: like({}) });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getPactsForVerification({
          providerName: "ProviderAPI",
          consumerVersionSelectors: [{ mainBranch: true }],
          includePendingStatus: true,
        });
        expect(Array.isArray(result._embedded.pacts)).toBe(true);
      }));

  it("GET /metrics – returns workspace-wide metrics", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to get workspace metrics")
      .withRequest("GET", "/metrics", (builder) => {
        builder.headers({ Authorization: like("Bearer test-token") });
      })
      .willRespondWith(200, (builder) => {
        builder.headers(halJsonResponseHeaders).jsonBody(
          like({
            interactions: like({
              latestInteractionsCount: 42,
              latestMessagesCount: 8,
              latestInteractionsAndMessagesCount: 50,
            }),
            pacticipants: like({
              count: 15,
              withMainBranchSetCount: 12,
            }),
            integrations: like({ count: 7 }),
            pactPublications: like({
              count: 42,
              first: like("2023-01-01T00:00:00.000Z"),
              last: like("2024-01-01T00:00:00.000Z"),
            }),
            verificationResults: like({
              count: 1250,
              successCount: 1200,
              failureCount: 50,
              distinctCount: 900,
              first: like("2023-01-01T00:00:00.000Z"),
              last: like("2024-01-01T00:00:00.000Z"),
            }),
            crossContractComparisons: like({ count: 3 }),
            deployedVersions: like({
              count: 20,
              userCreatedCount: 18,
              currentlyDeployedCount: 5,
            }),
            environments: like({ count: 3 }),
            // The spec hardcodes matrix.count to -1 (deprecated).
            matrix: like({ count: -1 }),
            pactVersions: like({ count: 40 }),
            pactRevisionsPerConsumerVersion: like({
              distribution: like({ "1": 40 }),
            }),
            pacticipantVersions: like({
              count: 60,
              withUserCreatedBranchCount: 10,
              withBranchCount: 50,
              withBranchSetCount: 50,
            }),
            providerContractPublications: like({ count: 5 }),
            providerContractVersions: like({ count: 5 }),
            providerContractSelfVerifications: like({ count: 5 }),
            releasedVersions: like({ count: 4, currentlySupportedCount: 2 }),
            secrets: like({ count: 2, countsByTeam: eachLike(2) }),
            tags: like({
              count: 30,
              distinctCount: 6,
              distinctWithPacticipantCount: 6,
            }),
            teams: like({ count: 3 }),
            triggeredWebhooks: like({ count: 12 }),
            users: like({ activeRegularCount: 8, activeSystemCount: 2 }),
            verificationResultsPerPactVersion: like({
              distribution: like({ "1": 40 }),
            }),
            webhookExecutions: like({ count: 12 }),
            webhooks: like({ count: 4 }),
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getMetrics();
        expect(result.interactions).toBeDefined();
        expect(result.pacticipants).toBeDefined();
        expect(result.integrations).toBeDefined();
      }));
});

// ════════════════════════════════════════════════════════════════════════════
// Environment management
// ════════════════════════════════════════════════════════════════════════════

describe("Environment management", () => {
  it("POST /environments – creates an environment", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to create a production environment")
      .withRequest("POST", "/environments", (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({
            name: "production",
            production: true,
            displayName: "Production",
          }),
        );
      })
      .willRespondWith(201, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(
            environmentBody(
              "00000000-0000-0000-0000-000000000003",
              "production",
              true,
              "Production",
            ),
          ),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.createEnvironment({
          name: "production",
          production: true,
          displayName: "Production",
        });
        expect(result.uuid).toBeDefined();
        expect(result.name).toBe("production");
      }));

  it("PUT /environments/{uuid} – updates an environment", () =>
    provider
      .addInteraction()
      .given(
        "an environment with uuid 00000000-0000-0000-0000-000000000002 exists",
      )
      .uponReceiving(
        "a request to update environment 00000000-0000-0000-0000-000000000002",
      )
      .withRequest(
        "PUT",
        "/environments/00000000-0000-0000-0000-000000000002",
        (b) => {
          b.headers(jsonHeaders).jsonBody(
            like({
              name: "staging",
              production: false,
              displayName: "Staging",
            }),
          );
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(
            environmentBody(
              "00000000-0000-0000-0000-000000000002",
              "staging",
              false,
              "Staging",
            ),
          ),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.updateEnvironment({
          environmentId: "00000000-0000-0000-0000-000000000002",
          name: "staging",
          production: false,
          displayName: "Staging",
        });
        expect(result.uuid).toBe("00000000-0000-0000-0000-000000000002");
      }));

  it("DELETE /environments/{uuid} – deletes an environment", () =>
    provider
      .addInteraction()
      .given(
        "an environment with uuid 00000000-0000-0000-0000-000000000002 exists",
      )
      .uponReceiving(
        "a request to delete environment 00000000-0000-0000-0000-000000000002",
      )
      .withRequest(
        "DELETE",
        "/environments/00000000-0000-0000-0000-000000000002",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.deleteEnvironment({
            environmentId: "00000000-0000-0000-0000-000000000002",
          }),
        ).resolves.toBeUndefined();
      }));

  it("GET /environments/{envId}/released-versions/currently-supported – returns currently supported", () =>
    provider
      .addInteraction()
      .given(
        "an environment with uuid 00000000-0000-0000-0000-000000000002 exists",
      )
      .uponReceiving(
        "a request to get currently supported versions for environment 00000000-0000-0000-0000-000000000002",
      )
      .withRequest(
        "GET",
        "/environments/00000000-0000-0000-0000-000000000002/released-versions/currently-supported",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: { releasedVersions: [] },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getCurrentlySupported({
          environmentId: "00000000-0000-0000-0000-000000000002",
        });
        expect(Array.isArray(result._embedded.releasedVersions)).toBe(true);
      }));
});

// ════════════════════════════════════════════════════════════════════════════
// Pacticipant CRUD
// ════════════════════════════════════════════════════════════════════════════

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

// ════════════════════════════════════════════════════════════════════════════
// Branch & version management
// ════════════════════════════════════════════════════════════════════════════

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
              branchVersions: eachLike({ name: "main" }),
              tags: eachLike({ name: "main" }),
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

  it("GET /pacticipants/{name}/versions/{ver}/deployed-versions/environment/{envId} – returns deployed versions", () =>
    provider
      .addInteraction()
      .given(
        "pacticipant ServiceA version 1.0.0 is deployed to environment 00000000-0000-0000-0000-000000000002",
      )
      .uponReceiving(
        "a request to get deployed versions for ServiceA 1.0.0 in 00000000-0000-0000-0000-000000000002",
      )
      .withRequest(
        "GET",
        "/pacticipants/ServiceA/versions/1.0.0/deployed-versions/environment/00000000-0000-0000-0000-000000000002",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: {
            deployedVersions: eachLike({ currentlyDeployed: like(true) }),
          },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getDeployedVersions({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
          environmentId: "00000000-0000-0000-0000-000000000002",
        });
        expect(Array.isArray(result._embedded.deployedVersions)).toBe(true);
      }));

  it("GET /pacticipants/{name}/versions/{ver}/released-versions/environment/{envId} – returns released versions", () =>
    provider
      .addInteraction()
      .given(
        "pacticipant ServiceA version 1.0.0 is released in environment 00000000-0000-0000-0000-000000000002",
      )
      .uponReceiving(
        "a request to get released versions for ServiceA 1.0.0 in 00000000-0000-0000-0000-000000000002",
      )
      .withRequest(
        "GET",
        "/pacticipants/ServiceA/versions/1.0.0/released-versions/environment/00000000-0000-0000-0000-000000000002",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: {
            releasedVersions: eachLike({ currentlySupported: like(true) }),
          },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getReleasedVersions({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
          environmentId: "00000000-0000-0000-0000-000000000002",
        });
        expect(Array.isArray(result._embedded.releasedVersions)).toBe(true);
      }));
});

// ════════════════════════════════════════════════════════════════════════════
// Labels
// ════════════════════════════════════════════════════════════════════════════

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
          _embedded: { labels: eachLike({ name: like("team-a") }) },
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

// ════════════════════════════════════════════════════════════════════════════
// Integrations & network
// ════════════════════════════════════════════════════════════════════════════

describe("Integrations & network", () => {
  it("DELETE /integrations/provider/{prov}/consumer/{con} – deletes an integration", () =>
    provider
      .addInteraction()
      .given("an integration between ProviderAPI and ConsumerApp exists")
      .uponReceiving(
        "a request to delete integration between ProviderAPI and ConsumerApp",
      )
      .withRequest(
        "DELETE",
        "/integrations/provider/ProviderAPI/consumer/ConsumerApp",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.deleteIntegration({
            providerName: "ProviderAPI",
            consumerName: "ConsumerApp",
          }),
        ).resolves.toBeUndefined();
      }));

  it("DELETE /integrations – deletes all integrations", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to delete all integrations")
      .withRequest("DELETE", "/integrations", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(client.deleteAllIntegrations()).resolves.toBeUndefined();
      }));

  it("GET /pacticipant/{name}/network – returns integration network", () =>
    provider
      .addInteraction()
      .given("pacticipant ServiceA has a network")
      .uponReceiving("a request to get the network for ServiceA")
      .withRequest("GET", "/pacticipant/ServiceA/network", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          integrations: like([]),
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getPacticipantNetwork({
          pacticipantName: "ServiceA",
        });
        expect(Array.isArray(result.integrations)).toBe(true);
      }));
});

// ════════════════════════════════════════════════════════════════════════════
// Webhooks
// ════════════════════════════════════════════════════════════════════════════

describe("Webhooks", () => {
  it("GET /webhooks – lists all webhooks", () =>
    provider
      .addInteraction()
      .given("webhooks exist")
      .uponReceiving("a request to list all webhooks")
      .withRequest("GET", "/webhooks", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: { webhooks: eachLike({ uuid: like("wh-uuid-1") }) },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listWebhooks();
        expect(Array.isArray(result._embedded.webhooks)).toBe(true);
      }));

  it("GET /webhooks/{id} – retrieves a specific webhook", () =>
    provider
      .addInteraction()
      .given("a webhook with uuid wh-uuid-1 exists")
      .uponReceiving("a request to get webhook wh-uuid-1")
      .withRequest("GET", "/webhooks/wh-uuid-1", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(webhookResponseBody("wh-uuid-1")),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getWebhook({ webhookId: "wh-uuid-1" });
        expect(result.uuid).toBe("wh-uuid-1");
      }));

  it("POST /webhooks – creates a webhook", () => {
    const webhookBody = {
      description: "Trigger CI build",
      events: [{ name: "contract_published" }],
      request: {
        method: "POST" as const,
        url: "https://ci.example.com/trigger",
      },
    };
    return provider
      .addInteraction()
      .uponReceiving("a request to create a webhook")
      .withRequest("POST", "/webhooks", (b) => {
        b.headers(jsonHeaders).jsonBody(like(webhookBody));
      })
      .willRespondWith(201, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            ...webhookResponseBody("wh-uuid-new"),
            ...webhookBody,
            events: eachLike({ name: "contract_published" }),
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.createWebhook(webhookBody as any);
        expect(result.uuid).toBeDefined();
      });
  });

  it("DELETE /webhooks/{id} – deletes a webhook", () =>
    provider
      .addInteraction()
      .given("a webhook with uuid wh-uuid-1 exists")
      .uponReceiving("a request to delete webhook wh-uuid-1")
      .withRequest("DELETE", "/webhooks/wh-uuid-1", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.deleteWebhook({ webhookId: "wh-uuid-1" }),
        ).resolves.toBeUndefined();
      }));

  it("POST /webhooks/execute – fires all webhooks", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to execute all webhooks")
      .withRequest("POST", "/webhooks/execute", (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({
            request: like({
              method: "POST",
              url: "https://ci.example.com/trigger",
            }),
          }),
        );
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(like(webhookExecutionBody));
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/webhooks/execute`, {
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            request: { method: "POST", url: "https://ci.example.com/trigger" },
          }),
        });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.success).toBeDefined();
      }));

  it("POST /webhooks/{id}/execute – fires a specific webhook", () =>
    provider
      .addInteraction()
      .given("a webhook with uuid wh-uuid-1 exists")
      .uponReceiving("a request to execute webhook wh-uuid-1")
      .withRequest("POST", "/webhooks/wh-uuid-1/execute", (b) => {
        b.headers(jsonHeaders).jsonBody(like({}));
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(like(webhookExecutionBody));
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.executeWebhook({ webhookId: "wh-uuid-1" }),
        ).resolves.toBeDefined();
      }));
});

// ════════════════════════════════════════════════════════════════════════════
// Secrets
// ════════════════════════════════════════════════════════════════════════════

describe("Secrets", () => {
  it("GET /secrets – lists all secrets", () =>
    provider
      .addInteraction()
      .given("secrets exist")
      .uponReceiving("a request to list all secrets")
      .withRequest("GET", "/secrets", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: {
            secrets: eachLike({
              uuid: like("sec-uuid-1"),
              name: like("CI_TOKEN"),
            }),
          },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listSecrets();
        expect(Array.isArray(result._embedded.secrets)).toBe(true);
      }));

  it("GET /secrets/{id} – retrieves a secret", () =>
    provider
      .addInteraction()
      .given("a secret with uuid sec-uuid-1 exists")
      .uponReceiving("a request to get secret sec-uuid-1")
      .withRequest("GET", "/secrets/sec-uuid-1", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(secretBody("sec-uuid-1", "CI_TOKEN")),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getSecret({ secretId: "sec-uuid-1" });
        expect(result.uuid).toBe("sec-uuid-1");
      }));

  it("PUT /secrets/{id} – updates a secret", () =>
    provider
      .addInteraction()
      .given("a secret with uuid sec-uuid-1 exists")
      .uponReceiving("a request to update secret sec-uuid-1")
      .withRequest("PUT", "/secrets/sec-uuid-1", (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({ name: "MYTOKEN", value: "new-s3cr3t" }),
        );
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(secretBody("sec-uuid-1", "MYTOKEN")),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.updateSecret({
            secretId: "sec-uuid-1",
            name: "MYTOKEN",
            value: "new-s3cr3t",
          }),
        ).resolves.toBeDefined();
      }));

  it("DELETE /secrets/{id} – deletes a secret", () =>
    provider
      .addInteraction()
      .given("a secret with uuid sec-uuid-1 exists")
      .uponReceiving("a request to delete secret sec-uuid-1")
      .withRequest("DELETE", "/secrets/sec-uuid-1", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.deleteSecret({ secretId: "sec-uuid-1" }),
        ).resolves.toBeUndefined();
      }));
});

// ════════════════════════════════════════════════════════════════════════════
// User, settings & audit
// ════════════════════════════════════════════════════════════════════════════

describe("User, settings & audit", () => {
  it("GET /user – returns the current user", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to get the current user")
      .withRequest("GET", "/user", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(
            userBody(
              "00000000-0000-0000-0000-000000000012",
              "user@example.com",
            ),
          ),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getCurrentUser();
        expect(result.email).toBe("user@example.com");
      }));

  it("GET /settings/tokens – lists API tokens", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to list API tokens")
      .withRequest("GET", "/settings/tokens", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: {
            items: eachLike({
              uuid: like("00000000-0000-0000-0000-000000000009"),
              description: like("CI token"),
            }),
          },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listTokens();
        expect(Array.isArray(result._embedded.items)).toBe(true);
      }));

  it("POST /settings/tokens/{id}/regenerate – regenerates a token", () =>
    provider
      .addInteraction()
      .given("API token 00000000-0000-0000-0000-000000000009 exists")
      .uponReceiving(
        "a request to regenerate token 00000000-0000-0000-0000-000000000009",
      )
      .withRequest(
        "POST",
        "/settings/tokens/00000000-0000-0000-0000-000000000009/regenerate",
        (b) => {
          b.headers(jsonHeaders).jsonBody(like({}));
        },
      )
      .willRespondWith(201, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            uuid: "00000000-0000-0000-0000-000000000009",
            value: "new-token-value",
            description: "CI token",
            readOnly: false,
            _links: { ...selfLink, "pb:regenerate": halLink },
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.regenerateToken({
          tokenId: "00000000-0000-0000-0000-000000000009",
        });
        expect(result.value).toBeDefined();
      }));

  it("GET /preferences/current-user – returns user preferences", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to get current user preferences")
      .withRequest("GET", "/preferences/current-user", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: { preferences: [] },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getUserPreferences();
        expect(result._embedded).toBeDefined();
      }));

  it("GET /preferences/system – returns system preferences", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to get system preferences")
      .withRequest("GET", "/preferences/system", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: { preferences: [] },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getSystemPreferences();
        expect(result._embedded).toBeDefined();
      }));

  it("GET /audit – returns the audit log", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to get the audit log")
      .withRequest("GET", "/audit", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          events: [],
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getAuditLog({});
        expect(result.events).toBeDefined();
      }));

  it("GET /metrics/teams – returns team metrics", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to get team metrics")
      .withRequest("GET", "/metrics/teams", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          teams: like([{ name: "Platform Team" }]),
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getTeamMetrics();
        expect(Array.isArray(result.teams)).toBe(true);
      }));
});

// ════════════════════════════════════════════════════════════════════════════
// Admin – Users
// ════════════════════════════════════════════════════════════════════════════

describe("Admin – Users", () => {
  it("GET /admin/users – lists admin users", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to list admin users")
      .withRequest("GET", "/admin/users", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          users: eachLike({
            uuid: like("00000000-0000-0000-0000-000000000012"),
          }),
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listAdminUsers({});
        expect(Array.isArray(result.users)).toBe(true);
      }));

  it("GET /admin/users/{id} – retrieves an admin user", () =>
    provider
      .addInteraction()
      .given("admin user 00000000-0000-0000-0000-000000000012 exists")
      .uponReceiving(
        "a request to get admin user 00000000-0000-0000-0000-000000000012",
      )
      .withRequest(
        "GET",
        "/admin/users/00000000-0000-0000-0000-000000000012",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(
            userBody(
              "00000000-0000-0000-0000-000000000012",
              "admin@example.com",
            ),
          ),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getAdminUser({
          userId: "00000000-0000-0000-0000-000000000012",
        });
        expect(result.email).toBe("admin@example.com");
      }));

  it("POST /admin/users – creates an admin user", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to create admin user new@example.com")
      .withRequest("POST", "/admin/users", (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({ email: "new@example.com", name: "New User" }),
        );
      })
      .willRespondWith(201, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(
            userBody("00000000-0000-0000-0000-000000000010", "new@example.com"),
          ),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.createAdminUser({
          email: "new@example.com",
          name: "New User",
        });
        expect(result.uuid).toBeDefined();
      }));

  it("PUT /admin/users/{id} – updates an admin user", () =>
    provider
      .addInteraction()
      .given("admin user 00000000-0000-0000-0000-000000000012 exists")
      .uponReceiving(
        "a request to update admin user 00000000-0000-0000-0000-000000000012",
      )
      .withRequest(
        "PUT",
        "/admin/users/00000000-0000-0000-0000-000000000012",
        (b) => {
          b.headers(jsonHeaders).jsonBody(
            like({ name: "Updated Name", active: false }),
          );
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            ...userBody(
              "00000000-0000-0000-0000-000000000012",
              "admin@example.com",
            ),
            active: false,
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.updateAdminUser({
            userId: "00000000-0000-0000-0000-000000000012",
            name: "Updated Name",
            active: false,
          }),
        ).resolves.toBeDefined();
      }));

  it("DELETE /admin/users/{id} – deletes an admin user", () =>
    provider
      .addInteraction()
      .given("admin user 00000000-0000-0000-0000-000000000012 exists")
      .uponReceiving(
        "a request to delete admin user 00000000-0000-0000-0000-000000000012",
      )
      .withRequest(
        "DELETE",
        "/admin/users/00000000-0000-0000-0000-000000000012",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.deleteAdminUser({
            userId: "00000000-0000-0000-0000-000000000012",
          }),
        ).resolves.toBeUndefined();
      }));

  it("PUT /admin/users/{id}/roles – replaces all roles for a user", () =>
    provider
      .addInteraction()
      .given(
        "admin user 00000000-0000-0000-0000-000000000012 and role 00000000-0000-0000-0000-000000000007 exist",
      )
      .uponReceiving(
        "a request to set roles for user 00000000-0000-0000-0000-000000000012",
      )
      .withRequest(
        "PUT",
        "/admin/users/00000000-0000-0000-0000-000000000012/roles",
        (b) => {
          b.headers(jsonHeaders).jsonBody(
            like({ roles: ["00000000-0000-0000-0000-000000000007"] }),
          );
        },
      )
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.setUserRoles({
            userId: "00000000-0000-0000-0000-000000000012",
            roles: ["00000000-0000-0000-0000-000000000007"],
          }),
        ).resolves.toBeUndefined();
      }));

  it("PUT /admin/users/{id}/roles/{roleId} – adds a role to a user", () =>
    provider
      .addInteraction()
      .given(
        "admin user 00000000-0000-0000-0000-000000000012 and role 00000000-0000-0000-0000-000000000007 exist",
      )
      .uponReceiving(
        "a request to add role 00000000-0000-0000-0000-000000000007 to user 00000000-0000-0000-0000-000000000012",
      )
      .withRequest(
        "PUT",
        "/admin/users/00000000-0000-0000-0000-000000000012/roles/00000000-0000-0000-0000-000000000007",
        (b) => {
          b.headers(jsonHeaders).jsonBody(like({}));
        },
      )
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.addRoleToUser({
            userId: "00000000-0000-0000-0000-000000000012",
            roleId: "00000000-0000-0000-0000-000000000007",
          }),
        ).resolves.toBeUndefined();
      }));

  it("DELETE /admin/users/{id}/roles/{roleId} – removes a role from a user", () =>
    provider
      .addInteraction()
      .given(
        "admin user 00000000-0000-0000-0000-000000000012 has role 00000000-0000-0000-0000-000000000007",
      )
      .uponReceiving(
        "a request to remove role 00000000-0000-0000-0000-000000000007 from user 00000000-0000-0000-0000-000000000012",
      )
      .withRequest(
        "DELETE",
        "/admin/users/00000000-0000-0000-0000-000000000012/roles/00000000-0000-0000-0000-000000000007",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.removeRoleFromUser({
            userId: "00000000-0000-0000-0000-000000000012",
            roleId: "00000000-0000-0000-0000-000000000007",
          }),
        ).resolves.toBeUndefined();
      }));
});

// ════════════════════════════════════════════════════════════════════════════
// Admin – Teams
// ════════════════════════════════════════════════════════════════════════════

describe("Admin – Teams", () => {
  it("GET /admin/teams – lists all teams", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to list admin teams")
      .withRequest("GET", "/admin/teams", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          teams: like([
            {
              uuid: "00000000-0000-0000-0000-000000000005",
              name: "Infra",
            },
          ]),
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listAdminTeams({});
        expect(Array.isArray(result.teams)).toBe(true);
      }));

  it("GET /admin/teams/{id} – retrieves a team", () =>
    provider
      .addInteraction()
      .given("admin team 00000000-0000-0000-0000-000000000005 exists")
      .uponReceiving(
        "a request to get admin team 00000000-0000-0000-0000-000000000005",
      )
      .withRequest(
        "GET",
        "/admin/teams/00000000-0000-0000-0000-000000000005",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(teamBody("00000000-0000-0000-0000-000000000005", "Infra")),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getAdminTeam({
          teamId: "00000000-0000-0000-0000-000000000005",
        });
        expect(result.name).toBe("Infra");
      }));

  it("POST /admin/teams – creates a team", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to create admin team Platform")
      .withRequest("POST", "/admin/teams", (b) => {
        b.headers(jsonHeaders).jsonBody(like({ name: "Platform" }));
      })
      .willRespondWith(201, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(
            teamBody("00000000-0000-0000-0000-000000000004", "Platform", false),
          ),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.createAdminTeam({ name: "Platform" });
        expect(result.uuid).toBeDefined();
      }));

  it("PUT /admin/teams/{id} – updates a team", () =>
    provider
      .addInteraction()
      .given("admin team 00000000-0000-0000-0000-000000000005 exists")
      .uponReceiving(
        "a request to update admin team 00000000-0000-0000-0000-000000000005",
      )
      .withRequest(
        "PUT",
        "/admin/teams/00000000-0000-0000-0000-000000000005",
        (b) => {
          b.headers(jsonHeaders).jsonBody(like({ name: "Infra v2" }));
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(
            teamBody("00000000-0000-0000-0000-000000000005", "Infra v2", false),
          ),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.updateAdminTeam({
            teamId: "00000000-0000-0000-0000-000000000005",
            name: "Infra v2",
          }),
        ).resolves.toBeDefined();
      }));

  it("DELETE /admin/teams/{id} – deletes a team", () =>
    provider
      .addInteraction()
      .given("admin team 00000000-0000-0000-0000-000000000005 exists")
      .uponReceiving(
        "a request to delete admin team 00000000-0000-0000-0000-000000000005",
      )
      .withRequest(
        "DELETE",
        "/admin/teams/00000000-0000-0000-0000-000000000005",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.deleteAdminTeam({
            teamId: "00000000-0000-0000-0000-000000000005",
          }),
        ).resolves.toBeUndefined();
      }));

  it("GET /admin/teams/{id}/users – lists team members", () =>
    provider
      .addInteraction()
      .given("admin team 00000000-0000-0000-0000-000000000005 exists")
      .uponReceiving(
        "a request to list users in team 00000000-0000-0000-0000-000000000005",
      )
      .withRequest(
        "GET",
        "/admin/teams/00000000-0000-0000-0000-000000000005/users",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: {
            users: like([{ uuid: "00000000-0000-0000-0000-000000000012" }]),
          },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listTeamUsers({
          teamId: "00000000-0000-0000-0000-000000000005",
        });
        expect(Array.isArray(result._embedded.users)).toBe(true);
      }));

  it("GET /admin/teams/{id}/users/{userId} – checks team membership", () =>
    provider
      .addInteraction()
      .given(
        "user 00000000-0000-0000-0000-000000000012 is a member of team 00000000-0000-0000-0000-000000000005",
      )
      .uponReceiving(
        "a request to check membership of user 00000000-0000-0000-0000-000000000012 in team 00000000-0000-0000-0000-000000000005",
      )
      .withRequest(
        "GET",
        "/admin/teams/00000000-0000-0000-0000-000000000005/users/00000000-0000-0000-0000-000000000012",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: {
            user: like({ uuid: like("00000000-0000-0000-0000-000000000012") }),
          },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getTeamUser({
          teamId: "00000000-0000-0000-0000-000000000005",
          userId: "00000000-0000-0000-0000-000000000012",
        });
        expect(result._embedded.user.uuid).toBeDefined();
      }));

  it("DELETE /admin/teams/{id}/users/{userId} – removes a user from a team", () =>
    provider
      .addInteraction()
      .given(
        "user 00000000-0000-0000-0000-000000000012 is a member of team 00000000-0000-0000-0000-000000000005",
      )
      .uponReceiving(
        "a request to remove user 00000000-0000-0000-0000-000000000012 from team 00000000-0000-0000-0000-000000000005",
      )
      .withRequest(
        "DELETE",
        "/admin/teams/00000000-0000-0000-0000-000000000005/users/00000000-0000-0000-0000-000000000012",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.removeUserFromTeam({
            teamId: "00000000-0000-0000-0000-000000000005",
            userId: "00000000-0000-0000-0000-000000000012",
          }),
        ).resolves.toBeUndefined();
      }));

  it("PUT /admin/teams/{id}/users – replaces all team members", () =>
    provider
      .addInteraction()
      .given(
        "admin team 00000000-0000-0000-0000-000000000005 and user 00000000-0000-0000-0000-000000000012 exist",
      )
      .uponReceiving(
        "a request to set users for team 00000000-0000-0000-0000-000000000005",
      )
      .withRequest(
        "PUT",
        "/admin/teams/00000000-0000-0000-0000-000000000005/users",
        (b) => {
          b.headers(jsonHeaders).jsonBody(
            like({ users: ["00000000-0000-0000-0000-000000000012"] }),
          );
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: {
            users: like([{ uuid: "00000000-0000-0000-0000-000000000012" }]),
          },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.setTeamUsers({
          teamId: "00000000-0000-0000-0000-000000000005",
          uuids: ["00000000-0000-0000-0000-000000000012"],
        });
        expect(result._embedded.users).toBeDefined();
      }));
});

// ════════════════════════════════════════════════════════════════════════════
// Admin – Roles & Permissions
// ════════════════════════════════════════════════════════════════════════════

describe("Admin – Roles & Permissions", () => {
  it("GET /admin/roles – lists all roles", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to list admin roles")
      .withRequest("GET", "/admin/roles", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: {
            roles: eachLike({
              uuid: like("00000000-0000-0000-0000-000000000007"),
              name: like("Administrator"),
            }),
          },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listAdminRoles();
        expect(Array.isArray(result._embedded.roles)).toBe(true);
      }));

  it("POST /admin/roles – creates a role", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to create admin role ReadOnly")
      .withRequest("POST", "/admin/roles", (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({
            name: "ReadOnly",
            permissions: eachLike({ scope: like("contract_data:read:*") }),
          }),
        );
      })
      .willRespondWith(201, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(roleBody("00000000-0000-0000-0000-000000000006", "ReadOnly")),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.createAdminRole({
          name: "ReadOnly",
          permissions: [{ scope: "contract_data:read:*" }],
        });
        expect(result.uuid).toBeDefined();
      }));

  it("POST /admin/roles/reset – resets roles to defaults", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to reset admin roles to factory defaults")
      .withRequest("POST", "/admin/roles/reset", (b) => {
        b.headers(jsonHeaders).jsonBody(like({}));
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: { roles: like([]) },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(client.resetAdminRoles()).resolves.toBeDefined();
      }));

  it("GET /admin/permissions – lists available permission scopes", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to list admin permissions")
      .withRequest("GET", "/admin/permissions", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          permissions: eachLike({ scope: like("contract:read") }),
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listAdminPermissions();
        expect(Array.isArray(result.permissions)).toBe(true);
      }));
});

// ════════════════════════════════════════════════════════════════════════════
// Admin – System Accounts
// ════════════════════════════════════════════════════════════════════════════

describe("Admin – System Accounts", () => {
  it("POST /admin/system-accounts – creates a system account", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to create system account CI Bot")
      .withRequest("POST", "/admin/system-accounts", (b) => {
        b.headers(jsonHeaders).jsonBody(like({ name: "CI Bot" }));
      })
      .willRespondWith(201, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(
            userBody(
              "00000000-0000-0000-0000-000000000008",
              "ci-bot@example.com",
              1,
            ),
          ),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.createSystemAccount({ name: "CI Bot" });
        expect(result.uuid).toBeDefined();
      }));

  it("GET /admin/system-accounts/{id}/tokens – retrieves system account tokens", () =>
    provider
      .addInteraction()
      .given("system account 00000000-0000-0000-0000-000000000008 exists")
      .uponReceiving(
        "a request to get tokens for system account 00000000-0000-0000-0000-000000000008",
      )
      .withRequest(
        "GET",
        "/admin/system-accounts/00000000-0000-0000-0000-000000000008/tokens",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: {
            items: eachLike({
              uuid: like("00000000-0000-0000-0000-000000000009"),
              description: like("Default token"),
            }),
          },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getSystemAccountTokens({
          accountId: "00000000-0000-0000-0000-000000000008",
        });
        expect(Array.isArray(result._embedded.items)).toBe(true);
      }));
});

// ════════════════════════════════════════════════════════════════════════════
// BDCT – Bi-Directional Contract Testing
// ════════════════════════════════════════════════════════════════════════════

describe("BDCT – provider-version endpoints", () => {
  const bdctBase =
    "/contracts/bi-directional/provider/ProviderAPI/version/2.0.0";

  it("GET …/provider-contract – retrieves provider contract", () =>
    provider
      .addInteraction()
      .given("ProviderAPI version 2.0.0 has a provider contract")
      .uponReceiving(
        "a request to get BDCT provider contract for ProviderAPI 2.0.0",
      )
      .withRequest("GET", `${bdctBase}/provider-contract`, (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            verificationStatus: like("success"),
            _actions: [],
            _embedded: like({}),
            _links: like({}),
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getBiDirectionalProviderContract({
          providerName: "ProviderAPI",
          providerVersionNumber: "2.0.0",
        });
        expect(result).toBeDefined();
      }));

  it("GET …/provider-contract-verification-results – retrieves BDCT provider verification results", () =>
    provider
      .addInteraction()
      .given(
        "ProviderAPI version 2.0.0 has provider contract verification results",
      )
      .uponReceiving(
        "a request to get BDCT provider contract verification results for ProviderAPI 2.0.0",
      )
      .withRequest(
        "GET",
        `${bdctBase}/provider-contract-verification-results`,
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            verificationStatus: like("success"),
            _actions: [],
            _embedded: like({}),
            _links: like({}),
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result =
          await client.getBiDirectionalProviderContractVerificationResults({
            providerName: "ProviderAPI",
            providerVersionNumber: "2.0.0",
          });
        expect(result).toBeDefined();
      }));
});

describe("BDCT – consumer-version endpoints", () => {
  const bdctConsumerBase =
    "/contracts/bi-directional/provider/ProviderAPI/version/2.0.0/consumer/ConsumerApp/version/1.0.0";
  const bdctInput = {
    providerName: "ProviderAPI",
    providerVersionNumber: "2.0.0",
    consumerName: "ConsumerApp",
    consumerVersionNumber: "1.0.0",
  };

  it("GET …/consumer-contract – retrieves BDCT consumer contract by consumer", () =>
    provider
      .addInteraction()
      .given(
        "ProviderAPI 2.0.0 and ConsumerApp 1.0.0 have a bi-directional consumer contract",
      )
      .uponReceiving(
        "a request to get BDCT consumer contract for ConsumerApp 1.0.0 vs ProviderAPI 2.0.0",
      )
      .withRequest("GET", `${bdctConsumerBase}/consumer-contract`, (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            verificationStatus: like("success"),
            _actions: [],
            _embedded: like({}),
            _links: like({}),
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result =
          await client.getBiDirectionalConsumerContractByConsumer(bdctInput);
        expect(result).toBeDefined();
      }));

  it("GET …/provider-contract – retrieves BDCT provider contract by consumer", () =>
    provider
      .addInteraction()
      .given(
        "ProviderAPI 2.0.0 and ConsumerApp 1.0.0 have a bi-directional provider contract",
      )
      .uponReceiving(
        "a request to get BDCT provider contract for ConsumerApp 1.0.0 vs ProviderAPI 2.0.0",
      )
      .withRequest("GET", `${bdctConsumerBase}/provider-contract`, (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            verificationStatus: like("success"),
            _actions: [],
            _embedded: like({}),
            _links: like({}),
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result =
          await client.getBiDirectionalProviderContractByConsumer(bdctInput);
        expect(result).toBeDefined();
      }));

  it("GET …/provider-contract-verification-results – BDCT provider verification by consumer", () =>
    provider
      .addInteraction()
      .given(
        "ProviderAPI 2.0.0 and ConsumerApp 1.0.0 have provider contract verification results",
      )
      .uponReceiving(
        "a request to get BDCT provider verification results for ConsumerApp 1.0.0 vs ProviderAPI 2.0.0",
      )
      .withRequest(
        "GET",
        `${bdctConsumerBase}/provider-contract-verification-results`,
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            verificationStatus: like("success"),
            _actions: [],
            _embedded: like({}),
            _links: like({}),
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result =
          await client.getBiDirectionalProviderContractVerificationResultsByConsumer(
            bdctInput,
          );
        expect(result).toBeDefined();
      }));

  it("GET …/consumer-contract-verification-results – BDCT consumer verification by consumer", () =>
    provider
      .addInteraction()
      .given(
        "ProviderAPI 2.0.0 and ConsumerApp 1.0.0 have consumer contract verification results",
      )
      .uponReceiving(
        "a request to get BDCT consumer verification results for ConsumerApp 1.0.0 vs ProviderAPI 2.0.0",
      )
      .withRequest(
        "GET",
        `${bdctConsumerBase}/consumer-contract-verification-results`,
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            verificationStatus: like("success"),
            _actions: [],
            _embedded: like({}),
            _links: like({}),
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result =
          await client.getBiDirectionalConsumerContractVerificationResultsByConsumer(
            bdctInput,
          );
        expect(result).toBeDefined();
      }));

  it("GET …/cross-contract-verification-results – BDCT cross-contract by consumer", () =>
    provider
      .addInteraction()
      .given(
        "ProviderAPI 2.0.0 and ConsumerApp 1.0.0 have cross-contract verification results",
      )
      .uponReceiving(
        "a request to get BDCT cross-contract results for ConsumerApp 1.0.0 vs ProviderAPI 2.0.0",
      )
      .withRequest(
        "GET",
        `${bdctConsumerBase}/cross-contract-verification-results`,
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            verificationStatus: like("success"),
            _actions: [],
            _embedded: like({}),
            _links: like({}),
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result =
          await client.getBiDirectionalCrossContractVerificationResultsByConsumer(
            bdctInput,
          );
        expect(result).toBeDefined();
      }));
});

// ════════════════════════════════════════════════════════════════════════════
// Additional operations — previously uncovered by any interaction
// ════════════════════════════════════════════════════════════════════════════

const pageBody = like({
  number: 1,
  size: 5,
  totalElements: 1,
  totalPages: 1,
});

describe("Admin – Roles by id", () => {
  const roleId = "00000000-0000-0000-0000-000000000007";

  it("GET /admin/roles/{id} – retrieves a role", () =>
    provider
      .addInteraction()
      .given(`admin role ${roleId} exists`)
      .uponReceiving(`a request to get admin role ${roleId}`)
      .withRequest("GET", `/admin/roles/${roleId}`, (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(roleBody(roleId, "ReadOnly")),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getAdminRole({ roleId });
        expect(result.uuid).toBe(roleId);
        expect(result.name).toBe("ReadOnly");
      }));

  it("PUT /admin/roles/{id} – updates a role", () =>
    provider
      .addInteraction()
      .given(`admin role ${roleId} exists`)
      .uponReceiving(`a request to update admin role ${roleId}`)
      .withRequest("PUT", `/admin/roles/${roleId}`, (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({
            name: "ReadWrite",
            permissions: eachLike({ scope: like("contract_data:read:*") }),
          }),
        );
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like(roleBody(roleId, "ReadWrite")),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.updateAdminRole({
          roleId,
          name: "ReadWrite",
          permissions: [{ scope: "contract_data:read:*" }],
        });
        expect(result.name).toBe("ReadWrite");
      }));

  it("DELETE /admin/roles/{id} – deletes a role", () =>
    provider
      .addInteraction()
      .given(`admin role ${roleId} exists`)
      .uponReceiving(`a request to delete admin role ${roleId}`)
      .withRequest("DELETE", `/admin/roles/${roleId}`, (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.deleteAdminRole({ roleId }),
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
      .given("pacticipant ServiceA has branch main")
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
      .given("pacticipant ServiceA has branch main")
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
      .given("pacticipant ServiceA has branch feature-x")
      .uponReceiving("a request to delete branch feature-x of ServiceA")
      .withRequest(
        "DELETE",
        "/pacticipants/ServiceA/branches/feature-x",
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
            branchName: "feature-x",
          }),
        ).resolves.toBeUndefined();
      }));

  it("GET /pacticipants/{name}/branches/{branch}/versions – lists versions on a branch", () =>
    provider
      .addInteraction()
      .given("pacticipant ServiceA has branch main with versions")
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
          page: pageBody,
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
      .given("pacticipant ServiceA has versions")
      .uponReceiving("a request to list versions of ServiceA")
      .withRequest("GET", "/pacticipants/ServiceA/versions", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          page: pageBody,
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

  it("PUT /pacticipants/{name}/versions/{version} – updates a version", () =>
    provider
      .addInteraction()
      .given("pacticipant ServiceA version 1.0.0 exists")
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
              branchVersions: eachLike({ name: "main" }),
              tags: eachLike({ name: "main" }),
            },
            _links: {
              ...selfLink,
              "pb:latest-verification-results-where-pacticipant-is-consumer":
                halLink,
              "pb:pact-versions": eachLike({
                href: "https://example.pactflow.io/pact-versions",
              }),
              "pb:pacticipant": halLink,
              "pb:tag": halLink,
              curies: eachLike({
                name: "pb",
                href: "https://example.pactflow.io/doc/{rel}",
                templated: true,
              }),
              "pb:record-deployment": eachLike({
                href: "https://example.pactflow.io/record-deployment",
              }),
              "pb:record-release": eachLike({
                href: "https://example.pactflow.io/record-release",
              }),
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

describe("Integrations – list", () => {
  const integrationsBody = {
    page: pageBody,
    _embedded: {
      integrations: eachLike({
        consumer: { name: like("ConsumerApp") },
        provider: { name: like("ProviderAPI") },
      }),
    },
    _links: selfLink,
  };

  it("GET /integrations – lists all integrations", () =>
    provider
      .addInteraction()
      .given("integrations exist")
      .uponReceiving("a request to list all integrations")
      .withRequest("GET", "/integrations", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(integrationsBody);
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listIntegrations();
        expect(Array.isArray(result._embedded.integrations)).toBe(true);
      }));

  it("GET /integrations/team/{teamId} – lists integrations for a team", () =>
    provider
      .addInteraction()
      .given("admin team 00000000-0000-0000-0000-000000000005 has integrations")
      .uponReceiving(
        "a request to list integrations for team 00000000-0000-0000-0000-000000000005",
      )
      .withRequest(
        "GET",
        "/integrations/team/00000000-0000-0000-0000-000000000005",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(integrationsBody);
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getIntegrationsByTeam({
          teamId: "00000000-0000-0000-0000-000000000005",
        });
        expect(Array.isArray(result._embedded.integrations)).toBe(true);
      }));
});

describe("Admin – Users & Teams (additional)", () => {
  const teamId = "00000000-0000-0000-0000-000000000005";
  const userId = "00000000-0000-0000-0000-000000000012";

  it("POST /admin/users/invite-users – invites users", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to invite user invitee@example.com")
      .withRequest("POST", "/admin/users/invite-users", (b) => {
        b.headers(jsonHeaders).jsonBody({
          users: eachLike({
            email: like("invitee@example.com"),
            name: like("Invitee"),
          }),
        });
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          users: eachLike(
            userBody(
              "00000000-0000-0000-0000-000000000013",
              "invitee@example.com",
            ),
          ),
          _links: selfLink,
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.inviteUsers({
          users: [{ email: "invitee@example.com", name: "Invitee" }],
        });
        expect(Array.isArray(result.users)).toBe(true);
      }));

  it("PATCH /admin/teams/{id}/users – adds a user to a team", () =>
    provider
      .addInteraction()
      .given(`admin team ${teamId} and admin user ${userId} exist`)
      .uponReceiving(`a request to patch members of admin team ${teamId}`)
      .withRequest("PATCH", `/admin/teams/${teamId}/users`, (b) => {
        b.headers(jsonHeaders).jsonBody(
          eachLike({
            op: "add",
            path: "/users",
            value: { uuid: like(userId) },
          }),
        );
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody({
          _embedded: { users: eachLike({ uuid: like(userId) }) },
          _links: selfLink,
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.patchTeamUsers({
          teamId,
          operations: [{ op: "add", path: "/users", value: { uuid: userId } }],
        });
        expect(Array.isArray(result._embedded.users)).toBe(true);
      }));
});

describe("Secrets – create", () => {
  it("POST /secrets – creates a secret", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to create secret DEPLOY_KEY")
      .withRequest("POST", "/secrets", (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({
            name: "DEPLOY_KEY",
            value: "s3cr3t",
            description: "Deploy key",
          }),
        );
      })
      .willRespondWith(201, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            uuid: "sec-uuid-new",
            name: "DEPLOY_KEY",
            description: "Deploy key",
            createdAt: timestamp,
            _links: selfLink,
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.createSecret({
          name: "DEPLOY_KEY",
          value: "s3cr3t",
          description: "Deploy key",
        });
        expect(result.uuid).toBeDefined();
      }));
});

describe("Webhooks – update", () => {
  it("PUT /webhooks/{id} – updates a webhook", () => {
    const webhookBody = {
      description: "Trigger CI build v2",
      events: [{ name: "contract_published" }],
      request: {
        method: "POST" as const,
        url: "https://ci.example.com/trigger",
      },
    };
    return provider
      .addInteraction()
      .given("a webhook with uuid wh-uuid-1 exists")
      .uponReceiving("a request to update webhook wh-uuid-1")
      .withRequest("PUT", "/webhooks/wh-uuid-1", (b) => {
        b.headers(jsonHeaders).jsonBody(like(webhookBody));
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            uuid: "wh-uuid-1",
            ...webhookBody,
            createdAt: timestamp,
            _links: {
              ...selfLink,
              "pb:execute": halLink,
              "pb:webhooks": halLink,
            },
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.updateWebhook({
          webhookId: "wh-uuid-1",
          ...webhookBody,
        } as any);
        expect(result.uuid).toBe("wh-uuid-1");
      });
  });
});

describe("BDCT – provider-contract publish", () => {
  it("POST /provider-contracts/provider/{name}/publish – publishes a provider contract", () => {
    const publishBody = {
      providerName: "ProviderAPI",
      pacticipantVersionNumber: "2.0.0",
      branch: "main",
      contract: {
        content: "b3BlbmFwaTogMy4wLjA=",
        contentType: "application/yaml" as const,
        specification: "oas" as const,
        selfVerificationResults: {
          success: true,
          content: "dGVzdHMgcGFzc2Vk",
          contentType: "text/plain",
          verifier: "schemathesis",
        },
      },
    };
    const { providerName, ...requestBody } = publishBody;
    return provider
      .addInteraction()
      .given("a pacticipant named ProviderAPI exists")
      .uponReceiving("a request to publish a provider contract for ProviderAPI")
      .withRequest(
        "POST",
        "/provider-contracts/provider/ProviderAPI/publish",
        (b) => {
          b.headers(jsonHeaders).jsonBody(like(requestBody));
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            notices: eachLike({
              text: "Provider contract published",
              type: "info",
            }),
            _embedded: {
              pacticipant: { name: "ProviderAPI", _links: like({}) },
              version: { number: "2.0.0", _links: like({}) },
            },
            _links: {
              "pf:provider-contract": halLink,
              "pb:pacticipant": halLink,
              "pb:pacticipant-version": halLink,
              "pb:pacticipant-version-tags": eachLike({
                href: "https://example.pactflow.io/tags",
              }),
              "pb:branch-version": halLink,
            },
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.publishProviderContract(publishBody);
        expect(result._embedded).toBeDefined();
      });
  });
});

describe("BDCT – provider-version endpoints (consumer & cross-contract)", () => {
  const bdctBase =
    "/contracts/bi-directional/provider/ProviderAPI/version/2.0.0";
  const input = { providerName: "ProviderAPI", providerVersionNumber: "2.0.0" };
  const version = (number: string) => ({
    number,
    createdAt: timestamp,
    _embedded: like({}),
  });
  const bdctBody = (extraEmbedded: Record<string, unknown>) =>
    like({
      verificationStatus: like("success"),
      _actions: eachLike({
        name: "pf:publish",
        title: "Publish",
        method: "POST",
        href: "https://example.pactflow.io/publish",
      }),
      _embedded: {
        consumerVersion: version("1.0.0"),
        providerVersion: version("2.0.0"),
        crossContractVerificationResults: { success: true },
        providerContractVerificationResults: { success: true },
        ...extraEmbedded,
      },
      _links: like({}),
    });

  it("GET …/consumer-contract – retrieves BDCT consumer contract", () =>
    provider
      .addInteraction()
      .given("ProviderAPI version 2.0.0 has consumer contracts")
      .uponReceiving(
        "a request to get BDCT consumer contract for ProviderAPI 2.0.0",
      )
      .withRequest("GET", `${bdctBase}/consumer-contract`, (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          bdctBody({
            crossContractVerificationResults: {
              success: true,
              results: like({}),
              verificationDate: timestamp,
              verifier: "pactflow",
              verifierVersion: "1.0.0",
            },
            consumerContract: { content: like("eyJjb25zdW1lciI6e319") },
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getBiDirectionalConsumerContract(input);
        expect(result._embedded).toBeDefined();
      }));

  it("GET …/consumer-contract-verification-results – retrieves BDCT consumer verification results", () =>
    provider
      .addInteraction()
      .given(
        "ProviderAPI version 2.0.0 has consumer contract verification results",
      )
      .uponReceiving(
        "a request to get BDCT consumer verification results for ProviderAPI 2.0.0",
      )
      .withRequest(
        "GET",
        `${bdctBase}/consumer-contract-verification-results`,
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(bdctBody({}));
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result =
          await client.getBiDirectionalConsumerContractVerificationResults(
            input,
          );
        expect(result._embedded).toBeDefined();
      }));

  it("GET …/cross-contract-verification-results – retrieves BDCT cross-contract results", () =>
    provider
      .addInteraction()
      .given(
        "ProviderAPI version 2.0.0 has cross-contract verification results",
      )
      .uponReceiving(
        "a request to get BDCT cross-contract verification results for ProviderAPI 2.0.0",
      )
      .withRequest(
        "GET",
        `${bdctBase}/cross-contract-verification-results`,
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          bdctBody({
            crossContractVerificationResults: {
              success: true,
              results: like({}),
              verificationDate: timestamp,
              verifier: "pactflow",
              verifierVersion: "1.0.0",
            },
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result =
          await client.getBiDirectionalCrossContractVerificationResults(input);
        expect(result._embedded).toBeDefined();
      }));
});

// ════════════════════════════════════════════════════════════════════════════
// Error responses
//
// The spec documents these statuses without a response body, so each
// interaction asserts only the status; the client surfaces it as a ToolError
// whose message embeds "status: <code>".
// ════════════════════════════════════════════════════════════════════════════

function expectErrorStatus(opts: {
  description: string;
  state?: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  path: string;
  query?: Record<string, string>;
  body?: unknown;
  status: number;
  call: (client: PactflowClient) => Promise<unknown>;
}) {
  const unconfigured = provider.addInteraction();
  const interaction = opts.state
    ? unconfigured.given(opts.state)
    : unconfigured;
  return interaction
    .uponReceiving(opts.description)
    .withRequest(opts.method, opts.path, (b) => {
      b.headers(opts.body === undefined ? authHeader : jsonHeaders);
      if (opts.query) b.query(opts.query);
      if (opts.body !== undefined) b.jsonBody(opts.body);
    })
    .willRespondWith(opts.status)
    .executeTest(async (mockServer) => {
      const client = await createClient(mockServer.url);
      await expect(opts.call(client)).rejects.toThrow(`status: ${opts.status}`);
    });
}

describe("Error responses", () => {
  const teamId = "00000000-0000-0000-0000-000000000005";
  const userId = "00000000-0000-0000-0000-000000000012";
  const roleId = "00000000-0000-0000-0000-000000000007";
  const environmentId = "00000000-0000-0000-0000-000000000002";
  const invalidScope = { name: "Bad", permissions: [{ scope: "not-a-scope" }] };
  const invalidWebhook = {
    description: "Bad webhook",
    events: [{ name: "not_an_event" }],
    request: { method: "POST" as const, url: "not-a-url" },
  };
  const bdctConsumerBase =
    "/contracts/bi-directional/provider/ProviderAPI/version/2.0.0/consumer/ConsumerApp/version/1.0.0";
  const invalidPublish = {
    pacticipantName: "ConsumerApp",
    pacticipantVersionNumber: "1.0.0",
    contracts: [
      {
        consumerName: "ConsumerApp",
        providerName: "ProviderAPI",
        content: "not-base64",
        contentType: "application/json" as const,
        specification: "pact" as const,
      },
    ],
  };

  // ── 400 Bad Request ──────────────────────────────────────────────────────

  it("POST /admin/roles – 400 for an unknown permission scope", () =>
    expectErrorStatus({
      description: "a request to create an admin role with an invalid scope",
      method: "POST",
      path: "/admin/roles",
      body: like(invalidScope),
      status: 400,
      call: (c) => c.createAdminRole(invalidScope),
    }));

  it("PUT /admin/roles/{id} – 400 for an unknown permission scope", () =>
    expectErrorStatus({
      description: `a request to update admin role ${roleId} with an invalid scope`,
      state: `admin role ${roleId} exists`,
      method: "PUT",
      path: `/admin/roles/${roleId}`,
      body: like(invalidScope),
      status: 400,
      call: (c) => c.updateAdminRole({ roleId, ...invalidScope }),
    }));

  it("POST /pacticipants – 400 for an invalid pacticipant name", () =>
    expectErrorStatus({
      description: "a request to create a pacticipant with an invalid name",
      method: "POST",
      path: "/pacticipants",
      body: like({ name: "invalid/name" }),
      status: 400,
      call: (c) => c.createPacticipant({ name: "invalid/name" }),
    }));

  it("POST /webhooks – 400 for an invalid webhook definition", () =>
    expectErrorStatus({
      description: "a request to create a webhook with an invalid definition",
      method: "POST",
      path: "/webhooks",
      body: like(invalidWebhook),
      status: 400,
      call: (c) => c.createWebhook(invalidWebhook as any),
    }));

  it("PUT /webhooks/{id} – 400 for an invalid webhook definition", () =>
    expectErrorStatus({
      description: "a request to update webhook wh-uuid-1 with invalid data",
      state: "a webhook with uuid wh-uuid-1 exists",
      method: "PUT",
      path: "/webhooks/wh-uuid-1",
      body: like(invalidWebhook),
      status: 400,
      call: (c) =>
        c.updateWebhook({ webhookId: "wh-uuid-1", ...invalidWebhook } as any),
    }));

  it("POST /webhooks/execute – 400 when no webhook request is supplied", () =>
    expectErrorStatus({
      description: "a request to execute webhooks without a request definition",
      method: "POST",
      path: "/webhooks/execute",
      body: {},
      status: 400,
      call: (c) => c.executeWebhooks(),
    }));

  it("PUT /admin/teams/{id} – 400 for an invalid team name", () =>
    expectErrorStatus({
      description: `a request to update admin team ${teamId} with an empty name`,
      state: `admin team ${teamId} exists`,
      method: "PUT",
      path: `/admin/teams/${teamId}`,
      body: like({ name: "" }),
      status: 400,
      call: (c) => c.updateAdminTeam({ teamId, name: "" }),
    }));

  it("PATCH /admin/teams/{id}/users – 400 for an invalid patch operation", () =>
    expectErrorStatus({
      description: `a request to patch members of admin team ${teamId} with an invalid user`,
      state: `admin team ${teamId} exists`,
      method: "PATCH",
      path: `/admin/teams/${teamId}/users`,
      body: eachLike({
        op: "add",
        path: "/users",
        value: { uuid: like("not-a-uuid") },
      }),
      status: 400,
      call: (c) =>
        c.patchTeamUsers({
          teamId,
          operations: [
            { op: "add", path: "/users", value: { uuid: "not-a-uuid" } },
          ],
        }),
    }));

  it("GET /admin/users – 400 for an invalid page number", () =>
    expectErrorStatus({
      description: "a request to list admin users with an invalid page number",
      method: "GET",
      path: "/admin/users",
      query: { page: "-1" },
      status: 400,
      call: (c) => c.listAdminUsers({ page: -1 }),
    }));

  it("PUT /admin/users/{id}/roles – 400 for an unknown role", () =>
    expectErrorStatus({
      description: `a request to set an unknown role for user ${userId}`,
      state: `admin user ${userId} exists`,
      method: "PUT",
      path: `/admin/users/${userId}/roles`,
      body: like({ roles: ["not-a-role-uuid"] }),
      status: 400,
      call: (c) => c.setUserRoles({ userId, roles: ["not-a-role-uuid"] }),
    }));

  it("PUT /environments/{uuid} – 400 for an invalid environment", () =>
    expectErrorStatus({
      description: `a request to update environment ${environmentId} with an empty name`,
      state: `an environment with uuid ${environmentId} exists`,
      method: "PUT",
      path: `/environments/${environmentId}`,
      body: like({ name: "", production: false }),
      status: 400,
      call: (c) =>
        c.updateEnvironment({ environmentId, name: "", production: false }),
    }));

  it("POST /secrets – 400 for an invalid secret", () =>
    expectErrorStatus({
      description: "a request to create a secret with an empty name",
      method: "POST",
      path: "/secrets",
      body: like({ name: "", value: "s3cr3t" }),
      status: 400,
      call: (c) => c.createSecret({ name: "", value: "s3cr3t" }),
    }));

  it("POST /contracts/publish – 400 for invalid contract content", () =>
    expectErrorStatus({
      description:
        "a request to publish a consumer contract with invalid content",
      method: "POST",
      path: "/contracts/publish",
      body: like(invalidPublish),
      status: 400,
      call: (c) => c.publishContracts(invalidPublish),
    }));

  it("POST /provider-contracts/provider/{name}/publish – 400 for invalid contract content", () => {
    const { providerName, ...requestBody } = {
      providerName: "ProviderAPI",
      pacticipantVersionNumber: "2.0.0",
      contract: {
        content: "not-base64",
        contentType: "application/yaml" as const,
        specification: "oas" as const,
      },
    };
    return expectErrorStatus({
      description:
        "a request to publish a provider contract with invalid content",
      method: "POST",
      path: `/provider-contracts/provider/${providerName}/publish`,
      body: like(requestBody),
      status: 400,
      call: (c) => c.publishProviderContract({ providerName, ...requestBody }),
    });
  });

  // ── 404 Not Found ────────────────────────────────────────────────────────

  it("PUT /environments/{uuid} – 404 when the environment does not exist", () =>
    expectErrorStatus({
      description:
        "a request to update environment 00000000-0000-0000-0000-000000000099",
      state:
        "no environment with uuid 00000000-0000-0000-0000-000000000099 exists",
      method: "PUT",
      path: "/environments/00000000-0000-0000-0000-000000000099",
      body: like({ name: "staging", production: false }),
      status: 404,
      call: (c) =>
        c.updateEnvironment({
          environmentId: "00000000-0000-0000-0000-000000000099",
          name: "staging",
          production: false,
        }),
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

  it("POST /secrets – 409 when a secret with the same name exists", () =>
    expectErrorStatus({
      description: "a request to create secret DEPLOY_KEY that already exists",
      state: "a secret named DEPLOY_KEY already exists",
      method: "POST",
      path: "/secrets",
      body: like({ name: "DEPLOY_KEY", value: "s3cr3t" }),
      status: 409,
      call: (c) => c.createSecret({ name: "DEPLOY_KEY", value: "s3cr3t" }),
    }));

  it("POST /contracts/publish – 409 when the version already has different content", () =>
    expectErrorStatus({
      description:
        "a request to republish changed consumer contract content for ConsumerApp 1.0.0",
      state: "ConsumerApp version 1.0.0 already has a published contract",
      method: "POST",
      path: "/contracts/publish",
      body: like(invalidPublish),
      status: 409,
      call: (c) => c.publishContracts(invalidPublish),
    }));

  it("POST /provider-contracts/provider/{name}/publish – 409 when the version already has different content", () => {
    const { providerName, ...requestBody } = {
      providerName: "ProviderAPI",
      pacticipantVersionNumber: "2.0.0",
      contract: {
        content: "b3BlbmFwaTogMy4wLjA=",
        contentType: "application/yaml" as const,
        specification: "oas" as const,
      },
    };
    return expectErrorStatus({
      description:
        "a request to republish changed provider contract content for ProviderAPI 2.0.0",
      state: "ProviderAPI version 2.0.0 already has a provider contract",
      method: "POST",
      path: `/provider-contracts/provider/${providerName}/publish`,
      body: like(requestBody),
      status: 409,
      call: (c) => c.publishProviderContract({ providerName, ...requestBody }),
    });
  });

  // ── 410 Gone / 422 Unprocessable ─────────────────────────────────────────

  it("GET /admin/users/{id} – 410 when the user has been deleted", () =>
    expectErrorStatus({
      description: `a request to get deleted admin user ${userId}`,
      state: `admin user ${userId} has been deleted`,
      method: "GET",
      path: `/admin/users/${userId}`,
      status: 410,
      call: (c) => c.getAdminUser({ userId }),
    }));

  it("DELETE /admin/teams/{id} – 422 when the team cannot be deleted", () =>
    expectErrorStatus({
      description: `a request to delete the default admin team ${teamId}`,
      state: `admin team ${teamId} is the default team`,
      method: "DELETE",
      path: `/admin/teams/${teamId}`,
      status: 422,
      call: (c) => c.deleteAdminTeam({ teamId }),
    }));

  it("GET …/consumer/{c}/version/{v}/provider-contract – 422 when the contract cannot be processed", () =>
    expectErrorStatus({
      description:
        "a request to get an unprocessable BDCT provider contract for ConsumerApp 1.0.0 vs ProviderAPI 2.0.0",
      state:
        "ProviderAPI 2.0.0 has an unprocessable provider contract for ConsumerApp 1.0.0",
      method: "GET",
      path: `${bdctConsumerBase}/provider-contract`,
      status: 422,
      call: (c) =>
        c.getBiDirectionalProviderContractByConsumer({
          providerName: "ProviderAPI",
          providerVersionNumber: "2.0.0",
          consumerName: "ConsumerApp",
          consumerVersionNumber: "1.0.0",
        }),
    }));
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
