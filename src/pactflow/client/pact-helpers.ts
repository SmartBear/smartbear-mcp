/**
 * Shared fixtures for the PactflowClient Pact V4 consumer tests.
 *
 * Every `*-api.pact.test.ts` file in this directory uses the same consumer /
 * provider pair, so the generated pact is written to a single file in ./pacts/.
 */

import path from "node:path";
import { Matchers, PactV4 } from "@pact-foundation/pact";
import { expect } from "vitest";
import { CacheService } from "../../common/cache";
import { PactflowClient } from "../client";

const { like, regex } = Matchers;

export const provider = new PactV4({
  consumer: "smartbear-mcp",
  provider: "pactflow-application-saas",
  dir: path.resolve(process.cwd(), "pacts"),
  logLevel: "error",
});

export async function createClient(baseUrl: string): Promise<PactflowClient> {
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

export const authHeader = { Authorization: like("Bearer test-token") };
export const jsonHeaders = {
  Authorization: like("Bearer test-token"),
  "Content-Type": regex("application/json.*", "application/json"),
};
export const halJsonResponseHeaders = {
  "Content-Type": regex(
    "application/(hal\\+json|json)(;.*)?",
    "application/json",
  ),
};

export const timestamp = like("2024-01-01T00:00:00.000Z");

export const halLink = like({ href: "https://example.pactflow.io/resource" });

export const selfLink = { self: halLink };

export const pageBody = like({
  number: 1,
  size: 5,
  totalElements: 1,
  totalPages: 1,
});

export function expectErrorStatus(opts: {
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
