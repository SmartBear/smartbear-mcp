import type { IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import { CacheService } from "../common/cache.js";
import { withRequestContext } from "../common/request-context.js";
import type { SmartBearMcpServer } from "../common/server.js";
import { BugsnagClient } from "./client.js";

// Reproduction for the theorized cross-tenant leak: a SINGLE MCP session
// (one server/client/cache instance) receiving requests for two different
// tenants via per-request auth headers, as getAuthToken() is designed to
// support (see request-context.ts). This is NOT the same as two separate
// sessions/servers, which are already correctly isolated by cloneClient.

const TOKEN_A = "tok-companyA";
const TOKEN_B = "tok-companyB";

const DATA: Record<string, { org: any; projects: any[] }> = {
  [TOKEN_A]: {
    org: { id: "orgA", slug: "company-a", name: "Company A" },
    projects: [{ id: "a1", name: "A-Payments", api_key: "aaa" }],
  },
  [TOKEN_B]: {
    org: { id: "orgB", slug: "company-b", name: "Company B" },
    projects: [{ id: "b1", name: "B-Secret-Project", api_key: "bbb" }],
  },
};

function requestWithToken(token: string): IncomingMessage {
  return {
    headers: { "bugsnag-auth-token": token },
  } as unknown as IncomingMessage;
}

describe("BugSnag cross-tenant project leak within a single session", () => {
  it("second request in the SAME session, carrying a different tenant's auth token, must not receive the first tenant's cached projects", async () => {
    const cache = new CacheService();
    const mockServer = {
      getCache: () => cache,
    } as unknown as SmartBearMcpServer;

    const client = new BugsnagClient();
    await client.configure(mockServer, { auth_token: "unused-fallback" });

    // Make the stubbed API resolve tenant data from whichever token
    // client.getAuthToken() resolves for the CURRENT call - exactly how the
    // real Configuration's `apiKey` callback resolves auth per outbound call.
    (client as any)._currentUserApi = {
      listUserOrganizations: async () => {
        const token = (client as any).getAuthToken().replace(/^token /, "");
        return { body: [DATA[token].org] };
      },
      getOrganizationProjects: async () => {
        const token = (client as any).getAuthToken().replace(/^token /, "");
        return { body: DATA[token].projects };
      },
    };

    // Request 1: Company A calls list_projects in this session.
    const aProjects = await withRequestContext(requestWithToken(TOKEN_A), () =>
      client.getProjects(),
    );
    expect(aProjects).toEqual(DATA[TOKEN_A].projects);

    // Request 2: Company B calls list_projects in the SAME session - e.g. a
    // gateway multiplexing multiple end-users through one upstream MCP
    // session, or a reused/pooled session id.
    const bProjects = await withRequestContext(requestWithToken(TOKEN_B), () =>
      client.getProjects(),
    );

    expect(bProjects).not.toEqual(DATA[TOKEN_A].projects);
    expect(bProjects).toEqual(DATA[TOKEN_B].projects);
  });
});
