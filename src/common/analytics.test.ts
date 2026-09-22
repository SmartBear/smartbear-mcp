import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { requestContextStorage } from "./request-context";
import type { SmartBearMcpServer } from "./server";
import type { Client } from "./types";

// Stand-in for the Amplitude Node SDK instance created by initAnalytics().
const amplitudeMock = {
  init: vi.fn(() => ({ promise: Promise.resolve() })),
  track: vi.fn(() => ({ promise: Promise.resolve({}) })),
  flush: vi.fn(() => ({ promise: Promise.resolve() })),
};

vi.mock("@amplitude/analytics-node", () => ({
  createInstance: vi.fn(() => amplitudeMock),
  Types: { LogLevel: { None: 0 } },
}));

vi.mock("./info", () => ({
  MCP_SERVER_VERSION: "9.9.9",
  getUserAgent: vi.fn(() => "SmartBear MCP Server/9.9.9 http (client: test)"),
}));

import {
  ANALYTICS_API_KEY_ENV,
  AnalyticsEvent,
  AnalyticsSession,
  analyticsIdFromEmail,
  analyticsIdFromUserId,
  createAnalyticsSession,
  errorTypeOf,
  flushAnalytics,
  initAnalytics,
  isAnalyticsEnabled,
  isToolsListRequest,
  mcpClientProperties,
  resetAnalyticsForTests,
  resolveClientIdentity,
  resolveSessionIdentity,
  trackEvent,
  trackToolCalled,
  trackToolsListed,
} from "./analytics";

const ENABLED_ENV = { [ANALYTICS_API_KEY_ENV]: "amp-key" };

const TEST_MCP_CLIENT = {
  name: "cursor",
  version: "1.0.0",
  protocolVersion: "2025-11-25",
};

const USER_AGENT = "SmartBear MCP Server/9.9.9 http (client: test)";

// What every identified event must carry for user@example.com.
const USER_HASH = analyticsIdFromEmail("user@example.com");

const b64 = (value: unknown) =>
  Buffer.from(JSON.stringify(value)).toString("base64url");
const jwt = (payload: unknown) => `${b64({ alg: "none" })}.${b64(payload)}.sig`;

/** Run `fn` as if serving a request that carries `payload` as a bearer JWT. */
function withBearer<T>(payload: Record<string, unknown>, fn: () => T): T {
  return requestContextStorage.run(
    { headers: { authorization: `Bearer ${jwt(payload)}` } },
    fn,
  );
}

function fakeClient(overrides: Partial<Client> = {}): Client {
  return {
    name: "Test",
    capabilityPrefix: "test",
    configPrefix: "Test",
    config: {} as any,
    configure: vi.fn(),
    isConfigured: () => true,
    registerTools: vi.fn(),
    ...overrides,
  } as Client;
}

function fakeServer(
  overrides: Partial<Record<keyof SmartBearMcpServer, unknown>> = {},
): SmartBearMcpServer {
  return {
    getMcpClientIdentity: () => TEST_MCP_CLIENT,
    getClients: () => [],
    getEnabledToolsets: () => undefined,
    ...overrides,
  } as unknown as SmartBearMcpServer;
}

function trackedEvents(): Array<{
  type: string;
  properties: Record<string, unknown>;
  options: Record<string, unknown>;
}> {
  return amplitudeMock.track.mock.calls.map((call: any[]) => ({
    type: call[0],
    properties: call[1],
    options: call[2],
  }));
}

