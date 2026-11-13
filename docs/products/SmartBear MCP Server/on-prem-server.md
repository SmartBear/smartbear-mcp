Run the SmartBear MCP Server as a shared HTTP service that you host yourself, so your team can connect from any MCP client through a single URL. This works for every SmartBear product, including those running on-premises.

> **Looking for something simpler?**
> - Single user on your own machine? Use the [Local MCP Server](/smartbear-mcp/docs/local-server).
> - Only need Swagger, BugSnag, or Zephyr in the cloud? Use the [Remote MCP Servers](/smartbear-mcp/docs/remote-mcp-servers). No hosting required.

## Prerequisites

- Docker (recommended), or Node.js 22 or later.
- Network access from the server to the SmartBear products your team uses, and from users' machines to the server.
- Credentials for each product (see [Authentication](#authentication)).
- A product version that supports your sign-in method. For example, QMetry needs version 8.26.0 or later with OAuth sign-in for MCP enabled. Check the requirements for each product you plan to expose.
- MCP clients that support the MCP OAuth flow, if you use OAuth products.
- For production: a reverse proxy or load balancer that terminates TLS, and a DNS name for the server.

## Quick start

Start the server in HTTP mode, loading only the products you need:

```bash
docker run --rm -p 3000:3000 \
  -e MCP_TRANSPORT=http \
  -e PORT=3000 \
  -e MCP_CLIENTS=<Product> \
  -e <PRODUCT>_BASE_URL=https://<your-instance> \
  ghcr.io/smartbear/smartbear-mcp:latest
```

Without Docker:

```bash
npm install -g @smartbear/mcp
MCP_TRANSPORT=http PORT=3000 MCP_CLIENTS=<Product> \
<PRODUCT>_BASE_URL=https://<your-instance> \
mcp
```

Replace `<Product>` with the product name (for example `QMetry`, `Zephyr`, `BugSnag`) and `<PRODUCT>_BASE_URL` with the matching variable from the [product settings](#product-settings) table. Separate multiple products with commas, for example `MCP_CLIENTS=Zephyr,Swagger`.

Verify that it is running:

```bash
curl -s http://localhost:3000/health
curl -s http://localhost:3000/ready
```

For products that sign in with OAuth, also check the discovery metadata and the sign-in challenge:

```bash
curl -s http://localhost:3000/.well-known/oauth-protected-resource
# "authorization_servers" must show your product URL, not http://localhost:7070

curl -s -i http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"curl","version":"1.0"}}}'
# Expect 401 with a WWW-Authenticate: OAuth resource_metadata="..." header
```

Then add `http://localhost:3000/mcp` to your MCP client (see [Connect your MCP client](#connect-your-mcp-client)).

## How it works

The same `@smartbear/mcp` package runs in one of two modes, chosen by `MCP_TRANSPORT`:

| Mode | Value | Credentials | Typical use |
|---|---|---|---|
| stdio (default) | unset or `stdio` | Environment variables | One MCP client launches the server on one machine. |
| HTTP | `http` | Sent by each user with every request | One shared server for many users. |

The server listens on these routes:

| Route | Purpose |
|---|---|
| `/mcp` | Streamable HTTP endpoint. Point your clients here. |
| `/sse` and `/message` | Legacy SSE transport for older clients. |
| `/health` | Liveness probe. |
| `/ready` | Readiness probe. Returns `503` while shutting down. |
| `/.well-known/oauth-protected-resource` | OAuth discovery metadata for products that sign in with OAuth. |

Things to know before you deploy:

- **Per-request configuration.** Each connection builds its own server from the query string, then request headers, then the server's environment variables. The first match wins. A request with no usable credential is rejected with `401`.
- **Sessions live in memory.** They are lost on restart and are not shared between replicas. Clients re-initialize automatically.
- **No TLS in the process.** Terminate TLS at a reverse proxy and set `BASE_URL` to the public address.

## Authentication

In HTTP mode the server stores no user credentials. Each user supplies their own, so each person only sees what their own account allows.

| Method | How it works | Use it for |
|---|---|---|
| **OAuth** | The client signs the user in through the product and sends `Authorization: Bearer <token>`. | BugSnag, Zephyr, Swagger and QMetry. Set `OAUTH_AUTHORIZATION_SERVER_URL` to your product instance. |
| **Headers** | The client sends the product's credential headers, for example `Zephyr-Api-Token`. | All other products, which use API tokens. The OAuth products also accept headers, except QMetry. |

> **Keep credentials off the server when you want OAuth.** If a product API key is set as a server environment variable, the server no longer challenges unauthenticated requests, so clients never start sign-in. QMetry requires OAuth in HTTP mode, so never set `QMETRY_API_KEY` on the server.

## Product settings

Each product is configured with a fixed naming pattern:

- Header: `{Product}-{Setting-Name}`, for example `Zephyr-Base-Url`
- Environment variable: `{PRODUCT}_{SETTING_NAME}`, for example `ZEPHYR_BASE_URL`

For on-prem products, set the base URL so the server calls your instance instead of the SmartBear cloud:

| Product | Base URL variable | Credential |
|---|---|---|
| QMetry | `QMETRY_BASE_URL` | OAuth only in HTTP mode |
| Zephyr | `ZEPHYR_BASE_URL` | OAuth, or `ZEPHYR_API_TOKEN` |
| BugSnag | `BUGSNAG_ENDPOINT` | OAuth, or `BUGSNAG_AUTH_TOKEN` |
| Swagger | `SWAGGER_REGISTRY_BASE_PATH`, `SWAGGER_PORTAL_BASE_PATH`, `SWAGGER_UI_BASE_PATH` | OAuth, or `SWAGGER_API_KEY` |
| QTM4J | `QTM4J_BASE_URL` | `QTM4J_API_KEY` |
| Contract Testing (PactFlow / Pact Broker) | `PACT_BROKER_BASE_URL` | `PACT_BROKER_TOKEN`, or `PACT_BROKER_USERNAME` and `PACT_BROKER_PASSWORD` |
| Collaborator | `COLLABORATOR_BASE_URL` | `COLLABORATOR_USERNAME` and `COLLABORATOR_LOGIN_TICKET` |
| BearQ | `BEARQ_API_BASE_URL` | `BEARQ_API_TOKEN` |
| Reflect | n/a | `REFLECT_API_TOKEN` |

The server prints the exact header names for the products it loaded at startup. Treat that log as the source of truth for your version.

## Server configuration

| Variable | Default | Purpose |
|---|---|---|
| `MCP_TRANSPORT` | `stdio` | Set to `http`. |
| `PORT` | `3000` | Port to listen on. |
| `BASE_URL` | Derived from the request | Public URL, for example `https://mcp.example.com`. Set it on any deployment behind a proxy. |
| `MCP_CLIENTS` | All products | Comma-separated products to load. |
| `MCP_TOOLSETS` | All toolsets | Comma-separated toolsets to enable. |
| `MCP_ALLOWED_ENDPOINTS` | Unrestricted | Allow-list for URL settings such as base URLs. Entries are exact matches, or regular expressions wrapped in `/.../`. Recommended on shared servers. |
| `OAUTH_AUTHORIZATION_SERVER_URL` | `http://localhost:7070` | Where clients sign in for OAuth products. Set it to your product instance. |
| `TRUST_PROXY` | `false` | Set to `true` only if your proxy sets `X-Forwarded-Host` and strips client-supplied values. Not needed when `BASE_URL` is set. |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Origins allowed by CORS. Only needed for browser-based clients. |
| `MCP_SHUTDOWN_TIMEOUT_MS` | `25000` | Maximum time to drain sessions after `SIGTERM`. |

Example production environment:

```bash
MCP_TRANSPORT=http
PORT=3000
BASE_URL=https://mcp.example.com
MCP_CLIENTS=Zephyr,QMetry
ZEPHYR_BASE_URL=https://zephyr.example.com
QMETRY_BASE_URL=https://qmetry.example.com
OAUTH_AUTHORIZATION_SERVER_URL=https://qmetry.example.com/
MCP_ALLOWED_ENDPOINTS=https://zephyr.example.com,https://qmetry.example.com
```

> **Mixing products on one server.** The `Authorization: Bearer` header is shared by every loaded product that accepts it, so a user's token for one product could be sent to another product's API. `OAUTH_AUTHORIZATION_SERVER_URL` also accepts only one URL. If you use OAuth with more than one product, run each product on its own server.

## Self-signed or internal certificates

If your on-prem products use a certificate from an internal certificate authority (CA), the server cannot verify it by default and calls to the product fail with a TLS error. Give Node your CA certificate with `NODE_EXTRA_CA_CERTS`:

```bash
docker run --rm -p 3000:3000 \
  -v /path/to/internal-ca.pem:/certs/internal-ca.pem:ro \
  -e NODE_EXTRA_CA_CERTS=/certs/internal-ca.pem \
  -e MCP_TRANSPORT=http \
  ... \
  ghcr.io/smartbear/smartbear-mcp:0.44.0
```

Do not disable certificate verification.

## Put it behind TLS

The server does not terminate TLS. Run it behind a reverse proxy or load balancer, forward all routes including `/.well-known/`, and make sure it:

- **Does not buffer responses.** Streaming responses will appear to hang otherwise.
- **Allows long idle timeouts.** SSE connections stay open for the whole session.
- **Passes the `Authorization` header through unchanged.**

Nginx example:

```nginx
server {
    listen 443 ssl;
    server_name mcp.example.com;

    ssl_certificate     /etc/ssl/certs/mcp.example.com.pem;
    ssl_certificate_key /etc/ssl/private/mcp.example.com.key;

    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_buffering    off;
        proxy_cache        off;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_set_header   X-Forwarded-Host  $host;
    }
}
```

## Deploy

Pin a specific image version in production so upgrades are deliberate. Images are published for `linux/amd64` and `linux/arm64`.

### Docker Compose

```yaml
services:
  smartbear-mcp:
    image: ghcr.io/smartbear/smartbear-mcp:0.44.0
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      MCP_TRANSPORT: http
      PORT: "3000"
      BASE_URL: https://mcp.example.com
      MCP_CLIENTS: Zephyr
      ZEPHYR_BASE_URL: https://zephyr.example.com
      MCP_ALLOWED_ENDPOINTS: https://zephyr.example.com
    healthcheck:
      test: ["CMD", "wget", "-qO-", "http://127.0.0.1:3000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
    stop_grace_period: 30s
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: smartbear-mcp
spec:
  replicas: 1
  selector:
    matchLabels:
      app: smartbear-mcp
  template:
    metadata:
      labels:
        app: smartbear-mcp
    spec:
      terminationGracePeriodSeconds: 30
      containers:
        - name: smartbear-mcp
          image: ghcr.io/smartbear/smartbear-mcp:0.44.0
          ports:
            - containerPort: 3000
          env:
            - name: MCP_TRANSPORT
              value: http
            - name: BASE_URL
              value: https://mcp.example.com
            - name: MCP_CLIENTS
              value: Zephyr
            - name: ZEPHYR_BASE_URL
              value: https://zephyr.example.com
            - name: MCP_ALLOWED_ENDPOINTS
              value: https://zephyr.example.com
          livenessProbe:
            httpGet:
              path: /health
              port: 3000
          readinessProbe:
            httpGet:
              path: /ready
              port: 3000
---
apiVersion: v1
kind: Service
metadata:
  name: smartbear-mcp
spec:
  selector:
    app: smartbear-mcp
  ports:
    - port: 80
      targetPort: 3000
```

With more than one replica, enable session affinity on the Service or Ingress. Keep `MCP_SHUTDOWN_TIMEOUT_MS` below `terminationGracePeriodSeconds`.

### Air-gapped and internal registries

If you cannot pull from `ghcr.io` or npm, build the image yourself and push it to your own registry:

```bash
git clone https://github.com/SmartBear/smartbear-mcp.git
cd smartbear-mcp
docker build -t my-registry.example.com/smartbear-mcp:0.44.0 .
docker push my-registry.example.com/smartbear-mcp:0.44.0
```

The `BUILDER_IMAGE_NAME` build argument (default `node:22-alpine`) changes only the build stage. To mirror the base image of the final image too, edit the second `FROM` line in the Dockerfile. The build also needs access to an npm registry or mirror.

### Container notes

- The image does not declare `EXPOSE`, a `HEALTHCHECK`, or a non-root `USER`. Supply the port mapping and health checks at deploy time, as the examples above do.
- If your cluster enforces a non-root policy, add `securityContext.runAsUser: 1000`. The image includes the `node` user with that ID.
- For Kubernetes, start with requests of `100m` CPU and `256Mi` memory and a memory limit of `512Mi`, then adjust to your load.

## Security

The server has no login of its own. It passes each user's credentials on to the product, which enforces access.

- Keep the server on your internal network, or put it behind your single sign-on or VPN.
- Set `MCP_ALLOWED_ENDPOINTS` so users cannot point the server at arbitrary URLs.
- Always serve it over HTTPS, because requests carry tokens.

## Connect your MCP client

Point clients at `https://mcp.example.com/mcp` using the Streamable HTTP transport.

**Claude Code**

```bash
claude mcp add --transport http smartbear https://mcp.example.com/mcp
```

For OAuth products, run `/mcp`, select the server, and choose **Authenticate**.

**Cursor, VS Code, and other JSON-configured clients**

```json
{
  "mcpServers": {
    "smartbear": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "headers": {
        "Zephyr-Api-Token": "<your-token>"
      }
    }
  }
}
```

Omit `headers` for OAuth products. The client opens the product's sign-in page the first time it connects. Clients that cannot complete the MCP OAuth flow cannot use QMetry in HTTP mode, and need header credentials for the other products, so use the [Local MCP Server](/smartbear-mcp/docs/local-server) for those.

## Operations

- Monitor `/health` (includes the running version) and `/ready`.
- To upgrade, pull the new image tag and restart. The server keeps no persistent state.
- Logs go to stdout and stderr.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `401 ... No clients successfully configured` | No product loaded, usually a misspelled `MCP_CLIENTS`. | Check the spelling and the header list printed at startup. |
| `401 ... No clients have valid authentication credentials` | The request has no credential. Expected before OAuth sign-in. | Complete sign-in, or send the product's credential headers. |
| `401 ... URL ... is not allowed` | A base URL does not match `MCP_ALLOWED_ENDPOINTS`. | Add the exact URL, or a regex wrapped in `/.../`. |
| No sign-in page appears for an OAuth product | A product API key is set on the server or sent by the client. | Remove it so the server can challenge the request. |
| Sign-in goes to `http://localhost:7070` | `OAUTH_AUTHORIZATION_SERVER_URL` is not set. | Set it to your product instance. |
| Discovery metadata shows `http://` or an internal host | `BASE_URL` is not set behind a proxy. | Set `BASE_URL` to the public HTTPS address. |
| Tools for a product are missing | The product is not in `MCP_CLIENTS` or `MCP_TOOLSETS`. | Add it and restart. |
| `404 Session not found` | Server restarted or another replica received the request. | Expected. Clients re-initialize. Add session affinity for multiple replicas. |
| Tool calls hang through the proxy | The proxy buffers responses or has a short idle timeout. | Disable buffering and raise read timeouts. |
| Browser client blocked by CORS | The origin is not in `ALLOWED_ORIGINS`. | Add the exact origin. |

For product-specific issues, see [Troubleshooting](/smartbear-mcp/docs/troubleshooting).
