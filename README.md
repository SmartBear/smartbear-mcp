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
    <a href="https://github.com/SmartBear/smartbear-mcp/actions/workflows/test.yml"><img src="https://github.com/SmartBear/smartbear-mcp/workflows/Test%20Suite/badge.svg" alt="Test Status"></a>
    <a href="https://smartbear.github.io/smartbear-mcp/"><img src="https://img.shields.io/badge/coverage-dynamic-brightgreen" alt="Coverage"></a>
    <a href="https://www.npmjs.com/package/@smartbear/mcp"><img src="https://img.shields.io/npm/v/@smartbear/mcp" alt="npm version"></a>
    <a href="https://modelcontextprotocol.io"><img src="https://img.shields.io/badge/MCP-Compatible-blue" alt="MCP Compatible"></a>
    <a href="https://developer.smartbear.com/smartbear-mcp"><img src="https://img.shields.io/badge/documentation-latest-blue.svg" alt="Documentation"></a>
  </div>
</div>
<br />

A Model Context Protocol (MCP) server which provides AI assistants with seamless access to SmartBear's suite of testing and monitoring tools, including [Insight Hub](https://www.smartbear.com/insight-hub), [Reflect](https://reflect.run), [API Hub](https://www.smartbear.com/api-hub), [PactFlow](https://pactflow.io/) and [Pact Broker](https://docs.pact.io/)

## What is MCP?