beforeEach(() => {
  resetAnalyticsForTests();
  amplitudeMock.init.mockClear();
  amplitudeMock.track.mockClear();
  amplitudeMock.flush.mockClear();
  amplitudeMock.flush.mockImplementation(() => ({
    promise: Promise.resolve(),
  }));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("analyticsIdFromEmail", () => {
  it("matches the Auth0 formula: sha256(email.toLowerCase()) as hex", () => {
    // Known vector for "user@example.com".
    expect(USER_HASH).toBe(
      "b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514",
    );
  });

  it("is case-insensitive and ignores surrounding whitespace", () => {
    expect(analyticsIdFromEmail("  User@Example.COM ")).toBe(USER_HASH);
  });
});

describe("analyticsIdFromUserId", () => {
  it("hashes the integration-prefixed, trimmed id", () => {
    expect(analyticsIdFromUserId("acme", " 42 ")).toBe(
      createHash("sha256").update("acme:42").digest("hex"),
    );
  });

  it("keeps equal ids from different integrations apart", () => {
    expect(analyticsIdFromUserId("zephyr", "12345")).not.toBe(
      analyticsIdFromUserId("qmetry", "12345"),
    );
  });

  it("preserves the case of product ids", () => {
    expect(analyticsIdFromUserId("acme", "ABC")).not.toBe(
      analyticsIdFromUserId("acme", "abc"),
    );
  });
});

describe("initAnalytics", () => {
  it("stays disabled without an API key", () => {
    expect(initAnalytics({})).toBe(false);
    expect(isAnalyticsEnabled()).toBe(false);
    expect(amplitudeMock.init).not.toHaveBeenCalled();
  });

  it("treats a blank API key as absent", () => {
    expect(initAnalytics({ [ANALYTICS_API_KEY_ENV]: "   " })).toBe(false);
    expect(isAnalyticsEnabled()).toBe(false);
  });

  it("initialises the SDK silently when a key is present", () => {
    expect(initAnalytics(ENABLED_ENV)).toBe(true);
    expect(isAnalyticsEnabled()).toBe(true);
    expect(amplitudeMock.init).toHaveBeenCalledWith("amp-key", {
      logLevel: 0,
    });
  });

  it("is idempotent", () => {
    initAnalytics(ENABLED_ENV);
    initAnalytics(ENABLED_ENV);
    expect(amplitudeMock.init).toHaveBeenCalledTimes(1);
  });

  it("degrades to disabled when the SDK throws during init", () => {
    amplitudeMock.init.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    expect(initAnalytics(ENABLED_ENV)).toBe(false);
    expect(isAnalyticsEnabled()).toBe(false);
  });
});

describe("resolveClientIdentity", () => {
  const client = fakeClient({
    capabilityPrefix: "acme",
    analytics: {
      appName: "Acme",
      userId: ["userId", "context.user.accountId"],
      organizationId: ["org_id"],
    },
  });
  const anonymous = {
    analytics_id: undefined,
    organization: undefined,
    app_name: "Acme",
  };

  it("is anonymous outside a request context but keeps app_name", () => {
    expect(resolveClientIdentity(client)).toEqual(anonymous);
  });

  it("is anonymous for an opaque bearer token", () => {
    expect(
      requestContextStorage.run(
        { headers: { authorization: "Bearer not-a-jwt" } },
        () => resolveClientIdentity(client),
      ),
    ).toEqual(anonymous);
  });

  it("hashes an email claim with the SmartBear formula, ignoring user ids", () => {
    expect(
      withBearer({ email: "User@Example.com", userId: 7 }, () =>
        resolveClientIdentity(client),
      ).analytics_id,
    ).toBe(USER_HASH);
  });

  it("matches a namespaced email claim", () => {
    expect(
      withBearer({ "https://smartbear.com/email": "user@example.com" }, () =>
        resolveClientIdentity(client),
      ).analytics_id,
    ).toBe(USER_HASH);
  });

  it("falls back to the declared user id paths, prefixed with the integration", () => {
    expect(
      withBearer({ userId: 4185074 }, () => resolveClientIdentity(client))
        .analytics_id,
    ).toBe(analyticsIdFromUserId("acme", "4185074"));
    expect(
      withBearer({ context: { user: { accountId: "acc-1" } } }, () =>
        resolveClientIdentity(client),
      ).analytics_id,
    ).toBe(analyticsIdFromUserId("acme", "acc-1"));
  });

  it("reads the organization from its declared path and omits it otherwise", () => {
    expect(
      withBearer({ org_id: "org_1" }, () => resolveClientIdentity(client)),
    ).toEqual({ ...anonymous, organization: "org_1" });
    expect(
      withBearer({ organization: "org_1" }, () => resolveClientIdentity(client))
        .organization,
    ).toBeUndefined();
  });

  it("identifies from an email claim even without a declaration", () => {
    expect(
      withBearer({ email: "user@example.com" }, () =>
        resolveClientIdentity(fakeClient()),
      ),
    ).toEqual({
      analytics_id: USER_HASH,
      organization: undefined,
      app_name: undefined,
    });
  });

  it("never uses a user id claim that was not declared", () => {
    expect(
      withBearer({ sub: "someone" }, () => resolveClientIdentity(fakeClient()))
        .analytics_id,
    ).toBeUndefined();
  });
});

describe("resolveClientIdentity with a declared token header", () => {
  /** Run `fn` as if serving a request carrying these raw headers. */
  const withHeaders = <T>(
    headers: Record<string, string | undefined>,
    fn: () => T,
  ) => requestContextStorage.run({ headers }, fn);

  // A product whose credential arrives in its own header, not Authorization.
  const client = fakeClient({
    capabilityPrefix: "acme",
    analytics: {
      tokenHeader: "Acme-Api-Token",
      userId: ["sub"],
      organizationId: ["org_id"],
    },
  });

  it("identifies the caller from the product header", () => {
    expect(
      withHeaders(
        { "acme-api-token": jwt({ sub: "user-7", org_id: "org_1" }) },
        () => resolveClientIdentity(client),
      ),
    ).toEqual({
      analytics_id: analyticsIdFromUserId("acme", "user-7"),
      organization: "org_1",
      app_name: undefined,
    });
  });

  it("still prefers an email claim from that header", () => {
    expect(
      withHeaders(
        {
          "acme-api-token": jwt({ sub: "user-7", email: "User@Example.com" }),
        },
        () => resolveClientIdentity(client),
      ).analytics_id,
    ).toBe(USER_HASH);
  });

  it("stays anonymous when the product header holds an opaque API key", () => {
    expect(
      withHeaders({ "acme-api-token": "opaque-api-key" }, () =>
        resolveClientIdentity(client),
      ),
    ).toEqual({
      analytics_id: undefined,
      organization: undefined,
      app_name: undefined,
    });
  });

  it("falls back to Authorization when the product header is absent", () => {
    expect(
      withHeaders({ authorization: `Bearer ${jwt({ sub: "user-9" })}` }, () =>
        resolveClientIdentity(client),
      ).analytics_id,
    ).toBe(analyticsIdFromUserId("acme", "user-9"));
  });

  it("leaves clients without a declaration reading Authorization only", () => {
    const standard = fakeClient({
      capabilityPrefix: "bugsnag",
      analytics: { userId: ["sub"] },
    });
    expect(
      withHeaders({ "acme-api-token": jwt({ sub: "user-7" }) }, () =>
        resolveClientIdentity(standard),
      ).analytics_id,
    ).toBeUndefined();
  });
});

describe("resolveSessionIdentity", () => {
  it("returns the first client that yields an identity, with its app_name", () => {
    const anonymous = fakeClient({ analytics: { appName: "Test" } });
    const identified = fakeClient({
      analytics: { appName: "BugSnag", organizationId: ["org_id"] },
    });
    expect(
      withBearer({ org_id: "org_9" }, () =>
        resolveSessionIdentity([anonymous, identified]),
      ),
    ).toEqual({
      analytics_id: undefined,
      organization: "org_9",
      app_name: "BugSnag",
    });
  });

  it("falls back to the first app_name when no client yields an identity", () => {
    const first = fakeClient({ analytics: { appName: "BugSnag" } });
    const second = fakeClient({ analytics: { appName: "Test" } });
    expect(resolveSessionIdentity([first, second]).app_name).toBe("BugSnag");
  });
});

describe("trackEvent", () => {
  it("does nothing when analytics is disabled", () => {
    trackEvent(AnalyticsEvent.TOOL_CALLED, {}, { tool_name: "x" });
    expect(amplitudeMock.track).not.toHaveBeenCalled();
  });

  it("sends the five required properties plus event properties", () => {
    initAnalytics(ENABLED_ENV);
    trackEvent(
      AnalyticsEvent.TOOL_CALLED,
      { analytics_id: "hash", organization: "org_1", app_name: "BugSnag" },
      { tool_name: "bugsnag_list_projects" },
      { sessionId: "sess-1", sessionStartedAt: 1234 },
    );

    const [event] = trackedEvents();
    expect(event.type).toBe("Tool Called");
    expect(event.properties).toEqual({
      app_name: "BugSnag",
      organization: "org_1",
      analytics_id: "hash",
      source: "MCP",
      user_agent: USER_AGENT,
      tool_name: "bugsnag_list_projects",
    });
    expect(event.options).toMatchObject({
      user_id: "hash",
      device_id: "sess-1",
      session_id: 1234,
      app_version: "9.9.9",
    });
    expect(event.options.insert_id).toEqual(expect.any(String));
    expect(event.options.time).toEqual(expect.any(Number));
  });

  it("omits unresolved identity properties instead of sending null or empty", () => {
    initAnalytics(ENABLED_ENV);
    trackEvent(AnalyticsEvent.SESSION_ENDED, {}, { session_id: "s" });

    const [event] = trackedEvents();
    expect(Object.keys(event.properties).sort()).toEqual([
      "session_id",
      "source",
      "user_agent",
    ]);
    expect(event.options.user_id).toBeUndefined();
  });

  it("uses a stable anonymous device id when there is no user and no session", () => {
    initAnalytics(ENABLED_ENV);
    trackEvent(AnalyticsEvent.TOOL_CALLED, {}, {});
    trackEvent(AnalyticsEvent.TOOL_CALLED, {}, {});

    const [first, second] = trackedEvents();
    expect(first.options.device_id).toEqual(expect.any(String));
    expect(first.options.device_id).toBe(second.options.device_id);
  });

  it("never shares that anonymous device id with an identified user", () => {
    initAnalytics(ENABLED_ENV);
    trackEvent(AnalyticsEvent.TOOL_CALLED, { analytics_id: "hash" }, {});

    const [event] = trackedEvents();
    expect(event.options.user_id).toBe("hash");
    expect(event.options.device_id).toBeUndefined();
  });

  it("prefers a pre-captured user agent", () => {
    initAnalytics(ENABLED_ENV);
    trackEvent(AnalyticsEvent.SESSION_ENDED, {}, {}, { userAgent: "captured" });
    expect(trackedEvents()[0].properties.user_agent).toBe("captured");
  });

  it("swallows SDK errors", () => {
    initAnalytics(ENABLED_ENV);
    amplitudeMock.track.mockImplementationOnce(() => {
      throw new Error("network");
    });
    expect(() => trackEvent(AnalyticsEvent.TOOL_CALLED, {}, {})).not.toThrow();
  });
});

describe("flushAnalytics", () => {
  it("resolves immediately when disabled", async () => {
    await expect(flushAnalytics()).resolves.toBeUndefined();
    expect(amplitudeMock.flush).not.toHaveBeenCalled();
  });

  it("awaits the SDK flush when enabled", async () => {
    initAnalytics(ENABLED_ENV);
    await flushAnalytics();
    expect(amplitudeMock.flush).toHaveBeenCalledTimes(1);
  });

  it("resolves even if the SDK flush rejects", async () => {
    initAnalytics(ENABLED_ENV);
    amplitudeMock.flush.mockImplementationOnce(() => ({
      promise: Promise.reject(new Error("offline")),
    }));
    await expect(flushAnalytics()).resolves.toBeUndefined();
  });

  it("resolves even if the SDK flush throws synchronously", async () => {
    initAnalytics(ENABLED_ENV);
    amplitudeMock.flush.mockImplementationOnce(() => {
      throw new Error("boom");
    });
    await expect(flushAnalytics()).resolves.toBeUndefined();
  });

  it("gives up after the flush timeout when Amplitude hangs", async () => {
    vi.useFakeTimers();
    initAnalytics(ENABLED_ENV);
    amplitudeMock.flush.mockImplementationOnce(() => ({
      promise: new Promise<void>(() => {}),
    }));

    const pending = flushAnalytics();
    await vi.advanceTimersByTimeAsync(5_000);
    await expect(pending).resolves.toBeUndefined();
  });

  it("makes a concurrent caller wait for the in-flight send, then flushes once more", async () => {
    initAnalytics(ENABLED_ENV);
    let finishFirstSend!: () => void;
    amplitudeMock.flush.mockImplementationOnce(() => ({
      promise: new Promise<void>((resolve) => {
        finishFirstSend = resolve;
      }),
    }));

    const fireAndForget = flushAnalytics(); // as Session Ended does at close
    let shutdownDone = false;
    const shutdown = flushAnalytics().then(() => {
      shutdownDone = true;
    });
    await Promise.resolve();
    expect(shutdownDone).toBe(false);
    expect(amplitudeMock.flush).toHaveBeenCalledTimes(1);

    finishFirstSend();
    await Promise.all([fireAndForget, shutdown]);
    expect(shutdownDone).toBe(true);
    // The follow-up pass catches anything tracked while the first send ran.
    expect(amplitudeMock.flush).toHaveBeenCalledTimes(2);
  });

  it("runs independent flushes sequentially without a follow-up", async () => {
    initAnalytics(ENABLED_ENV);
    await flushAnalytics();
    await flushAnalytics();
    expect(amplitudeMock.flush).toHaveBeenCalledTimes(2);
  });
});

describe("errorTypeOf", () => {
  it("returns the error class name, never the message", () => {
    class CustomError extends Error {}
    expect(errorTypeOf(new CustomError("secret details"))).toBe("CustomError");
    expect(errorTypeOf(new TypeError("x"))).toBe("TypeError");
    expect(errorTypeOf(new Error("x"))).toBe("Error");
  });

  it("classifies non-Error throwables", () => {
    expect(errorTypeOf("oops")).toBe("UnknownError");
    expect(errorTypeOf(undefined)).toBe("UnknownError");
  });
});

describe("trackToolCalled", () => {
  it("does nothing when disabled", () => {
    trackToolCalled({
      client: fakeClient(),
      toolName: "test_tool",
      success: true,
      durationMs: 1,
      errorType: null,
      mcpClient: TEST_MCP_CLIENT,
    });
    expect(amplitudeMock.track).not.toHaveBeenCalled();
  });

  it("resolves identity from the owning integration and reports the outcome", () => {
    initAnalytics(ENABLED_ENV);
    const client = fakeClient({
      capabilityPrefix: "bugsnag",
      analytics: { appName: "BugSnag", organizationId: ["org_id"] },
    });

    withBearer({ email: "user@example.com", org_id: "org_1" }, () =>
      trackToolCalled({
        client,
        toolName: "bugsnag_get_error",
        success: false,
        durationMs: 42,
        errorType: "ToolError",
        mcpClient: TEST_MCP_CLIENT,
      }),
    );

    const [event] = trackedEvents();
    expect(event.type).toBe("Tool Called");
    expect(event.properties).toEqual({
      app_name: "BugSnag",
      organization: "org_1",
      analytics_id: USER_HASH,
      source: "MCP",
      user_agent: USER_AGENT,
      session_id: null,
      tool_name: "bugsnag_get_error",
      integration: "bugsnag",
      success: false,
      duration_ms: 42,
      error_type: "ToolError",
      mcp_client_name: "cursor",
      mcp_client_version: "1.0.0",
      protocol_version: "2025-11-25",
    });
  });

  it("attributes the call to its session and bumps the session counter", () => {
    initAnalytics(ENABLED_ENV);
    const session = new AnalyticsSession({
      sessionId: "sess-7",
      transport: "streamable-http",
      server: fakeServer(),
      integrations: [],
    });

    trackToolCalled({
      client: fakeClient(),
      toolName: "test_tool",
      success: true,
      durationMs: 5,
      errorType: null,
      mcpClient: TEST_MCP_CLIENT,
      session,
    });

    const [event] = trackedEvents();
    expect(event.properties.session_id).toBe("sess-7");
    expect(event.options.device_id).toBe("sess-7");
    expect(event.options.session_id).toBe(session.startedAt);
  });
});

describe("AnalyticsSession", () => {
  function startedSession(
    serverOverrides: Partial<Record<keyof SmartBearMcpServer, unknown>> = {},
    bearer?: Record<string, unknown>,
  ) {
    initAnalytics(ENABLED_ENV);
    const session = new AnalyticsSession({
      sessionId: "sess-1",
      transport: "streamable-http",
      server: fakeServer(serverOverrides),
      integrations: ["bugsnag", "swagger"],
    });
    const start = () => session.onInitialized();
    if (bearer) {
      withBearer(bearer, start);
    } else {
      start();
    }
    return session;
  }

  it("createAnalyticsSession returns nothing while analytics is disabled", () => {
    expect(
      createAnalyticsSession({
        sessionId: "s",
        transport: "sse",
        server: fakeServer(),
        integrations: [],
      }),
    ).toBeUndefined();
  });

  it("createAnalyticsSession returns a session when enabled", () => {
    initAnalytics(ENABLED_ENV);
    expect(
      createAnalyticsSession({
        sessionId: "s",
        transport: "sse",
        server: fakeServer(),
        integrations: [],
      }),
    ).toBeInstanceOf(AnalyticsSession);
  });

  it("emits Session Started then Server Initialized on initialize", () => {
    const configured = fakeClient({
      capabilityPrefix: "bugsnag",
      getAuthToken: () => "Bearer jwt",
      analytics: { appName: "BugSnag", organizationId: ["org_id"] },
    });
    startedSession(
      {
        getClients: () => [configured],
        getEnabledToolsets: () => ["bugsnag:projects"],
      },
      { email: "user@example.com", org_id: "org_1" },
    );

    const events = trackedEvents();
    expect(events.map((e) => e.type)).toEqual([
      "Session Started",
      "Server Initialized",
    ]);

    const identity = {
      app_name: "BugSnag",
      organization: "org_1",
      analytics_id: USER_HASH,
      source: "MCP",
      user_agent: USER_AGENT,
      mcp_client_name: "cursor",
      mcp_client_version: "1.0.0",
      protocol_version: "2025-11-25",
    };
    expect(events[0].properties).toEqual({
      ...identity,
      session_id: "sess-1",
      transport: "streamable-http",
      enabled_toolsets: ["bugsnag:projects"],
      enabled_integrations: ["bugsnag", "swagger"],
      configured_integrations: ["bugsnag"],
      not_configured_integrations: ["swagger"],
    });
    expect(events[1].properties).toEqual({
      ...identity,
      transport: "streamable-http",
      server_version: "9.9.9",
    });
    for (const event of events) {
      expect(event.options).toMatchObject({
        user_id: USER_HASH,
        device_id: "sess-1",
      });
    }
  });

  it("treats a client without a per-request credential as not configured", () => {
    const unauthenticated = fakeClient({
      capabilityPrefix: "bugsnag",
      getAuthToken: () => null,
    });
    const configured = fakeClient({ capabilityPrefix: "swagger" });
    startedSession({ getClients: () => [unauthenticated, configured] });

    expect(trackedEvents()[0].properties).toMatchObject({
      configured_integrations: ["swagger"],
      not_configured_integrations: ["bugsnag"],
    });
  });

  it("reports null client details when the client did not identify itself", () => {
    startedSession({ getMcpClientIdentity: () => ({}) });
    expect(trackedEvents()[0].properties).toMatchObject({
      mcp_client_name: null,
      mcp_client_version: null,
      enabled_toolsets: null,
    });
    expect(trackedEvents()[1].properties.protocol_version).toBeNull();
  });

  it("only handles initialize once per session", () => {
    const session = startedSession();
    session.onInitialized();
    expect(amplitudeMock.track).toHaveBeenCalledTimes(2);
  });

  it("emits Session Ended with duration and tool count, then flushes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-11T10:00:00Z"));
    const session = startedSession();
    session.recordToolCall();
    session.recordToolCall();
    vi.setSystemTime(new Date("2026-09-11T10:00:30Z"));

    session.end("client_disconnected");

    const ended = trackedEvents()[2];
    expect(ended.type).toBe("Session Ended");
    expect(ended.properties).toMatchObject({
      session_id: "sess-1",
      duration_ms: 30_000,
      tool_call_count: 2,
      end_reason: "client_disconnected",
      source: "MCP",
    });
    expect(amplitudeMock.flush).toHaveBeenCalledTimes(1);
  });

  it("reuses the user agent captured at session start for Session Ended", async () => {
    const session = startedSession();
    const { getUserAgent } = await import("./info");
    vi.mocked(getUserAgent).mockReturnValueOnce("someone else's client");

    session.end("server_shutdown");

    expect(trackedEvents()[2].properties.user_agent).toBe(USER_AGENT);
  });

  it("is idempotent on end", () => {
    const session = startedSession();
    session.end("client_disconnected");
    session.end("server_shutdown");
    expect(amplitudeMock.track).toHaveBeenCalledTimes(3);
    expect(amplitudeMock.flush).toHaveBeenCalledTimes(1);
  });

  it("does not emit Session Ended for a session that never initialised", () => {
    initAnalytics(ENABLED_ENV);
    const session = new AnalyticsSession({
      sessionId: "sess-1",
      transport: "sse",
      server: fakeServer(),
      integrations: [],
    });
    session.end("client_disconnected");
    expect(amplitudeMock.track).not.toHaveBeenCalled();
  });

  it("survives a server that throws while being inspected", () => {
    initAnalytics(ENABLED_ENV);
    const session = new AnalyticsSession({
      sessionId: "sess-1",
      transport: "sse",
      server: fakeServer({
        getClients: () => {
          throw new Error("broken");
        },
      }),
      integrations: [],
    });
    expect(() => session.onInitialized()).not.toThrow();
  });
});

