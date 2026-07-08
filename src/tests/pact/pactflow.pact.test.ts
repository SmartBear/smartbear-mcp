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
 *   npx vitest run src/tests/pact/pactflow.pact.test.ts
 */

import { describe, it, expect } from "vitest";
import { PactV4, MatchersV3 } from "@pact-foundation/pact";
import path from "node:path";
import { PactflowClient } from "../../pactflow/client";

const { like, eachLike, regex } = MatchersV3;

const provider = new PactV4({
  consumer: "smartbear-mcp",
  provider: "pactflow-application-saas",
  dir: path.resolve(process.cwd(), "pacts"),
  logLevel: "error",
});

async function createClient(baseUrl: string): Promise<PactflowClient> {
  const client = new PactflowClient();
  const mockServer = { getClientInfo: () => undefined } as any;
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

// ════════════════════════════════════════════════════════════════════════════
// Core
// ════════════════════════════════════════════════════════════════════════════

describe("Core", () => {
  it("GET /can-i-deploy – returns deployment eligibility summary", () =>
    provider
      .addInteraction()
      .given("pacticipant ServiceA version 1.0.0 exists")
      .uponReceiving(
        "a request to check can-i-deploy for ServiceA 1.0.0 in production",
      )
      .withRequest("GET", "/can-i-deploy", (builder) => {
        builder
          .query({
            pacticipant: "ServiceA",
            version: "1.0.0",
            environment: "production",
          })
          .headers({ Authorization: like("Bearer test-token") });
      })
      .willRespondWith(200, (builder) => {
        builder.jsonBody({
          summary: like({
            deployable: true,
            failed: 0,
            reason: "All verification results are successful",
            success: 1,
            unknown: 0,
          }),
          matrix: [],
          notices: [],
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.canIDeploy({
          pacticipant: "ServiceA",
          version: "1.0.0",
          environment: "production",
        });
        expect(result.summary.deployable).toBe(true);
        expect(result.summary).toBeDefined();
      }));

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
            "q[]latest": "true",
          })
          .headers({ Authorization: like("Bearer test-token") });
      })
      .willRespondWith(200, (builder) => {
        builder.jsonBody({
          matrix: [],
          notices: [],
          summary: like({
            deployable: true,
            failed: 0,
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
          q: [{ pacticipant: "ServiceA", version: "1.0.0", latest: true }],
        });
        expect(result.summary.deployable).toBe(true);
        expect(result.matrix).toBeDefined();
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
        builder.jsonBody({
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
        builder.jsonBody(
          like({
            name: "ServiceA",
            mainBranch: "main",
          }),
        );
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
        builder.jsonBody({
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
        builder.jsonBody(
          like({
            name: "production",
            uuid: "00000000-0000-0000-0000-000000000001",
            production: true,
          }),
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
        builder.jsonBody(like({}));
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
        builder.jsonBody(like({}));
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
        builder.jsonBody({
          _embedded: { deployedVersions: [] },
          _links: like({}),
        });
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
        builder.jsonBody(
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

  it("POST /provider-contracts/provider/{name}/publish – publishes a provider contract", () => {
    const contractBody = {
      pacticipantVersionNumber: "2.0.0",
      contract: {
        content: "eyJvcGVuYXBpIjogIjMuMC4wIn0=",
        contentType: "application/json" as const,
        specification: "oas" as const,
        selfVerificationResults: {
          success: true,
          verifier: "dredd",
          content: "eyJyZXN1bHRzIjogW119",
          contentType: "application/json",
        },
      },
      branch: "main",
    };

    return provider
      .addInteraction()
      .given("a pacticipant named ProviderAPI exists")
      .uponReceiving(
        "a request to publish provider contract for ProviderAPI 2.0.0",
      )
      .withRequest(
        "POST",
        "/provider-contracts/provider/ProviderAPI/publish",
        (builder) => {
          builder
            .headers({
              Authorization: like("Bearer test-token"),
              "Content-Type": regex("application/json.*", "application/json"),
            })
            .jsonBody(like(contractBody));
        },
      )
      .willRespondWith(200, (builder) => {
        builder.jsonBody(
          like({ notices: [], _embedded: like({}), _links: like({}) }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.publishProviderContract({
          providerName: "ProviderAPI",
          ...contractBody,
        });
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
        builder.jsonBody({
          _embedded: { pacts: [] },
          _links: like({}),
        });
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

  it("GET /pacticipants/{name}/branches – returns branches for a pacticipant", () =>
    provider
      .addInteraction()
      .given("a pacticipant named ServiceA with branches exists")
      .uponReceiving("a request to list branches for ServiceA")
      .withRequest("GET", "/pacticipants/ServiceA/branches", (builder) => {
        builder.headers({ Authorization: like("Bearer test-token") });
      })
      .willRespondWith(200, (builder) => {
        builder.jsonBody({
          _embedded: { branches: eachLike({ name: like("main") }) },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listBranches({
          pacticipantName: "ServiceA",
        });
        expect(Array.isArray(result._embedded.branches)).toBe(true);
        expect(result._embedded.branches.length).toBeGreaterThanOrEqual(1);
        expect(result._embedded.branches[0].name).toBeDefined();
      }));

  it("GET /pacticipants/{name}/versions – returns versions for a pacticipant", () =>
    provider
      .addInteraction()
      .given("a pacticipant named ServiceA with versions exists")
      .uponReceiving("a request to list versions for ServiceA")
      .withRequest("GET", "/pacticipants/ServiceA/versions", (builder) => {
        builder.headers({ Authorization: like("Bearer test-token") });
      })
      .willRespondWith(200, (builder) => {
        builder.jsonBody({
          _embedded: { versions: eachLike({ number: like("1.0.0") }) },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listVersions({
          pacticipantName: "ServiceA",
        });
        expect(Array.isArray(result._embedded.versions)).toBe(true);
        expect(result._embedded.versions.length).toBeGreaterThanOrEqual(1);
        expect(result._embedded.versions[0].number).toBeDefined();
      }));

  it("GET /metrics – returns workspace-wide metrics", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to get workspace metrics")
      .withRequest("GET", "/metrics", (builder) => {
        builder.headers({ Authorization: like("Bearer test-token") });
      })
      .willRespondWith(200, (builder) => {
        builder.jsonBody(
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
            pactPublications: like({ count: 42 }),
            verificationResults: like({ count: 1250, successCount: 1200 }),
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
        b.jsonBody(
          like({
            uuid: "00000000-0000-0000-0000-000000000003",
            name: "production",
          }),
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
        b.jsonBody(
          like({
            uuid: "00000000-0000-0000-0000-000000000002",
            name: "staging",
          }),
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
        b.jsonBody({
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
        b.jsonBody(like({ name: "NewService", displayName: "New Service" }));
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
        b.jsonBody(like({ name: "ServiceA", mainBranch: "main" }));
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
        b.jsonBody(like({ name: "ServiceA", mainBranch: "develop" }));
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
  it("GET /pacticipants/{name}/branches/{branch} – retrieves a branch", () =>
    provider
      .addInteraction()
      .given("a pacticipant named ServiceA with branch main exists")
      .uponReceiving("a request to get branch main for ServiceA")
      .withRequest("GET", "/pacticipants/ServiceA/branches/main", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.jsonBody(like({ name: "main" }));
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
      .uponReceiving("a request to delete branch old-feature for ServiceA")
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

  it("GET /pacticipants/{name}/branches/{branch}/versions – returns branch versions", () =>
    provider
      .addInteraction()
      .given("a pacticipant named ServiceA with branch main exists")
      .uponReceiving("a request to get versions for branch main of ServiceA")
      .withRequest(
        "GET",
        "/pacticipants/ServiceA/branches/main/versions",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.jsonBody({
          _embedded: { versions: eachLike({ number: like("1.0.0") }) },
          _links: like({}),
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

  it("GET /pacticipants/{name}/versions/{version} – returns a specific version", () =>
    provider
      .addInteraction()
      .given("pacticipant ServiceA version 1.0.0 exists")
      .uponReceiving("a request to get version 1.0.0 of ServiceA")
      .withRequest("GET", "/pacticipants/ServiceA/versions/1.0.0", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.jsonBody(like({ number: "1.0.0" }));
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getVersion({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
        });
        expect(result.number).toBe("1.0.0");
      }));

  it("GET /pacticipants/{name}/latest-version – returns latest version", () =>
    provider
      .addInteraction()
      .given("a pacticipant named ServiceA with versions exists")
      .uponReceiving("a request to get the latest version of ServiceA")
      .withRequest("GET", "/pacticipants/ServiceA/latest-version", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.jsonBody(like({ number: "2.0.0" }));
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getLatestVersion({
          pacticipantName: "ServiceA",
        });
        expect(result.number).toBeDefined();
      }));

  it("PUT /pacticipants/{name}/versions/{version} – updates a version build URL", () =>
    provider
      .addInteraction()
      .given("pacticipant ServiceA version 1.0.0 exists")
      .uponReceiving("a request to update build URL for ServiceA 1.0.0")
      .withRequest("PUT", "/pacticipants/ServiceA/versions/1.0.0", (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({ buildUrl: "https://ci.example.com/1" }),
        );
      })
      .willRespondWith(201, (b) => {
        b.jsonBody(like({ number: "1.0.0" }));
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.updateVersion({
          pacticipantName: "ServiceA",
          versionNumber: "1.0.0",
          buildUrl: "https://ci.example.com/1",
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
        b.jsonBody({
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
        b.jsonBody({
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
        b.jsonBody({
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
        b.jsonBody(like({ name: "team-a" }));
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
        b.jsonBody({
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
      .willRespondWith(200, (b) => {
        b.jsonBody(like({ name: "mobile" }));
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
  it("GET /integrations – lists all integrations", () =>
    provider
      .addInteraction()
      .given("integrations exist")
      .uponReceiving("a request to list all integrations")
      .withRequest("GET", "/integrations", (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.jsonBody({
          _embedded: {
            integrations: eachLike({
              consumer: like({ name: "ConsumerApp" }),
              provider: like({ name: "ProviderAPI" }),
            }),
          },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.listIntegrations();
        expect(Array.isArray(result._embedded.integrations)).toBe(true);
      }));

  it("GET /integrations/team/{teamId} – gets integrations for a team", () =>
    provider
      .addInteraction()
      .given("integrations exist for team 00000000-0000-0000-0000-000000000005")
      .uponReceiving(
        "a request to get integrations for team 00000000-0000-0000-0000-000000000005",
      )
      .withRequest(
        "GET",
        "/integrations/team/00000000-0000-0000-0000-000000000005",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.jsonBody({
          _embedded: {
            integrations: eachLike({
              consumer: like({ name: "ConsumerApp" }),
              provider: like({ name: "ProviderAPI" }),
            }),
          },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getIntegrationsByTeam({
          teamId: "00000000-0000-0000-0000-000000000005",
        });
        expect(Array.isArray(result._embedded.integrations)).toBe(true);
      }));

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
        b.jsonBody({
          integrations: [],
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
        b.jsonBody({
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
        b.jsonBody(
          like({
            uuid: "wh-uuid-1",
            request: like({ url: "https://ci.example.com/trigger" }),
          }),
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
        b.jsonBody(like({ uuid: "wh-uuid-new", ...webhookBody }));
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.createWebhook(webhookBody as any);
        expect(result.uuid).toBeDefined();
      });
  });

  it("PUT /webhooks/{id} – updates a webhook", () =>
    provider
      .addInteraction()
      .given("a webhook with uuid wh-uuid-1 exists")
      .uponReceiving("a request to update webhook wh-uuid-1")
      .withRequest("PUT", "/webhooks/wh-uuid-1", (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({
            description: "Updated webhook",
            events: eachLike({ name: like("contract_published") }),
            request: like({
              method: "POST",
              url: "https://ci.example.com/new-trigger",
            }),
          }),
        );
      })
      .willRespondWith(200, (b) => {
        b.jsonBody(like({ uuid: "wh-uuid-1" }));
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.updateWebhook({
            webhookId: "wh-uuid-1",
            description: "Updated webhook",
            events: [{ name: "contract_published" }],
            request: {
              method: "POST" as const,
              url: "https://ci.example.com/new-trigger",
            },
          } as any),
        ).resolves.toBeDefined();
      }));

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
        b.jsonBody(like({ success: like(true), _links: like({}) }));
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
        b.jsonBody(like({ success: like(true), _links: like({}) }));
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
        b.jsonBody({
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
        b.jsonBody(like({ uuid: "sec-uuid-1", name: "CI_TOKEN" }));
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getSecret({ secretId: "sec-uuid-1" });
        expect(result.uuid).toBe("sec-uuid-1");
      }));

  it("POST /secrets – creates a secret", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to create secret MY_TOKEN")
      .withRequest("POST", "/secrets", (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({ name: "MY_TOKEN", description: "CI token", value: "s3cr3t" }),
        );
      })
      .willRespondWith(201, (b) => {
        b.jsonBody(like({ uuid: "sec-uuid-new", name: "MY_TOKEN" }));
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.createSecret({
          name: "MY_TOKEN",
          description: "CI token",
          value: "s3cr3t",
        });
        expect(result.uuid).toBeDefined();
      }));

  it("PUT /secrets/{id} – updates a secret", () =>
    provider
      .addInteraction()
      .given("a secret with uuid sec-uuid-1 exists")
      .uponReceiving("a request to update secret sec-uuid-1")
      .withRequest("PUT", "/secrets/sec-uuid-1", (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({ name: "MY_TOKEN", value: "new-s3cr3t" }),
        );
      })
      .willRespondWith(200, (b) => {
        b.jsonBody(like({}));
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.updateSecret({
            secretId: "sec-uuid-1",
            name: "MY_TOKEN",
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
        b.jsonBody(
          like({
            uuid: "00000000-0000-0000-0000-000000000012",
            email: "user@example.com",
            active: true,
          }),
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
        b.jsonBody({
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
        b.jsonBody(
          like({
            uuid: "00000000-0000-0000-0000-000000000009",
            value: "new-token-value",
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
        b.jsonBody({
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
        b.jsonBody({
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
        b.jsonBody({ events: [], _links: like({}) });
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
        b.jsonBody({
          teams: eachLike({ name: like("Platform Team") }),
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
        b.jsonBody({
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
        b.jsonBody(
          like({
            uuid: "00000000-0000-0000-0000-000000000012",
            email: "admin@example.com",
          }),
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
        b.jsonBody(
          like({
            uuid: "00000000-0000-0000-0000-000000000010",
            email: "new@example.com",
          }),
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
        b.jsonBody(
          like({ uuid: "00000000-0000-0000-0000-000000000012", active: false }),
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

  it("POST /admin/users/invite-users – invites users", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to invite users")
      .withRequest("POST", "/admin/users/invite-users", (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({
            users: eachLike({
              name: like("example"),
              email: like("a@example.com"),
            }),
          }),
        );
      })
      .willRespondWith(200, (b) => {
        b.jsonBody({ users: [], _links: like({}) });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.inviteUsers({
            users: [
              { name: "example_a", email: "a@example.com" },
              { name: "example_b", email: "b@example.com" },
            ],
          }),
        ).resolves.toBeDefined();
      }));

  it("PUT /admin/users/{id}/roles – sets roles for a user", () =>
    provider
      .addInteraction()
      .given("admin user 00000000-0000-0000-0000-000000000012 exists")
      .uponReceiving(
        "a request to set roles for user 00000000-0000-0000-0000-000000000012",
      )
      .withRequest(
        "PUT",
        "/admin/users/00000000-0000-0000-0000-000000000012/roles",
        (b) => {
          b.headers(jsonHeaders).jsonBody(
            like({ roles: eachLike("00000000-0000-0000-0000-000000000007") }),
          );
        },
      )
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.setUserRoles({
            userId: "00000000-0000-0000-0000-000000000012",
            roles: ["00000000-0000-0000-0000-000000000007", "role-uuid-2"],
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
        b.jsonBody({
          teams: eachLike({
            uuid: like("00000000-0000-0000-0000-000000000005"),
            name: like("Infra"),
          }),
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
        b.jsonBody(
          like({ uuid: "00000000-0000-0000-0000-000000000005", name: "Infra" }),
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
        b.jsonBody(
          like({
            uuid: "00000000-0000-0000-0000-000000000004",
            name: "Platform",
          }),
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
        b.jsonBody(like({ uuid: "00000000-0000-0000-0000-000000000005" }));
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
        b.jsonBody({
          _embedded: {
            users: eachLike({
              uuid: like("00000000-0000-0000-0000-000000000012"),
            }),
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
        b.jsonBody({
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

  it("PUT /admin/teams/{id}/users – replaces all team members", () =>
    provider
      .addInteraction()
      .given("admin team 00000000-0000-0000-0000-000000000005 exists")
      .uponReceiving(
        "a request to set users for team 00000000-0000-0000-0000-000000000005",
      )
      .withRequest(
        "PUT",
        "/admin/teams/00000000-0000-0000-0000-000000000005/users",
        (b) => {
          b.headers(jsonHeaders).jsonBody(
            like({ uuids: eachLike("00000000-0000-0000-0000-000000000012") }),
          );
        },
      )
      .willRespondWith(200, (b) => {
        b.jsonBody({
          _embedded: { users: [] },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.setTeamUsers({
            teamId: "00000000-0000-0000-0000-000000000005",
            uuids: [
              "00000000-0000-0000-0000-000000000012",
              "00000000-0000-0000-0000-000000000011",
            ],
          }),
        ).resolves.toBeDefined();
      }));

  it("PATCH /admin/teams/{id}/users – patches team membership", () =>
    provider
      .addInteraction()
      .given("admin team 00000000-0000-0000-0000-000000000005 exists")
      .uponReceiving(
        "a request to patch users in team 00000000-0000-0000-0000-000000000005",
      )
      .withRequest(
        "PATCH",
        "/admin/teams/00000000-0000-0000-0000-000000000005/users",
        (b) => {
          b.headers(jsonHeaders).jsonBody(
            eachLike({
              op: like("add"),
              path: like("/users"),
              value: like({ uuid: "00000000-0000-0000-0000-000000000012" }),
            }),
          );
        },
      )
      .willRespondWith(200, (b) => {
        b.jsonBody({
          _embedded: { users: [] },
          _links: like({}),
        });
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.patchTeamUsers({
            teamId: "00000000-0000-0000-0000-000000000005",
            operations: [
              {
                op: "add" as const,
                path: "/users" as const,
                value: { uuid: "00000000-0000-0000-0000-000000000012" },
              },
            ],
          }),
        ).resolves.toBeDefined();
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
        b.jsonBody({
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

  it("GET /admin/roles/{id} – retrieves a role", () =>
    provider
      .addInteraction()
      .given("admin role 00000000-0000-0000-0000-000000000007 exists")
      .uponReceiving(
        "a request to get admin role 00000000-0000-0000-0000-000000000007",
      )
      .withRequest(
        "GET",
        "/admin/roles/00000000-0000-0000-0000-000000000007",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.jsonBody(
          like({
            uuid: "00000000-0000-0000-0000-000000000007",
            name: "Administrator",
            permissions: eachLike({ scope: like("contract:read") }),
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.getAdminRole({
          roleId: "00000000-0000-0000-0000-000000000007",
        });
        expect(result.name).toBe("Administrator");
      }));

  it("POST /admin/roles – creates a role", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to create admin role ReadOnly")
      .withRequest("POST", "/admin/roles", (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({
            name: "ReadOnly",
            permissions: eachLike({ scope: like("contract:read") }),
          }),
        );
      })
      .willRespondWith(201, (b) => {
        b.jsonBody(
          like({
            uuid: "00000000-0000-0000-0000-000000000006",
            name: "ReadOnly",
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        const result = await client.createAdminRole({
          name: "ReadOnly",
          permissions: [{ scope: "contract:read" }],
        });
        expect(result.uuid).toBeDefined();
      }));

  it("PUT /admin/roles/{id} – updates a role", () =>
    provider
      .addInteraction()
      .given("admin role 00000000-0000-0000-0000-000000000007 exists")
      .uponReceiving(
        "a request to update admin role 00000000-0000-0000-0000-000000000007",
      )
      .withRequest(
        "PUT",
        "/admin/roles/00000000-0000-0000-0000-000000000007",
        (b) => {
          b.headers(jsonHeaders).jsonBody(
            like({
              name: "Super Admin",
              permissions: eachLike({ scope: like("contract:read") }),
            }),
          );
        },
      )
      .willRespondWith(200, (b) => {
        b.jsonBody(like({ uuid: "00000000-0000-0000-0000-000000000007" }));
      })
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.updateAdminRole({
            roleId: "00000000-0000-0000-0000-000000000007",
            name: "Super Admin",
            permissions: [
              { scope: "contract:read" },
              { scope: "contract:write" },
            ],
          }),
        ).resolves.toBeDefined();
      }));

  it("DELETE /admin/roles/{id} – deletes a role", () =>
    provider
      .addInteraction()
      .given("admin role 00000000-0000-0000-0000-000000000007 exists")
      .uponReceiving(
        "a request to delete admin role 00000000-0000-0000-0000-000000000007",
      )
      .withRequest(
        "DELETE",
        "/admin/roles/00000000-0000-0000-0000-000000000007",
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(204)
      .executeTest(async (mockServer) => {
        const client = await createClient(mockServer.url);
        await expect(
          client.deleteAdminRole({
            roleId: "00000000-0000-0000-0000-000000000007",
          }),
        ).resolves.toBeUndefined();
      }));

  it("POST /admin/roles/reset – resets roles to defaults", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to reset admin roles to factory defaults")
      .withRequest("POST", "/admin/roles/reset", (b) => {
        b.headers(jsonHeaders).jsonBody(like({}));
      })
      .willRespondWith(200, (b) => {
        b.jsonBody({
          _embedded: { roles: [] },
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
        b.jsonBody({
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
        b.jsonBody(
          like({ uuid: like("00000000-0000-0000-0000-000000000008") }),
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
        b.jsonBody({
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
        b.jsonBody(
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
        b.jsonBody(
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

  it("GET …/consumer-contract – retrieves BDCT consumer contract", () =>
    provider
      .addInteraction()
      .given("ProviderAPI version 2.0.0 has a consumer contract")
      .uponReceiving(
        "a request to get BDCT consumer contract for ProviderAPI 2.0.0",
      )
      .withRequest("GET", `${bdctBase}/consumer-contract`, (b) => {
        b.headers(authHeader);
      })
      .willRespondWith(200, (b) => {
        b.jsonBody(
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
        const result = await client.getBiDirectionalConsumerContract({
          providerName: "ProviderAPI",
          providerVersionNumber: "2.0.0",
        });
        expect(result).toBeDefined();
      }));

  it("GET …/consumer-contract-verification-results – retrieves BDCT consumer verification results", () =>
    provider
      .addInteraction()
      .given(
        "ProviderAPI version 2.0.0 has consumer contract verification results",
      )
      .uponReceiving(
        "a request to get BDCT consumer contract verification results for ProviderAPI 2.0.0",
      )
      .withRequest(
        "GET",
        `${bdctBase}/consumer-contract-verification-results`,
        (b) => {
          b.headers(authHeader);
        },
      )
      .willRespondWith(200, (b) => {
        b.jsonBody(
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
          await client.getBiDirectionalConsumerContractVerificationResults({
            providerName: "ProviderAPI",
            providerVersionNumber: "2.0.0",
          });
        expect(result).toBeDefined();
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
        b.jsonBody(
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
          await client.getBiDirectionalCrossContractVerificationResults({
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
        b.jsonBody(
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
        b.jsonBody(
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
        b.jsonBody(
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
        b.jsonBody(
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
        b.jsonBody(
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
