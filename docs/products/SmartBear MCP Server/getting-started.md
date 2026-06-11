The SmartBear MCP Server is available in two deployment modes: **remote hosted servers** for individual products and a **local server** that covers all products. Choose the option that best fits your workflow.

## Comparison

| | [Remote MCP Servers](/smartbear-mcp/docs/remote-mcp-servers) | [Local MCP Server](/smartbear-mcp/docs/local-server)                |
|---|---|---------------------------------------------------------------------|
| **Products** | Swagger, BugSnag, Zephyr | All products (incl. Reflect, QMetry, QTM4J, PactFlow, Collaborator, Functional Testing) |
| **Setup** | None — add a URL to your MCP client | Install via npm (Node.js 20+)                                       |
| **Authentication** | OAuth browser flow | API tokens via environment variables                                |
| **Configuration** | Headers and query string | Environment variables                                               |
| **Best for** | Quick setup for a single product | Multi-product workflows                                             |

## Which should I use?

**Use Remote MCP Servers if:**
- You only need Swagger, BugSnag, or Zephyr tools
- You want to get started immediately without installing anything
- You prefer OAuth login over managing API tokens in environment variables

**Use the Local MCP Server if:**
- You need access to Reflect, QMetry, QTM4J, PactFlow, Collaborator or Functional Testing tools
- You want all SmartBear tools available in a single MCP server
- You are using an MCP client that does not yet support HTTP/OAuth transport

## Next Steps

- [Set up a Remote MCP Server](/smartbear-mcp/docs/remote-mcp-servers) — zero-install, OAuth, individual products
- [Set up the Local MCP Server](/smartbear-mcp/docs/local-server) — npm-based, all products, environment variables
