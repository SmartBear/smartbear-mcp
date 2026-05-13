Remote MCP Servers are hosted by SmartBear and connect directly to your MCP client via a URL — no installation or Node.js required. Authentication is handled through an OAuth browser flow, so there are no API tokens to manage manually.

> **Need access to Reflect, QMetry, PactFlow, or Collaborator?** These products are only available in the [Local MCP Server](../local-server), which provides all products in a single npm package.

## Available Remote Servers

| Product | Server URL | Setup guide |
|---|---|---|
| **Swagger** | `https://swagger.mcp.smartbear.com/mcp` | [Swagger Remote Server](../remote-swagger) |
| **BugSnag** | `https://bugsnag.mcp.smartbear.com/mcp` | [BugSnag Remote Server](../remote-bugsnag) |
| **Zephyr** | `https://zephyr.mcp.smartbear.com/mcp` | [Zephyr Remote Server](../remote-zephyr) |

## Authentication

Remote servers use OAuth. When your MCP client connects to a remote server URL for the first time, it will open a browser window prompting you to log in with your SmartBear account. Once authorized, the client stores the token and handles renewal automatically — no environment variables needed.

## Connecting Multiple Servers

You can connect to more than one remote server at the same time. Each server is registered separately in your MCP client config, so you can mix and match the products you need. See the individual setup pages above for per-product configuration examples.

If you need all products in a single connection, use the [Local MCP Server](../local-server) instead.
