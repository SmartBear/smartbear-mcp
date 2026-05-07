import type { IncomingMessage, ServerResponse } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clientRegistry } from "../../../common/client-registry";
import {
  drainHttpTransport,
  getBaseUrl,
  getHeaderName,
  handleHealthRequest,
  handleReadyRequest,
  newServer,
} from "../../../common/transport-http";
import type { Client } from "../../../common/types";

function fakeRequest(
  headers: Record<string, string | string[] | undefined>,
): IncomingMessage {
  return { headers } as unknown as IncomingMessage;
}

function fakeClient(configPrefix: string): Client {
  return { configPrefix } as unknown as Client;
}

/**
 * Create a mock ServerResponse that captures writeHead/end calls
 */
function fakeResponse(): ServerResponse & {
  _status: number | null;
  _headers: Record<string, string>;
  _body: string;
} {
  const res = {
    _status: null as number | null,
    _headers: {} as Record<string, string>,
    _body: "",
    writeHead(status: number, headers?: Record<string, string>) {
      res._status = status;
      if (headers) {
        Object.assign(res._headers, headers);
      }
    },
    end(body?: string) {
      if (body) res._body = body;
    },
  };
  return res as unknown as ServerResponse & {
    _status: number | null;
    _headers: Record<string, string>;
    _body: string;
  };
}

/**
 * Create a minimal Client that mimics Bugsnag's auth behavior for testing
 */
function createTestClient(
  opts: {
    name?: string;
    configPrefix?: string;
    authToken?: string | null;
    hasGetAuthToken?: boolean;
    requiredFields?: string[];
  } = {},
): Client {
  const {
    name = "TestClient",
    configPrefix = "Test",
    authToken = null,
    hasGetAuthToken = true,
    requiredFields = [],
  } = opts;

  const { z } = require("zod");
  const shape: Record<string, any> = {
    auth_token: z.string().describe("Test auth token").optional(),
  };
  for (const field of requiredFields) {
    shape[field] = z.string().describe(`${field} (required)`);
  }

  const client: any = {
    name,
    toolPrefix: name.toLowerCase(),
    configPrefix,
    config: z.object(shape),
    _configured: false,
    _authToken: authToken,
    configure: vi.fn().mockImplementation(async (_server: any, config: any) => {
      client._configured = true;
      if (config.auth_token) {
        client._authToken = config.auth_token;
      }
    }),
    isConfigured: () => client._configured,
    registerTools: vi.fn(),
    registerResources: vi.fn(),
  };

  if (hasGetAuthToken) {
    client.getAuthToken = () => client._authToken;
  }

  return client;
}

// Mock SmartBearMcpServer
vi.mock("../../../common/server.js", () => ({
  SmartBearMcpServer: vi.fn().mockImplementation(() => ({
    getCache: () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }),
    addClient: vi.fn(),
    getClients: vi.fn().mockReturnValue([]),
    connect: vi.fn(),
    setSamplingSupported: vi.fn(),
    setElicitationSupported: vi.fn(),
    cleanupSession: vi.fn(),
    server: { elicitInput: vi.fn() },
  })),
}));

// Mock Bugsnag
vi.mock("../../../common/bugsnag.js", () => ({
  default: { notify: vi.fn() },
}));

