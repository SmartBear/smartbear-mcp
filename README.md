# SmartBear MCP Server

MCP Server for the SmartBear APIs.

## Supported Tools

### Reflect

The MCP server provides access to the following Reflect tools:

1. `list_reflect_suites`
   - List all Reflect suites for your account.
2. `list_reflect_suite_executions`
   - List all executions for a given Reflect suite.
3. `reflect_suite_execution_status`
   - Get the status of a Reflect suite execution.
4. `reflect_suite_execution`
   - Execute a Reflect suite.
5. `cancel_reflect_suite_execution`
   - Cancel a Reflect suite execution.
6. `list_reflect_tests`
   - List all Reflect tests.
7. `run_reflect_test`
   - Run a Reflect test.
8. `reflect_test_status`
   - Get the status of a Reflect test execution.

**Environment Variable:**
- `REFLECT_API_TOKEN`: Required. The Reflect Account API Key for Reflect-based tools.

### Insight Hub

The MCP server provides access to the following Insight Hub tools:

1. `list_insight_hub_projects`
   - List all projects in an organization.
2. `get_insight_hub_error`
   - Get error details from a project.
3. `get_insight_hub_error_latest_event`
   - Get the latest event for an error.
4. `get_insight_hub_event_details`
   - Get details of a specific event on Insight Hub.

**Environment Variable:**
- `INSIGHT_HUB_AUTH_TOKEN`: Required. The Auth Token for Insight Hub-based tools.

### Swagger Hub

The MCP server provides access to the following Swagger Hub tools:

1. `list_swaggerhub_portals`
   - Search for available portals. Results are returned only for portals where you have a designer role, either at the product level or organization level.
2. `create_swaggerhub_portal`
   - Create a new portal.
3. `get_swaggerhub_portal`
   - Retrieve information about a portal.
4. `delete_swaggerhub_portal`
   - Delete a portal.
5. `update_swaggerhub_portal`
   - Update a portal.
6. `list_swaggerhub_products`
   - Get products for a specific portal that match your criteria.
7. `create_swaggerhub_product`
   - Create a new product for a specific portal.
8. `get_swaggerhub_product`
   - Retrieve information about a specific product resource.
9. `delete_swaggerhub_product`
   - Delete a product from a specific portal.
10. `update_swaggerhub_product`
   - Update a product in a specific portal.

**Environment Variable:**
- `SWAGGER_HUB_API_KEY`: Required. The Auth Token for Swagger Hub-based tools.

## Resources
### Insight Hub Resources

The MCP server exposes several Insight Hub resources that can be accessed via the Model Context Protocol:

- **insight_hub_orgs**
  - URI: `insighthub://orgs`
  - Description: Lists all organizations available to your Insight Hub account in JSON format.
  - Example usage: Retrieve a list of all organizations to get their IDs for use with other tools.

- **insight_hub_event**
  - URI Template: `insighthub://event/{id}`
  - Description: Fetches details for a specific event by its event ID. Returns the event details in JSON format.
  - Example usage: Retrieve event details for debugging or analysis by referencing the event ID.

These resources can be accessed programmatically or through compatible MCP clients, and are useful for automation, integrations, or advanced workflows.

## Usage

### MCP Inspector
To test the MCP server locally, you can use the following command:

```bash
npm run build
# For Reflect tools only:
REFLECT_API_TOKEN=your_reflect_token npx @modelcontextprotocol/inspector node dist/index.js
# For Insight Hub tools only:
INSIGHT_HUB_AUTH_TOKEN=your_insight_hub_token npx @modelcontextprotocol/inspector node dist/index.js
# For Swagger Hub tools only:
SWAGGER_HUB_API_KEY=your_swagger_hub_token npx @modelcontextprotocol/inspector node dist/index.js
# For Reflect, Insight Hub and Swagger Hub tools:
REFLECT_API_TOKEN=your_reflect_token INSIGHT_HUB_AUTH_TOKEN=your_insight_hub_token SWAGGER_HUB_API_KEY=your_swagger_hub_token npx @modelcontextprotocol/inspector node dist/index.js
```

This will open an inspector window in your browser, where you can test the tools.

### VS Code

Add the following configuration to `.vscode/mcp.json`, depending on the type you want to use:

#### NPX

```json
{
  "inputs": [
      {
         "id": "insight_hub_auth_token",
         "type": "promptString",
         "description": "InsightHub Auth Token",
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
         "description": "SwaggerHub API Token",
         "password": true
      }
  ],
  "servers": {
    "smartbear": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-smartbear"],
      "env": {
        "INSIGHT_HUB_AUTH_TOKEN": "${input:insight_hub_auth_token}",
        "REFLECT_API_TOKEN": "${input:reflect_api_token}",
         "SWAGGER_HUB_API_KEY": "${input:swagger_hub_api_key}"
      }
    }
  }
}
```

#### Docker

```json
{
  "inputs": [
      {
         "id": "insight_hub_auth_token",
         "type": "promptString",
         "description": "InsightHub Auth Token",
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
         "description": "SwaggerHub API Token",
         "password": true
      }
  ],
  "servers": {
    "smartbear": {
      "type": "stdio",
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "-e",
        "INSIGHT_HUB_AUTH_TOKEN",
        "-e",
        "REFLECT_API_TOKEN",
         "-e",
         "SWAGGER_HUB_API_KEY",
        "mcp/smartbear"
      ],
      "env": {
        "INSIGHT_HUB_AUTH_TOKEN": "${input:insight_hub_auth_token}",
        "REFLECT_API_TOKEN": "${input:reflect_api_token}",
        "SWAGGER_HUB_API_KEY": "${input:swagger_hub_api_key}"
      }
    }
  }
}
```

#### local

```json
{
  "inputs": [
      {
         "id": "insight_hub_auth_token",
         "type": "promptString",
         "description": "InsightHub Auth Token",
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
         "description": "SwaggerHub API Token",
         "password": true
      }
  ],
  "servers": {
    "smartbear": {
      "type": "stdio",
      "command": "node",
      "args": ["${workspaceFolder}/dist/index.js"],

      "env": {
        "INSIGHT_HUB_AUTH_TOKEN": "${input:insight_hub_auth_token}",
        "REFLECT_API_TOKEN": "${input:reflect_api_token}",
        "SWAGGER_HUB_API_KEY": "${input:swagger_hub_api_key}"
      }
    }
  }
}
```

### Environment Variables

- `REFLECT_API_TOKEN`: Required for Reflect tools. The Reflect Account API Key for Reflect-based tools.
- `INSIGHT_HUB_AUTH_TOKEN`: Required for Insight Hub tools. The Auth Token for Insight Hub.
- `SWAGGER_HUB_API_KEY`: Required for Swagger Hub tools. The Auth Token for Swagger Hub-based tools.
- `MCP_SERVER_INSIGHT_HUB_API_KEY`: Optional. If set, enables error reporting of the _MCP_server_ code via the BugSnag SDK. This is useful for debugging and monitoring of the MCP server itself and shouldn't be set to the same API key as your app.

## Build

Docker build:

```bash
docker build -t mcp/smartbear .
```

## License

This MCP server is licensed under the MIT License. This means you are free to use, modify, and distribute the software, subject to the terms and conditions of the MIT License. For more details, please see the LICENSE file in the project repository.