describe("mcpClientProperties", () => {
  it("maps the client identity onto explicit snake_case properties", () => {
    expect(mcpClientProperties(TEST_MCP_CLIENT)).toEqual({
      mcp_client_name: "cursor",
      mcp_client_version: "1.0.0",
      protocol_version: "2025-11-25",
    });
  });

  it("reports null, not undefined, for an unidentified client", () => {
    expect(mcpClientProperties({})).toEqual({
      mcp_client_name: null,
      mcp_client_version: null,
      protocol_version: null,
    });
  });
});

describe("isToolsListRequest", () => {
  it("recognises a tools/list request", () => {
    expect(
      isToolsListRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    ).toBe(true);
  });

  it("recognises a batch containing tools/list", () => {
    expect(
      isToolsListRequest([
        { jsonrpc: "2.0", method: "notifications/initialized" },
        { jsonrpc: "2.0", id: 2, method: "tools/list" },
      ]),
    ).toBe(true);
  });

  it("rejects other methods and non-messages", () => {
    expect(isToolsListRequest({ method: "tools/call" })).toBe(false);
    expect(isToolsListRequest({ method: "initialize" })).toBe(false);
    expect(isToolsListRequest([])).toBe(false);
    expect(isToolsListRequest(null)).toBe(false);
    expect(isToolsListRequest("tools/list")).toBe(false);
    expect(isToolsListRequest(undefined)).toBe(false);
  });
});