describe("transport-http helpers", () => {
  describe("getBaseUrl", () => {
    afterEach(() => {
      delete process.env.BASE_URL;
    });

    it("should return BASE_URL env var when set", () => {
      process.env.BASE_URL = "https://override.example.com";
      const req = fakeRequest({ host: "localhost:3000" });
      expect(getBaseUrl(req)).toBe("https://override.example.com");
    });

    it("should use x-forwarded-proto and x-forwarded-host when present", () => {
      const req = fakeRequest({
        "x-forwarded-proto": "https",
        "x-forwarded-host": "proxy.example.com",
        host: "localhost:3000",
      });
      expect(getBaseUrl(req)).toBe("https://proxy.example.com");
    });

    it("should default protocol to http when x-forwarded-proto is absent", () => {
      const req = fakeRequest({ host: "myhost:8080" });
      expect(getBaseUrl(req)).toBe("http://myhost:8080");
    });

    it("should fall back to host header when x-forwarded-host is absent", () => {
      const req = fakeRequest({
        "x-forwarded-proto": "https",
        host: "fallback.example.com",
      });
      expect(getBaseUrl(req)).toBe("https://fallback.example.com");
    });

    it("should prefer BASE_URL over proxy headers", () => {
      process.env.BASE_URL = "https://forced.example.com";
      const req = fakeRequest({
        "x-forwarded-proto": "https",
        "x-forwarded-host": "proxy.example.com",
      });
      expect(getBaseUrl(req)).toBe("https://forced.example.com");
    });
  });

  describe("getHeaderName", () => {
    it("should convert snake_case key to kebab-case with client prefix", () => {
      const client = fakeClient("Bugsnag");
      expect(getHeaderName(client, "auth_token")).toBe("Bugsnag-Auth-Token");
    });

    it("should handle single-word keys", () => {
      const client = fakeClient("Reflect");
      expect(getHeaderName(client, "token")).toBe("Reflect-Token");
    });

    it("should handle multi-word keys", () => {
      const client = fakeClient("Bugsnag");
      expect(getHeaderName(client, "project_api_key")).toBe(
        "Bugsnag-Project-Api-Key",
      );
    });

    it("should handle different client prefixes", () => {
      const client = fakeClient("Zephyr");
      expect(getHeaderName(client, "api_token")).toBe("Zephyr-Api-Token");
    });
  });
});

