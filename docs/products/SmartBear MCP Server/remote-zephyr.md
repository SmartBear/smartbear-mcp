The Zephyr Remote MCP Server gives your AI assistant access to Zephyr test case, test cycle, and test execution management tools — no installation required.

**Server URL:** `https://zephyr.mcp.smartbear.com/mcp`

For the full list of available tools, see [Zephyr Integration](./zephyr-integration).

## Authentication

Connect your MCP client using the URL above. On first connection, your client will open a browser window to complete a Atlassian OAuth login. No API tokens or environment variables are required.

![zephyr-atlassian-auth.png](./images/zephyr/zephyr-atlassian-auth.png)

## MCP Client Configuration

### VS Code with GitHub Copilot

Create or edit `.vscode/mcp.json` in your workspace:

```json
{
  "servers": {
    "smartbear-zephyr": {
      "type": "http",
      "url": "https://zephyr.mcp.smartbear.com/mcp"
    }
  }
}
```

### Cursor

Add to your `mcp.json` configuration:

```json
{
  "mcpServers": {
    "smartbear-zephyr": {
      "transport": {
        "type": "http",
        "url": "https://zephyr.mcp.smartbear.com/mcp",
        "oauth": {
          "callbackPort": 8080
        }
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
    "smartbear-zephyr": {
      "transport": {
        "type": "http",
        "url": "https://zephyr.mcp.smartbear.com/mcp",
        "oauth": {
          "callbackPort": 8080
        }
      }
    }
  }
}
```

### Claude Code

```
claude mcp add --transport http smartbear-zephyr https://zephyr.mcp.smartbear.com/mcp --callback-port 8080
```
