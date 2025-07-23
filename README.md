<div align="center">
  <a href="https://www.smartbear.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://assets.smartbear.com/m/79b99a7ff9c81a9a/original/SmartBear-Logo_Dark-Mode.svg">
      <img alt="SmartBear logo" src="https://assets.smartbear.com/m/105001cc5db1e0bf/original/SmartBear-Logo_Light-Mode.svg">
    </picture>
  </a>
  <h1>SmartBear MCP server</h1>

  <!-- Badges -->
  <div>
    <a href="https://github.com/SmartBear/smartbear-mcp/actions/workflows/test.yml">
      <img src="https://github.com/SmartBear/smartbear-mcp/workflows/Test%20Suite/badge.svg" alt="Test Status">
    </a>
    <a href="https://smartbear.github.io/smartbear-mcp/">
      <img src="https://img.shields.io/badge/coverage-dynamic-brightgreen" alt="Coverage">
    </a>
    <a href="https://www.npmjs.com/package/@smartbear/mcp">
      <img src="https://img.shields.io/npm/v/@smartbear/mcp" alt="npm version">
    </a>
    <a href="https://modelcontextprotocol.io">
      <img src="https://img.shields.io/badge/MCP-Compatible-blue" alt="MCP Compatible">
    </a>
  </div>
</div>

A Model Context Protocol (MCP) server that provides AI assistants with seamless access to SmartBear's suite of testing and monitoring tools, including Insight Hub, Reflect, and API Hub.

## What is MCP?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) is an open standard that enables AI assistants to securely connect to external data sources and tools. This server exposes SmartBear's APIs through natural language interfaces, allowing you to query your testing data, analyze performance metrics, and manage test automation directly from your AI workflow.

## Supported Tools

See individual guides for suggested prompts and supported tools and resources:

- [Insight Hub](https://developer.smartbear.com/smartbear-mcp/docs/insight-hub-integration) - Comprehensive error monitoring and debugging capabilities.
- [Test Hub](https://developer.smartbear.com/smartbear-mcp/docs/test-hub-integration) - Test management and execution capabilities
- [API Hub](https://developer.smartbear.com/smartbear-mcp/docs/api-hub-integration) - Portal management capabilities


## Prerequisites

- Node.js 20+ and npm
- Access to SmartBear products (Insight Hub, Reflect, or API Hub)
- Valid API tokens for the products you want to integrate

## Configuration

The server is started with the API key or auth token that you use with your product(s). They are optional and can be removed from your configuration if you aren't using the product.

### VS Code via NPM 

Add the [`@smartbear/mcp`](https://www.npmjs.com/package/@smartbear/mcp) package to your project via NPM or via the "MCP: Add server…" command in VS Code.

If setting up manually, add the following configuration to `.vscode/mcp.json`:

<details>
<summary><strong>📋 Click to expand NMP-based configuration</strong></summary>
```json
{
  "servers": {
    "smartbear": {
      "type": "stdio",
      "command": "npx",
      "args": [
        "-y",
        "@smartbear/mcp@latest"
      ],
      "env": {
        "INSIGHT_HUB_AUTH_TOKEN": "${input:insight_hub_auth_token}",
        "INSIGHT_HUB_PROJECT_API_KEY": "${input:insight_hub_project_api_key}",
        "REFLECT_API_TOKEN": "${input:reflect_api_token}",
        "API_HUB_API_KEY": "${input:api_hub_api_key}"
      }
    }
  },
  "inputs": [
      {
         "id": "insight_hub_auth_token",
         "type": "promptString",
         "description": "Insight Hub Auth Token - leave blank to disable Insight Hub tools",
         "password": true
      },
      {
         "id": "insight_hub_project_api_key",
         "type": "promptString",
         "description": "Insight Hub Project API Key - for single project interactions",
         "password": false
      },
      {
         "id": "reflect_api_token",
         "type": "promptString",
         "description": "Reflect API Token - leave blank to disable Reflect tools",
         "password": true
      },
      {
         "id": "api_hub_api_key",
         "type": "promptString",
         "description": "API Hub API Key - leave blank to disable API Hub tools",
         "password": true
      }
  ]
}
```
</details>

### VS Code Manually

If you want to build and run the MCP server from source (for development or contribution):

1. **Clone the repository:**
   ```bash
   git clone https://github.com/SmartBear/smartbear-mcp.git
   cd smartbear-mcp
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the server:**
   ```bash
   npm run build
   ```

4. **Set up environment variables:**
   ```bash
   # For Insight Hub
   export INSIGHT_HUB_AUTH_TOKEN="your_insight_hub_token"
   
   # For Reflect (optional)
   export REFLECT_API_TOKEN="your_reflect_token"
   
   # For API Hub (optional)
   export API_HUB_API_KEY="your_api_hub_key"
   ```

5. **Update your `.vscode/mcp.json` to point to your local build:**
    <details>
    <summary><strong>📋 Click to expand manual configuration</strong></summary>
    ```json
    {
    "servers": {
        "smartbear": {
        "type": "stdio",
        "command": "node",
        "args": ["<PATH_TO_SMARTBEAR_MCP>/dist/index.js"],
        "env": {
            "INSIGHT_HUB_AUTH_TOKEN": "${input:insight_hub_auth_token}",
            "INSIGHT_HUB_PROJECT_API_KEY": "${input:insight_hub_project_api_key}",
            "REFLECT_API_TOKEN": "${input:reflect_api_token}",
            "API_HUB_API_KEY": "${input:api_hub_api_key}"
        }
        }
    },
    "inputs": [
        {
            "id": "insight_hub_auth_token",
            "type": "promptString",
            "description": "Insight Hub Auth Token - leave blank to disable Insight Hub tools",
            "password": true
        },
        {
            "id": "insight_hub_project_api_key",
            "type": "promptString",
            "description": "Insight Hub Project API Key - for single project interactions",
            "password": false
        },
        {
            "id": "reflect_api_token",
            "type": "promptString",
            "description": "Reflect API Token - leave blank to disable Reflect tools",
            "password": true
        },
        {
            "id": "api_hub_api_key",
            "type": "promptString",
            "description": "API Hub API Key - leave blank to disable API Hub tools",
            "password": true
        }
    ]
    }
    ```
    </details>

### Claude Desktop
Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "smartbear": {
      "command": "node",
      "args": ["<PATH_TO_SMARTBEAR_MCP>/dist/index.js"],
      "env": {
        "INSIGHT_HUB_AUTH_TOKEN": "your_token_here"
      }
    }
  }
}
```

## Testing Locally

Test your installation using the MCP Inspector:

```bash
# Install MCP Inspector globally
npm install -g @modelcontextprotocol/inspector

# Run the inspector
mcp-inspector node dist/index.js
```

This opens a web interface where you can test tools and resources before integrating with your AI assistant.

## Documentation

For detailed introduction, examples, and advanced configuration visit our 📖 [Full Documentation](https://developer.smartbear.com/smartbear-mcp)

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the [LICENSE](LICENSE.txt) file in the project repository.

## Support

- 🐛 [Report Issues](https://github.com/SmartBear/smartbear-mcp/issues)
- 💬 [Community Discussions](https://community.smartbear.com/mcp)
- 📧 [Contact Support](mailto:support@smartbear.com)

---

**SmartBear MCP Server** - Bringing the power of SmartBear's testing and monitoring ecosystem to your AI-powered development workflow.