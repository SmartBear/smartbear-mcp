/**
 * Pact V4 consumer tests for the PactflowClient admin API — metrics, secrets, current user / tokens / preferences / audit log, users, teams, roles, permissions and system accounts.
 *
 * Each test creates its own ephemeral mock server via executeTest(), so tests
 * are fully isolated. Generated pact files land in ./pacts/ at the project root.
 *
 * Run with:
 *   npx vitest run --config vitest.pact.config.ts src/pactflow/client/admin-api.pact.test.ts
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
  provider,
  selfLink,
  timestamp,
} from "./pact-helpers";

const { like, eachLike } = Matchers;

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

describe("Admin – core", () => {
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

describe("Admin – error responses", () => {
  const teamId = "00000000-0000-0000-0000-000000000005";

  const userId = "00000000-0000-0000-0000-000000000012";

  const roleId = "00000000-0000-0000-0000-000000000007";

  const invalidScope = { name: "Bad", permissions: [{ scope: "not-a-scope" }] };

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

  it("POST /secrets – 400 for an invalid secret", () =>
    expectErrorStatus({
      description: "a request to create a secret with an empty name",
      method: "POST",
      path: "/secrets",
      body: like({ name: "", value: "s3cr3t" }),
      status: 400,
      call: (c) => c.createSecret({ name: "", value: "s3cr3t" }),
    }));

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
});
