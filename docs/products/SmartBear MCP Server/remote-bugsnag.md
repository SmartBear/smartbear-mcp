The BugSnag Remote MCP Server gives your AI assistant access to BugSnag error monitoring, performance tracing, and release management tools — no installation required.

**Server URL:** `https://bugsnag.mcp.smartbear.com/mcp`

For the full list of available tools, see [BugSnag Integration](./bugsnag-integration).

## Authentication

Connect your MCP client using the URL above. On first connection, your client will open a browser window to complete a SmartBear ID OAuth login. No API tokens or environment variables are required.

![bugsnag-sign-in.png](./images/bugsnag/bugsnag-sign-in.png)

After signing in, authorize BugSnag MCP Server:

![bugsnag-auth.png](./images/bugsnag/bugsnag-auth.png)

## MCP Client Configuration

### VS Code with GitHub Copilot

Create or edit `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "smartbear-bugsnag": {
      "type": "http",
      "url": "https://bugsnag.mcp.smartbear.com/mcp"
    }
  }
}
```

### Cursor

Add to your `mcp.json` configuration:

```json
{
  "mcpServers": {
    "smartbear-bugsnag": {
      "transport": {
        "type": "http",
        "url": "https://bugsnag.mcp.smartbear.com/mcp"
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
    "smartbear-bugsnag": {
      "transport": {
        "type": "http",
        "url": "https://bugsnag.mcp.smartbear.com/mcp"
      }
    }
  }
}
```

### Claude Code

```
claude mcp add --transport http smartbear-bugsnag https://bugsnag.mcp.smartbear.com/mcp
```
