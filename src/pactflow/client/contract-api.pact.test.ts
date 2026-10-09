/**
 * Pact V4 consumer tests for the PactflowClient contract API — can-i-deploy, matrix, contract publishing, pacts for verification, integrations / network and BDCT (bi-directional contract testing).
 *
 * Each test creates its own ephemeral mock server via executeTest(), so tests
 * are fully isolated. Generated pact files land in ./pacts/ at the project root.
 *
 * Run with:
 *   npx vitest run --config vitest.pact.config.ts src/pactflow/client/contract-api.pact.test.ts
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
} from "./pact-helpers";

const { like, eachLike, regex } = Matchers;

describe("Contract – core", () => {
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
});

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

describe("Integrations – list", () => {
  const integrationsBody = {
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
        b.headers({ ...authHeader, Accept: "application/hal+json" });
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
      .given("integrations exist for team 00000000-0000-0000-0000-000000000005")
      .uponReceiving(
        "a request to list integrations for team 00000000-0000-0000-0000-000000000005",
      )
      .withRequest(
        "GET",
        "/integrations/team/00000000-0000-0000-0000-000000000005",
        (b) => {
          b.headers({ ...authHeader, Accept: "application/hal+json" });
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

describe("BDCT – provider-contract publish", () => {
  it("POST /provider-contracts/provider/{name}/publish – publishes a provider contract", () => {
    const publishBody = {
      providerName: "ProviderAPI",
      pacticipantVersionNumber: "2.0.0",
      branch: "main",
      contract: {
        content:
          "b3BlbmFwaTogMy4wLjAKaW5mbzoKICB0aXRsZTogUHJvdmlkZXJBUEkKICB2ZXJzaW9uOiAyLjAuMApwYXRoczoKICAvdGhpbmdzOgogICAgZ2V0OgogICAgICByZXNwb25zZXM6CiAgICAgICAgIjIwMCI6CiAgICAgICAgICBkZXNjcmlwdGlvbjogT0sK",
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
              "pb:pacticipant-version-tags": eachLike(
                { href: "https://example.pactflow.io/tags" },
                0,
              ),
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

describe("Contract – error responses", () => {
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

  it("POST /provider-contracts/provider/{name}/publish – 409 when the version already has different content", () => {
    const { providerName, ...requestBody } = {
      providerName: "ProviderAPI",
      pacticipantVersionNumber: "2.0.0",
      contract: {
        content:
          "b3BlbmFwaTogMy4wLjAKaW5mbzoKICB0aXRsZTogUHJvdmlkZXJBUEkKICB2ZXJzaW9uOiAyLjAuMApwYXRoczoKICAvY2hhbmdlZDoKICAgIGdldDoKICAgICAgcmVzcG9uc2VzOgogICAgICAgICIyMDAiOgogICAgICAgICAgZGVzY3JpcHRpb246IE9LCg==",
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
});
