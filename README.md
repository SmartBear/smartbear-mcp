<div align="center">
  <a href="https://www.smartbear.com">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="assets/smartbear-logo-light.svg">
      <img alt="SmartBear logo" src="assets/smartbear-logo-dark.svg">
    </picture>
  </a>
  <h1>SmartBear MCP server</h1>
</div>

An [MCP](https://modelcontextprotocol.io) server for SmartBear's API, Test and Insight Hubs.

## Build

Checkout this repository and run the following to build the server:

```bash
npm run build
```

## Usage

The server is started with the API key or auth token that you use with your product(s). They are optional and can be removed from your configuration if you aren't using the product.

### VS Code

Add the following configuration to `.vscode/mcp.json`, replacing `<PATH_TO_SMARTBEAR_MCP>` with the location of this repo on your filesystem:

```json
{
  "servers": {
    "smartbear": {
      "type": "stdio",
      "command": "node",
      "args": ["<PATH_TO_SMARTBEAR_MCP>/dist/index.js"],

      "env": {
        "INSIGHT_HUB_AUTH_TOKEN": "${input:insight_hub_auth_token}",
        "REFLECT_API_TOKEN": "${input:reflect_api_token}",
        "SWAGGER_HUB_API_KEY": "${input:swagger_hub_api_key}"
      }
    }
  },
  "inputs": [
      {
         "id": "insight_hub_auth_token",
         "type": "promptString",
         "description": "Insight Hub Auth Token",
         "password": true
      },
      {
         "id": "reflect_api_token",
         "type": "promptString",
         "description": "Reflect API Token",
         "password": true
      },
      {
         "id": "swagger_hub_api_key",
         "type": "promptString",
         "description": "Swagger Hub API Token",
         "password": true
      }
  ]
}
```

### MCP Inspector

To test the MCP server locally, you can use the following command (assuming a local build of the MCP server in the same location):

```bash
REFLECT_API_TOKEN=your_reflect_token INSIGHT_HUB_AUTH_TOKEN=your_insight_hub_token SWAGGER_HUB_API_KEY=your_swagger_hub_token npx @modelcontextprotocol/inspector node dist/index.js
```

This will open an inspector window in your browser, where you can test the tools.

## Environment Variables

- `INSIGHT_HUB_AUTH_TOKEN`: Required for Insight Hub tools. The Auth Token for Insight Hub.
- `REFLECT_API_TOKEN`: Required for Reflect tools. The Reflect Account API Key for Reflect-based tools.
- `SWAGGER_HUB_API_KEY`: Required for Swagger Hub tools. The Auth Token for Swagger Hub-based tools.
- `MCP_SERVER_INSIGHT_HUB_API_KEY`: Optional. If set, enables error reporting of the _MCP_server_ code via the BugSnag SDK. This is useful for debugging and monitoring of the MCP server itself and shouldn't be set to the same API key as your app.

## Supported Tools

See individual guides for suggested prompts and supported tools and resources:

- [Insight Hub](./insight-hub/README.md)\
  Get your top events and invite your LLM to help you fix them.
- [Reflect](./reflect/README.md)
- [SwaggerHub](./swaggerhub-portal/README.md)

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
