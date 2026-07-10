/**
 * Pact V4 consumer tests for PactflowClient AI endpoints.
 * Covers the initial HTTP submission for generate and review.
 * Async polling (HEAD status_url, GET result_url) uses dynamic URLs
 * returned by the API and is not tested here.
 */

import path from "node:path";
import { Matchers, PactV4 } from "@pact-foundation/pact";
import { describe, expect, it } from "vitest";

const { like, eachLike, regex } = Matchers;

const provider = new PactV4({
  consumer: "smartbear-mcp",
  provider: "pactflow-ai-api",
  dir: path.resolve(process.cwd(), "pacts"),
  logLevel: "error",
});

const jsonHeaders = {
  Authorization: like("Bearer test-token"),
  "Content-Type": regex("application/json.*", "application/json"),
};

describe("AI – generate", () => {
  it("POST /api/ai/generate – submits a Pact test generation request", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to submit a Pact test generation job")
      .withRequest("POST", "/api/ai/generate", (b) => {
        b.headers(jsonHeaders).jsonBody(like({ language: "typescript" }));
      })
      .willRespondWith(202, (b) => {
        b.jsonBody(
          like({
            status: like("accepted"),
            session_id: like("abc123"),
            submitted_at: like("2024-01-01T00:00:00.000Z"),
            status_url: like("https://example.com/api/ai/status/abc123"),
            result_url: like("https://example.com/api/ai/result/abc123"),
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/ai/generate`, {
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ language: "typescript" }),
        });
        expect(response.status).toBe(202);
        const body = await response.json();
        expect(body.status).toBeDefined();
        expect(body.session_id).toBeDefined();
        expect(body.status_url).toBeDefined();
        expect(body.result_url).toBeDefined();
      }));
});

describe("AI – entitlement", () => {
  it("GET /api/ai/entitlement – returns AI entitlement information", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to check AI entitlements")
      .withRequest("GET", "/api/ai/entitlement", (b) => {
        b.headers({ Authorization: like("Bearer test-token") });
      })
      .willRespondWith(200, (b) => {
        b.jsonBody(
          like({
            organizationEntitlements: like({
              name: "test-org",
              planAiEnabled: true,
              preferencesAiEnabled: true,
              aiCredits: like({ total: 1000, used: 100 }),
            }),
            userEntitlements: like({
              aiPermissions: eachLike("ai:generate"),
            }),
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/ai/entitlement`, {
          headers: { Authorization: "Bearer test-token" },
        });
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.organizationEntitlements).toBeDefined();
        expect(body.userEntitlements).toBeDefined();
      }));
});

describe("AI – review", () => {
  it("POST /api/ai/review – submits a Pact test review request", () =>
    provider
      .addInteraction()
      .uponReceiving("a request to submit a Pact test review job")
      .withRequest("POST", "/api/ai/review", (b) => {
        b.headers(jsonHeaders).jsonBody(
          like({
            pactTests: like({
              filename: "pact.test.js",
              body: "describe('Pact test', () => {});",
              language: "javascript",
            }),
            language: "javascript",
          }),
        );
      })
      .willRespondWith(202, (b) => {
        b.jsonBody(
          like({
            status: like("accepted"),
            session_id: like("abc123"),
            submitted_at: like("2024-01-01T00:00:00.000Z"),
            status_url: like("https://example.com/api/ai/status/abc123"),
            result_url: like("https://example.com/api/ai/result/abc123"),
          }),
        );
      })
      .executeTest(async (mockServer) => {
        const response = await fetch(`${mockServer.url}/api/ai/review`, {
          method: "POST",
          headers: {
            Authorization: "Bearer test-token",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            pactTests: {
              filename: "pact.test.js",
              body: "describe('Pact test', () => {});",
              language: "javascript",
            },
            language: "javascript",
          }),
        });
        expect(response.status).toBe(202);
        const body = await response.json();
        expect(body.status).toBeDefined();
        expect(body.session_id).toBeDefined();
        expect(body.status_url).toBeDefined();
        expect(body.result_url).toBeDefined();
      }));
});