describe("newServer (OAuth flow)", () => {
  let originalGetAll: typeof clientRegistry.getAll;

  beforeEach(() => {
    originalGetAll = clientRegistry.getAll.bind(clientRegistry);
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore clientRegistry.getAll
    clientRegistry.getAll = originalGetAll;
  });

  it("should return 401 with WWW-Authenticate header when no clients are configured", async () => {
    // Override getAll to return no clients
    clientRegistry.getAll = () => [];

    const req = fakeRequest({ host: "myserver.example.com:3000" });
    const res = fakeResponse();

    const server = await newServer(req, res);

    expect(server).toBeNull();
    expect(res._status).toBe(401);
    expect(res._headers["WWW-Authenticate"]).toBe(
      'OAuth resource_metadata="http://myserver.example.com:3000/.well-known/oauth-protected-resource"',
    );
  });

  it("should include Content-Type text/plain in 401 response", async () => {
    clientRegistry.getAll = () => [];
    const req = fakeRequest({ host: "localhost:3000" });
    const res = fakeResponse();

    await newServer(req, res);

    expect(res._status).toBe(401);
    expect(res._headers["Content-Type"]).toBe("text/plain");
  });

  it("should omit WWW-Authenticate header when host header is missing", async () => {
    clientRegistry.getAll = () => [];
    const req = fakeRequest({});
    const res = fakeResponse();

    await newServer(req, res);

    expect(res._status).toBe(401);
    expect(res._headers["WWW-Authenticate"]).toBeUndefined();
  });

  it("should return 401 when clients configure but none have auth credentials", async () => {
    // Client with optional auth that returns null (no token available)
    const testClient = createTestClient({
      name: "NoAuth",
      configPrefix: "NoAuth",
      hasGetAuthToken: true,
      authToken: null,
    });
    clientRegistry.getAll = () => [testClient];

    // Mock SmartBearMcpServer.getClients to return the client
    const { SmartBearMcpServer } = await import("../../../common/server.js");
    vi.mocked(SmartBearMcpServer).mockImplementation(
      () =>
        ({
          getCache: () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }),
          addClient: vi.fn(),
          getClients: () => [testClient],
          connect: vi.fn(),
          setSamplingSupported: vi.fn(),
          setElicitationSupported: vi.fn(),
          cleanupSession: vi.fn(),
          server: { elicitInput: vi.fn() },
        }) as any,
    );

    const req = fakeRequest({ host: "localhost:3000" });
    const res = fakeResponse();

    await newServer(req, res);

    expect(res._status).toBe(401);
    expect(res._body).toContain(
      "No clients have valid authentication credentials",
    );
    expect(res._body).toContain("OAuth");
    expect(res._headers["WWW-Authenticate"]).toContain(
      "oauth-protected-resource",
    );
  });

  it("should return server when client has auth from header", async () => {
    const testClient = createTestClient({
      name: "WithAuth",
      configPrefix: "WithAuth",
      hasGetAuthToken: true,
      authToken: "token my-secret",
    });
    clientRegistry.getAll = () => [testClient];

    const { SmartBearMcpServer } = await import("../../../common/server.js");
    vi.mocked(SmartBearMcpServer).mockImplementation(
      () =>
        ({
          getCache: () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }),
          addClient: vi.fn(),
          getClients: () => [testClient],
          connect: vi.fn(),
          setSamplingSupported: vi.fn(),
          setElicitationSupported: vi.fn(),
          cleanupSession: vi.fn(),
          server: { elicitInput: vi.fn() },
        }) as any,
    );

    const req = fakeRequest({
      host: "localhost:3000",
      "withauth-auth-token": "my-pat",
    });
    const res = fakeResponse();

    const server = await newServer(req, res);

    expect(server).not.toBeNull();
    expect(res._status).toBeNull(); // No error response written
  });

  it("should skip client when dynamic auth check succeeds without getAuthToken", async () => {
    // Client without getAuthToken means auth was provided at config time
    const testClient = createTestClient({
      name: "StaticAuth",
      configPrefix: "StaticAuth",
      hasGetAuthToken: false,
    });
    clientRegistry.getAll = () => [testClient];

    const { SmartBearMcpServer } = await import("../../../common/server.js");
    vi.mocked(SmartBearMcpServer).mockImplementation(
      () =>
        ({
          getCache: () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }),
          addClient: vi.fn(),
          getClients: () => [testClient],
          connect: vi.fn(),
          setSamplingSupported: vi.fn(),
          setElicitationSupported: vi.fn(),
          cleanupSession: vi.fn(),
          server: { elicitInput: vi.fn() },
        }) as any,
    );

    const req = fakeRequest({ host: "localhost:3000" });
    const res = fakeResponse();

    const server = await newServer(req, res);

    expect(server).not.toBeNull();
  });

  it("should fall back to env var when header is not present", async () => {
    const testClient = createTestClient({
      name: "EnvFallback",
      configPrefix: "EnvFallback",
      hasGetAuthToken: false,
    });
    clientRegistry.getAll = () => [testClient];

    const { SmartBearMcpServer } = await import("../../../common/server.js");
    vi.mocked(SmartBearMcpServer).mockImplementation(
      () =>
        ({
          getCache: () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }),
          addClient: vi.fn(),
          getClients: () => [testClient],
          connect: vi.fn(),
          setSamplingSupported: vi.fn(),
          setElicitationSupported: vi.fn(),
          cleanupSession: vi.fn(),
          server: { elicitInput: vi.fn() },
        }) as any,
    );

    // Set env var that matches client prefix + key
    process.env.ENVFALLBACK_AUTH_TOKEN = "env-token";

    const req = fakeRequest({ host: "localhost:3000" });
    const res = fakeResponse();

    const server = await newServer(req, res);

    expect(server).not.toBeNull();
    expect(testClient.configure).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ auth_token: "env-token" }),
    );

    delete process.env.ENVFALLBACK_AUTH_TOKEN;
  });

  it("should include error details and header help in 401 response body", async () => {
    const testClient = createTestClient({
      name: "HelpTest",
      configPrefix: "HelpTest",
      hasGetAuthToken: true,
      authToken: null,
    });
    clientRegistry.getAll = () => [testClient];

    const { SmartBearMcpServer } = await import("../../../common/server.js");
    vi.mocked(SmartBearMcpServer).mockImplementation(
      () =>
        ({
          getCache: () => ({ get: vi.fn(), set: vi.fn(), del: vi.fn() }),
          addClient: vi.fn(),
          getClients: () => [testClient],
          connect: vi.fn(),
          setSamplingSupported: vi.fn(),
          setElicitationSupported: vi.fn(),
          cleanupSession: vi.fn(),
          server: { elicitInput: vi.fn() },
        }) as any,
    );

    const req = fakeRequest({ host: "localhost:3000" });
    const res = fakeResponse();

    await newServer(req, res);

    expect(res._status).toBe(401);
    // Error body should contain the client name and header info
    expect(res._body).toContain("Configuration error");
    expect(res._body).toContain("HelpTest");
    expect(res._body).toContain("HelpTest-Auth-Token");
  });
});