The [Model Context Protocol (MCP)](https://modelcontextprotocol.io/introduction) is an open standard that enables AI assistants to securely connect to external data sources and tools. This server exposes SmartBear's APIs through natural language interfaces, allowing you to query your testing data, analyze performance metrics, and manage test automation directly from your AI workflow.

## Supported Tools

See individual guides for suggested prompts and supported tools and resources:

- [Insight Hub](https://developer.smartbear.com/smartbear-mcp/docs/insight-hub-integration) - Comprehensive error monitoring and debugging capabilities
- [Test Hub](https://developer.smartbear.com/smartbear-mcp/docs/test-hub-integration) - Test management and execution capabilities
- [API Hub](https://developer.smartbear.com/smartbear-mcp/docs/api-hub-integration) - Portal management capabilities


## Prerequisites

- Node.js 20+ and npm
- Access to SmartBear products (Insight Hub, Reflect, or API Hub)
- Valid API tokens for the products you want to integrate

## Installation

The MCP server is distributed as an npm package [`@smartbear/mcp`](https://www.npmjs.com/package/@smartbear/mcp), making it easy to integrate into your development workflow.

The server is started with the API key or auth token that you use with your SmartBear product(s). They are optional and can be removed from your configuration if you aren't using the product. For Insight Hub, if you provide a project API key it will narrow down all searches to a single project in your Insight Hub dashboard. Leave this field blank if you wish to interact across multiple projects at a time.

### VS Code with Copilot

For the quickest setup, use the "MCP: Add server…" command in the Command Palette to add the `@smartbear/mcp` npm package.

<details>
<summary><strong>📋 Manual installation</strong></summary>

Alternatively, you can use `npx` (or globally install) the `@smartbear/mcp` package to run the server and add the following to your `.vscode/mcp.json` file:

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
        "API_HUB_API_KEY": "${input:api_hub_api_key}",
        "PACT_BROKER_BASE_URL": "${input:pact_broker_base_url}",
        "PACT_BROKER_TOKEN": "${input.pact_broker_token}",
        "PACT_BROKER_USERNAME": "${input.pact_broker_username}",
        "PACT_BROKER_PASSWORD": "${input.pact_broker_token}"
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
      },
      {
         "id": "pact_broker_base_url",
         "type": "promptString",
         "description": "Pactflow or Pact Broker base url - leave blank to disable Pactflow tools",
         "password": true
      },
      {
         "id": "pact_broker_token",
         "type": "promptString",
         "description": "Pactflow token - leave blank to disable Pactflow tools",
         "password": true
      },
      {
         "id": "pact_broker_username",
         "type": "promptString",
         "description": "Pact Broker Username - leave blank to disable Pact Broker tools",
         "password": true
      },
      {
         "id": "pact_broker_password",
         "type": "promptString",
         "description": "Pact Broker Password  - leave blank to disable Pact Broker tools",
         "password": true
      },
  ]
}
```
</details>

### Claude Desktop

Add the following configuration to your `claude_desktop_config.json` to launch the MCP server via `npx`:

```json
{
  "mcpServers": {
    "smartbear": {
      "command": "npx",
      "args": [
        "-y",
        "@smartbear/mcp@latest"
      ],
      "env": {
        "INSIGHT_HUB_AUTH_TOKEN": "your_personal_auth_token",
        "INSIGHT_HUB_PROJECT_API_KEY": "your_project_api_key",
        "REFLECT_API_TOKEN": "your_reflect_token",
        "API_HUB_API_KEY": "your_api_hub_key",
        "PACT_BROKER_BASE_URL": "your_pactflow_or_pactbroker_base_url",
        "PACT_BROKER_TOKEN": "your_pactflow_token",
        "PACT_BROKER_USERNAME": "your_pact_broker_username",
        "PACT_BROKER_PASSWORD": "your_pact_broker_password",
      }
    }
  }
}
```

## Documentation

For detailed introduction, examples, and advanced configuration visit our 📖 [Full Documentation](https://developer.smartbear.com/smartbear-mcp)

## Local Development

For developers who want to contribute to the SmartBear MCP server, customize its functionality, or work with the latest development features, you can build and run the server directly from source code. This approach gives you full control over the implementation and allows you to make modifications as needed.

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

4. **Add the server to your IDE** configuration updating `.vscode/mcp.json` (or equivalent) to point to your local build

    <details>
    <summary><strong>📋 VSCode (mcp.json)</strong></summary>

    ```json
    {
      "servers": {
        "smartbear": {
        "type": "stdio",
        "command": "node",
        "dev": {                            // <-- To allow debugging in VS Code
          "watch": "dist/**/*.js",
          "debug": {
              "type": "node"
          },
        },
        "args": ["<PATH_TO_SMARTBEAR_MCP_REPO>/dist/index.js"],
        "env": {
            "INSIGHT_HUB_AUTH_TOKEN": "${input:insight_hub_auth_token}",
            "INSIGHT_HUB_PROJECT_API_KEY": "${input:insight_hub_project_api_key}",
            "REFLECT_API_TOKEN": "${input:reflect_api_token}",
            "API_HUB_API_KEY": "${input:api_hub_api_key}",
            "PACT_BROKER_BASE_URL": "${input:pact_broker_base_url}",
            "PACT_BROKER_TOKEN": "${input.pact_broker_token}",
            "PACT_BROKER_USERNAME": "${input.pact_broker_username}",
            "PACT_BROKER_PASSWORD": "${input.pact_broker_token}"
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
        },
        {
         "id": "pact_broker_base_url",
         "type": "promptString",
         "description": "Pactflow base url - leave blank to disable Pactflow tools",
         "password": true
        },
        {
          "id": "pact_broker_token",
          "type": "promptString",
          "description": "Pactflow token - leave blank to disable Pactflow tools",
          "password": true
        },
        {
          "id": "pact_broker_username",
          "type": "promptString",
          "description": "Pact Broker Username - leave blank to disable Pact Broker tools",
          "password": true
        },
        {
          "id": "pact_broker_password",
          "type": "promptString",
          "description": "Pact Broker Password  - leave blank to disable Pact Broker tools",
          "password": true
        },
      ]
    }
    ```
    </details>

5. **Local testing** using the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) web interface:

    ```bash
    INSIGHT_HUB_AUTH_TOKEN="your_token" REFLECT_API_TOKEN="your_reflect_token" API_HUB_API_KEY="your_api_hub_key" PACT_BROKER_BASE_URL="your-pactflow-url" PACT_BROKER_TOKEN="your-pactflow-token" PACT_BROKER_USERNAME="your-pact-broker-username" PACT_BROKER_PASSWORD="your-pact-broker-password" npx @modelcontextprotocol/inspector npx @smartbear/mcp@latest
    ```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the [LICENSE](LICENSE.txt) file in the project repository.

## Support

* [Search open and closed issues](https://github.com/SmartBear/smartbear-mcp/issues?utf8=✓&q=is%3Aissue) for similar problems
* [Report a bug or request a feature](https://github.com/SmartBear/smartbear-mcp/issues/new)


---

**SmartBear MCP Server** - Bringing the power of SmartBear's testing and monitoring ecosystem to your AI-powered development workflow.