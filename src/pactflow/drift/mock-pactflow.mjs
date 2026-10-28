/**
 * Minimal stand-in for the PactFlow API, so the Drift MCP tests can invoke the
 * server's PactFlow tools without credentials or network access.
 */
import http from "node:http";

const environment = (uuid, name) => ({
  uuid,
  name,
  displayName: name,
  production: name === "production",
  createdAt: "2024-01-01T00:00:00.000Z",
});

const ENVIRONMENTS = [
  environment("00000000-0000-0000-0000-000000000001", "production"),
  environment("00000000-0000-0000-0000-000000000002", "test"),
];

const pacticipant = (name) => ({ name, displayName: name });

/** Returns [status, body] for a request, or undefined for an unknown route. */
function route(method, url, origin) {
  const { pathname } = url;

  // Mutations that return no body.
  if (
    method === "DELETE" ||
    (method === "PUT" &&
      /^\/admin\/users\/[^/]+\/roles(\/[^/]+)?$/.test(pathname))
  ) {
    return [204, undefined];
  }

  // PactFlow AI: submit, poll (HEAD) and fetch the result.
  const ai = pathname.match(/^\/api\/ai\/(generate|review)$/);
  if (method === "POST" && ai) {
    return [
      202,
      {
        status_url: `${origin}/api/ai/status/${ai[1]}`,
        result_url: `${origin}/api/ai/result/${ai[1]}`,
      },
    ];
  }
  if (method === "HEAD" && pathname.startsWith("/api/ai/status/")) {
    return [200, undefined];
  }
  if (method === "GET" && pathname === "/api/ai/result/generate") {
    return [200, { id: "drift", code: "// generated", language: "javascript" }];
  }
  if (method === "GET" && pathname === "/api/ai/result/review") {
    return [
      200,
      { recommendations: [{ recommendation: "Use matchers", confidence: 1 }] },
    ];
  }

  if (method !== "GET") return undefined;

  // Enables the PactFlow AI tools and prompt, so the full surface is advertised.
  if (pathname === "/api/ai/entitlement") {
    return [
      200,
      {
        organizationEntitlements: {
          name: "drift",
          planAiEnabled: true,
          preferencesAiEnabled: true,
          aiCredits: { total: 100, used: 0 },
        },
        userEntitlements: { aiPermissions: [] },
        aiEnabled: true,
      },
    ];
  }
  if (pathname === "/environments") {
    return [200, { _embedded: { environments: ENVIRONMENTS } }];
  }
  const env = pathname.match(/^\/environments\/([^/]+)$/);
  if (env) {
    const found = ENVIRONMENTS.find((e) => e.uuid === env[1]);
    return found ? [200, found] : [404, { error: "Environment not found" }];
  }
  if (pathname === "/pacticipants") {
    return [
      200,
      { _embedded: { pacticipants: [pacticipant("smartbear-mcp")] } },
    ];
  }
  const pacticipantMatch = pathname.match(/^\/pacticipants\/([^/]+)$/);
  if (pacticipantMatch) {
    return pacticipantMatch[1] === "unknown-service"
      ? [404, { error: "Pacticipant not found" }]
      : [200, pacticipant(decodeURIComponent(pacticipantMatch[1]))];
  }
  if (/^\/pacts\/provider\/[^/]+\/provider-states$/.test(pathname)) {
    return [
      200,
      {
        providerStates: [
          { name: "an environment exists", consumers: ["smartbear-mcp"] },
        ],
      },
    ];
  }
  if (pathname === "/can-i-deploy") {
    return [
      200,
      {
        summary: {
          deployable: true,
          reason: "All verified",
          success: 1,
          failed: 0,
          unknown: 0,
        },
        matrix: [],
      },
    ];
  }
  return undefined;
}

export function startMock(port = 0) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    // Routes with fixtures are above; any other call gets an empty success so
    // every tool can be invoked (the Pact tests cover the exact HTTP contract).
    const origin = `http://${req.headers.host}`;
    const [status, body] = route(req.method ?? "GET", url, origin) ?? [200, {}];
    if (body === undefined) {
      res.writeHead(status);
      res.end();
      return;
    }
    res.writeHead(status, { "content-type": "application/hal+json" });
    res.end(JSON.stringify(body));
  });
  return new Promise((resolve) =>
    server.listen(port, "127.0.0.1", () =>
      resolve({ server, port: server.address().port }),
    ),
  );
}