describe("trackToolsListed", () => {
  it("does nothing when analytics is disabled", () => {
    const getClients = vi.fn().mockReturnValue([]);
    trackToolsListed(fakeServer({ getClients }));
    expect(getClients).not.toHaveBeenCalled();
    expect(amplitudeMock.track).not.toHaveBeenCalled();
  });

  it("emits Tools Listed without a session on the sessionless protocol", () => {
    initAnalytics(ENABLED_ENV);
    const server = fakeServer({
      getClients: () => [fakeClient({ analytics: { appName: "BugSnag" } })],
      getAnalyticsSession: () => undefined,
      getMcpClientIdentity: () => ({
        name: "modern-client",
        version: "2.0.0",
        protocolVersion: "2026-07-28",
      }),
    });

    withBearer({ email: "user@example.com" }, () => trackToolsListed(server));

    const [event] = trackedEvents();
    expect(event.type).toBe("Tools Listed");
    expect(event.properties).toEqual({
      app_name: "BugSnag",
      analytics_id: USER_HASH,
      source: "MCP",
      user_agent: USER_AGENT,
      session_id: null,
      mcp_client_name: "modern-client",
      mcp_client_version: "2.0.0",
      protocol_version: "2026-07-28",
    });
    expect(event.options.user_id).toBe(USER_HASH);
    expect(event.options.session_id).toBeUndefined();
  });

  it("attributes Tools Listed to the session on the legacy protocol", () => {
    initAnalytics(ENABLED_ENV);
    const session = new AnalyticsSession({
      sessionId: "sess-9",
      transport: "streamable-http",
      server: fakeServer(),
      integrations: [],
    });
    const server = fakeServer({ getAnalyticsSession: () => session });

    trackToolsListed(server);

    const [event] = trackedEvents();
    expect(event.properties).toMatchObject({
      session_id: "sess-9",
      mcp_client_name: "cursor",
      protocol_version: "2025-11-25",
    });
    expect(event.options.device_id).toBe("sess-9");
    expect(event.options.session_id).toBe(session.startedAt);
  });

  it("swallows a server that throws", () => {
    initAnalytics(ENABLED_ENV);
    const server = fakeServer({
      getClients: () => {
        throw new Error("broken");
      },
    });
    expect(() => trackToolsListed(server)).not.toThrow();
  });
});
