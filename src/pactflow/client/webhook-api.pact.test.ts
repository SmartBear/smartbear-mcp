/**
 * Pact V4 consumer tests for the PactflowClient webhook API — webhook CRUD and execution.
 *
 * Each test creates its own ephemeral mock server via executeTest(), so tests
 * are fully isolated. Generated pact files land in ./pacts/ at the project root.
 *
 * Run with:
 *   npx vitest run --config vitest.pact.config.ts src/pactflow/client/webhook-api.pact.test.ts
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
      .given("a webhook with uuid wh-updatable-uuid-0001 exists")
      .uponReceiving("a request to update webhook wh-updatable-uuid-0001")
      .withRequest("PUT", "/webhooks/wh-updatable-uuid-0001", (b) => {
        b.headers(jsonHeaders).jsonBody(like(webhookBody));
      })
      .willRespondWith(200, (b) => {
        b.headers(halJsonResponseHeaders).jsonBody(
          like({
            uuid: "wh-updatable-uuid-0001",
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
          webhookId: "wh-updatable-uuid-0001",
          ...webhookBody,
        } as any);
        expect(result.uuid).toBe("wh-updatable-uuid-0001");
      });
  });
});

describe("Webhook – error responses", () => {
  const invalidWebhook = {
    description: "Bad webhook",
    events: [{ name: "not_an_event" }],
    request: { method: "POST" as const, url: "not-a-url" },
  };

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
});
