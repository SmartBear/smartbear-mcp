The QMetry Remote MCP Server gives your AI assistant access to QMetry test management tools — no installation required.

**Server URL:** `https://qmetry.mcp.smartbear.com/mcp`

For the full list of available tools, see [QMetry Integration](/smartbear-mcp/docs/qmetry-integration).

## Authentication

Connect your MCP client using the URL above. On first connection, your client will open a browser window to complete a SmartBear ID OAuth login. No API tokens or environment variables are required.

![qmetry-log-in.png](./images/embedded/qmetry-log-in.png)

After signing in, authorize QMetry MCP Server:

![qmetry-auth-access.png](./images/embedded/qmetry-auth-access.png)

## MCP Client Configuration

### VS Code with GitHub Copilot

Create or edit `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "smartbear-qmetry": {
      "type": "http",
      "url": "https://qmetry.mcp.smartbear.com/mcp"
    }
  }
}
```

### Cursor

Add to your `mcp.json` configuration:

```json
{
  "mcpServers": {
    "smartbear-qmetry": {
      "transport": {
        "type": "http",
        "url": "https://qmetry.mcp.smartbear.com/mcp"
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
    "smartbear-qmetry": {
      "transport": {
        "type": "http",
        "url": "https://qmetry.mcp.smartbear.com/mcp"
      }
    }
  }
}
```

### Claude Code

```
claude mcp add --transport http smartbear-qmetry https://qmetry.mcp.smartbear.com/mcp
```
