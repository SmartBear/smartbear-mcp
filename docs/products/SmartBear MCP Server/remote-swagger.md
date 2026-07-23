The Swagger Remote MCP Server gives your AI assistant access to Swagger Portal and Swagger Studio tools — no installation required.

**Server URL:** `https://swagger.mcp.smartbear.com/mcp`

For the full list of available tools, see [Swagger Portal Integration](/smartbear-mcp/docs/swagger-portal-integration) and [Swagger Studio Integration](/smartbear-mcp/docs/swagger-studio-integration).

## Authentication

Connect your MCP client using the URL above. On first connection, your client will open a browser window to complete a SmartBear OAuth login. No API tokens or environment variables are required.

![swagger-sign-in.png](./images/embedded/swagger-sign-in.png)

## MCP Client Configuration

### VS Code with GitHub Copilot

Create or edit `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "smartbear-swagger": {
      "type": "http",
      "url": "https://swagger.mcp.smartbear.com/mcp"
    }
  }
}
```

### Cursor

Add to your `mcp.json` configuration:

```json
{
  "mcpServers": {
    "smartbear-swagger": {
      "transport": {
        "type": "http",
        "url": "https://swagger.mcp.smartbear.com/mcp"
      }
    }
  }
}
```

### Claude Desktop

Edit your `claude_desktop_config.json` file:

```json
{
  "mcpServers": {
    "smartbear-swagger": {
      "transport": {
        "type": "http",
        "url": "https://swagger.mcp.smartbear.com/mcp"
      }
    }
  }
}
```

### Claude Code

```
claude mcp add --transport http smartbear-swagger https://swagger.mcp.smartbear.com/mcp
```

### Kiro (AWS)

Add to your `~/.kiro/settings/mcp.json`:

```json
{
  "mcpServers": {
    "smartbear-swagger": {
      "type": "http",
      "url": "https://swagger.mcp.smartbear.com/mcp",
      "oauth": {
        "redirectUri": "127.0.0.1:8080",
        "oauthScopes": []
      },
      "disabled": false
    }
  }
}
```

Or install with one click:

[![Add to Kiro](https://kiro.dev/images/add-to-kiro.svg)](https://kiro.dev/launch/mcp/add?name=smartbear-swagger&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Fswagger.mcp.smartbear.com%2Fmcp%22%2C%22oauth%22%3A%7B%22redirectUri%22%3A%22127.0.0.1%3A8080%22%2C%22oauthScopes%22%3A%5B%5D%7D%2C%22disabled%22%3Afalse%7D)
