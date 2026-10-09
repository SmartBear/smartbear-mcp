/**
 * Pact V4 consumer tests for the PactflowClient environment API — environment CRUD, deployments and releases.
 *
 * Each test creates its own ephemeral mock server via executeTest(), so tests
 * are fully isolated. Generated pact files land in ./pacts/ at the project root.
 *
 * Run with:
 *   npx vitest run --config vitest.pact.config.ts src/pactflow/client/environment-api.pact.test.ts
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

const { like, eachLike, regex } = Matchers;

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

describe("Environment – core", () => {
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
});

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

describe("Branch & version management", () => {
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

describe("Environment – error responses", () => {
  const environmentId = "00000000-0000-0000-0000-000000000002";

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

  it("PUT /environments/{uuid} – 404 when the environment does not exist", () =>
    expectErrorStatus({
      description:
        "a request to update environment 00000000-0000-0000-0000-000000000099",
      state:
        "an environment with uuid 00000000-0000-0000-0000-000000000001 exists",
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
});