describe("probe endpoints", () => {
  describe("handleHealthRequest (liveness)", () => {
    it("returns 200 with no-store cache header", () => {
      const res = fakeResponse();
      handleHealthRequest(res);
      expect(res._status).toBe(200);
      expect(res._headers["Cache-Control"]).toBe("no-store");
      expect(res._headers["Content-Type"]).toBe("application/json");
      const body = JSON.parse(res._body);
      expect(body.status).toBe("ok");
      expect(body.timestamp).toEqual(expect.any(String));
    });

    // Critical regression guard: liveness must NEVER flip during drain. If
    // it did, the kubelet would kill the pod mid-drain instead of letting
    // it finish gracefully. /ready is the one that flips.
    it("does not depend on draining state", () => {
      const res = fakeResponse();
      handleHealthRequest(res);
      // Even though we don't pass a draining function, /health is
      // unconditional — so this is asserting the contract by absence.
      expect(res._status).toBe(200);
    });
  });

  describe("handleReadyRequest (readiness)", () => {
    it("returns 200 when not draining", () => {
      const res = fakeResponse();
      handleReadyRequest(res, () => false);
      expect(res._status).toBe(200);
      expect(res._headers["Cache-Control"]).toBe("no-store");
      const body = JSON.parse(res._body);
      expect(body.status).toBe("ready");
    });

    it("returns 503 with no-store when draining", () => {
      const res = fakeResponse();
      handleReadyRequest(res, () => true);
      expect(res._status).toBe(503);
      expect(res._headers["Cache-Control"]).toBe("no-store");
      const body = JSON.parse(res._body);
      expect(body.status).toBe("draining");
    });
  });
});

describe("drainHttpTransport", () => {
  function fakeHttpServer(
    closeBehaviour: "immediate" | "manual" = "immediate",
  ) {
    let closeCb: (() => void) | undefined;
    return {
      _closeCb: () => closeCb?.(),
      close: vi.fn().mockImplementation((cb: () => void) => {
        if (closeBehaviour === "immediate") {
          cb();
        } else {
          closeCb = cb;
        }
      }),
      closeIdleConnections: vi.fn(),
      closeAllConnections: vi.fn(),
    };
  }

  function fakeTransportEntry() {
    return {
      server: {} as any,
      transport: {
        close: vi.fn().mockResolvedValue(undefined),
      } as any,
    };
  }

  it("closes idle connections, every transport, then awaits server close", async () => {
    const httpServer = fakeHttpServer("immediate");
    const a = fakeTransportEntry();
    const b = fakeTransportEntry();
    const transports = new Map<string, any>([
      ["sid-a", a],
      ["sid-b", b],
    ]);

    await drainHttpTransport(httpServer as any, transports);

    expect(httpServer.close).toHaveBeenCalled();
    expect(httpServer.closeIdleConnections).toHaveBeenCalled();
    expect(a.transport.close).toHaveBeenCalled();
    expect(b.transport.close).toHaveBeenCalled();
    expect(httpServer.closeAllConnections).toHaveBeenCalled();
  });

  it("swallows errors from transport.close so other transports still drain", async () => {
    const httpServer = fakeHttpServer("immediate");
    const good = fakeTransportEntry();
    const bad = fakeTransportEntry();
    bad.transport.close = vi.fn().mockRejectedValue(new Error("boom"));
    const transports = new Map<string, any>([
      ["sid-good", good],
      ["sid-bad", bad],
    ]);

    await expect(
      drainHttpTransport(httpServer as any, transports),
    ).resolves.toBeUndefined();

    expect(good.transport.close).toHaveBeenCalled();
    expect(bad.transport.close).toHaveBeenCalled();
  });

  it("works with an empty transports map", async () => {
    const httpServer = fakeHttpServer("immediate");
    const transports = new Map<string, any>();
    await expect(
      drainHttpTransport(httpServer as any, transports),
    ).resolves.toBeUndefined();
    expect(httpServer.close).toHaveBeenCalled();
  });
});
