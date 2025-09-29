This guide is to help you get up and running with our MCP server.

## Installation and Setup

### Prerequisites

Before setting up and using the SmartBear MCP Server, ensure you have: 

-   An active account across our relevant hubs (e.g. [API Hub](https://try.platform.smartbear.com/?product=ApiHub), [Test Hub](https://app.reflect.run/registration), [QMetry](https://testmanagement.qmetry.com), and/or [BugSnag](https://app.bugsnag.com/user/new)) with valid API credentials.
-   Node.js 20 or later installed on your development machine
-   A compatible MCP client (Claude Desktop, Cursor, etc.)

### Installing the Server

The SmartBear MCP Server is now available as an NPM package, and can be installed globally or as a project dependency.

Many IDEs and tools now support the "Add MCP Server" workflow, which automatically installs the server without requiring any manual setup. For example, for VSCode you can add our MCP server directly in VSCode using the `"MCP: Add server"` command and giving the NPM package. 

Alternatively, you can install directly using NPM by following the instructions below.

To install the server globally, run:

```
npm install -g @smartbear/mcp

```

This will make the `mcp` command available globally on your system, allowing you to start the server from any directory.

Alternatively, you can add it as a dependency in your project:

```
npm install @smartbear/mcp

```

### Authentication Setup

The SmartBear MCP Server supports multiple SmartBear Hubs, each requiring its own authentication token.

- **API Hub - Portal**

  Copy the API key from the API Hub dashboard at [`app.swaggerhub.com`](https://app.swaggerhub.com/settings/apiKey).

- **API Hub - Contract Testing (PactFlow)**

  Copy the relevant API tokens from [`app.pactflow.io`](https://app.pactflow.io/settings/api-tokens). You will also need to note the tenant URL for your organization (e.g., `{tenant}.pactflow.io`). The MCP server also supports the open source Pact Broker, in which case you will need a username and password instead of a token.

- **Test Hub (Reflect)**

  Generate an API key from your dashboard at [`app.reflect.run`](https://app.reflect.run/settings/account).

- **BugSnag**

  Generate a new Token from the BugSnag dashboard at [`app.bugsnag.com`](https://app.bugsnag.com/settings/smartbear-software/my-account/auth-tokens).

- **QMetry**

  Generate an API key from the QMetry at [`app.qmetry.com`](https://testmanagement.qmetry.com/#/integration/open-api).

> 🔐 Store your tokens securely. They provide access to sensitive data and should be treated like passwords. You can use any combination of the supported products - tokens for unused products can be omitted.

## Configure Environment Variables

The following environment variables based on which SmartBear hubs you want to access:

```
# Required for BugSnag tools
export BUGSNAG_AUTH_TOKEN=your-bugsnag-auth-token

#(Recommended when using BugSnag Tools)
# The API key for the BugSnag project you wish to interact with. Use this to scope all operations to a single project.
export BUGSNAG_PROJECT_API_KEY=your-bugsnag-project-api-key

# Required for Reflect tools
export REFLECT_API_TOKEN=your-reflect-api-token

# Required for API Hub - Portal tools
export API_HUB_API_KEY=your-api-hub-api-key

# Required for API Hub - Contract Testing (PactFlow) tools
export PACT_BROKER_BASE_URL=https://your-tenant.pactflow.io
export PACT_BROKER_TOKEN=your-pactflow-api-token
# If using the open source Pact broker, replace the token with:
export PACT_BROKER_USERNAME=your-username
export PACT_BROKER_PASSWORD=your-password

# Optional: Enable error reporting for the MCP server itself
export MCP_SERVER_BUGSNAG_API_KEY=your-monitoring-api-key

# Required for QMetry tools
export QMETRY_API_KEY=your-qmetry_api_key

# Optional: Set your QMetry server URL if using a self-hosted instance or region-specific endpoint
export QMETRY_BASE_URL=https://testmanagement.qmetry.com

```

> ⚠️ The `MCP_SERVER_BUGSNAG_API_KEY` is used for monitoring the MCP server itself and should be different from your main application's API key.

## MCP Host Configuration

Configure your MCP host to connect to the SmartBear server. Below are examples for popular clients. In all cases, replace `<PATH_TO_SMARTBEAR_MCP>` with the absolute path to your cloned repository.

### VS Code with GitHub Co-Pilot

Create or edit `.vscode/mcp.json` in your workspace:

```
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
        "BUGSNAG_AUTH_TOKEN": "${input:bugsnag_auth_token}",
        "BUGSNAG_PROJECT_API_KEY": "${input:bugsnag_project_api_key}",
        "REFLECT_API_TOKEN": "${input:reflect_api_token}",
        "API_HUB_API_KEY": "${input:api_hub_api_key}",
        "PACT_BROKER_BASE_URL": "${input:pact_broker_base_url}",
        "PACT_BROKER_TOKEN": "${input:pact_broker_token}",
        // "PACT_BROKER_USERNAME": "${input:pact_broker_username}",
        // "PACT_BROKER_PASSWORD": "${input:pact_broker_password}",
        "QMETRY_API_KEY": "${input:qmetry_api_key}",
        "QMETRY_BASE_URL": "${input:qmetry_base_url}",
      }
    }
  },
  "inputs": [
    {
      "id": "bugsnag_auth_token",
      "type": "promptString",
      "description": "BugSnag Auth Token",
      "password": true
    },
    {
      "id": "bugsnag_project_api_key",
      "type": "promptString",
      "description": "BugSnag Project API Key - for single project interactions",
      "password": false
    },
    {
      "id": "reflect_api_token",
      "type": "promptString",
      "description": "Reflect API Token",
      "password": true
    },
    {
      "id": "api_hub_api_key",
      "type": "promptString",
      "description": "API Hub API Key",
      "password": true
    },
    {
      "id": "pact_broker_base_url",
      "type": "promptString",
      "description": "Pact Broker Base URL (e.g. https://your-tenant.pactflow.io)",
      "password": false
    },
    {
      "id": "pact_broker_token",
      "type": "promptString",
      "description": "Pact Broker Token (or leave blank if using username/password)",
      "password": true
    },
    {
      "id": "pact_broker_username",
      "type": "promptString",
      "description": "Pact Broker Username (if using username/password auth)",
      "password": false
    },
    {
      "id": "pact_broker_password",
      "type": "promptString",
      "description": "Pact Broker Password (if using username/password auth)",
      "password": true
    },
    {
      "id": "qmetry_api_key",
      "type": "promptString",
      "description": "QMetry Open API Key",
      "password": true
    },
    {
      "id": "qmetry_base_url",
      "type": "promptString",
      "description": "By default, connects to https://testmanagement.qmetry.com. Change to a custom QMetry server URL or a region-specific endpoint if needed.",
      "password": false
    },
  ]
}

```

### Cursor

Add to your `mcp.json` configuration:

```
{
  "servers": {
    "smartbear": {
      "command": "npx",
      "args": [
      	"-y",
      	"@smartbear/mcp@latest"
      	],
      "env": {
        "BUGSNAG_AUTH_TOKEN": "your-bugsnag-auth-token",
        "BUGSNAG_PROJECT_API_KEY": "your-bugsnag-project-api-key",
        "REFLECT_API_TOKEN": "your-reflect-api-token",
        "API_HUB_API_KEY": "your-api-hub-api-key",
        "PACT_BROKER_BASE_URL": "https://your-tenant.pactflow.io",
        "PACT_BROKER_TOKEN": "your-pact-broker-token",
        // If using the open source Pact broker, replace the token with:
        // "PACT_BROKER_USERNAME": "your-username",
        // "PACT_BROKER_PASSWORD": "your-password",
        "QMETRY_API_KEY": "${input:qmetry_api_key}",
        "QMETRY_BASE_URL": "${input:qmetry_base_url}",
      }
    }
  }
}

```

### Claude Desktop

Edit your `claude_desktop_config.json` file:

```
{
  "mcpServers": {
    "smartbear": {
      "command": "npx",
      "args": [
      	"-y",
      	"@smartbear/mcp@latest"
      	],
      "env": {
        "BUGSNAG_AUTH_TOKEN": "your-bugsnag-auth-token",
        "BUGSNAG_PROJECT_API_KEY": "your-bugsnag-project-api-key",
        "REFLECT_API_TOKEN": "your-reflect-api-token",
        "API_HUB_API_KEY": "your-api-hub-api-key",
        "PACT_BROKER_BASE_URL": "https://your-tenant.pactflow.io",
        "PACT_BROKER_TOKEN": "your-pact-broker-token",
        // If using the open source Pact broker, replace the token with:
        // "PACT_BROKER_USERNAME": "your-username",
        // "PACT_BROKER_PASSWORD": "your-password",
        "QMETRY_API_KEY": "${input:qmetry_api_key}",
        "QMETRY_BASE_URL": "${input:qmetry_base_url}",
      }
    }
  }
}

```

### Claude Code

Claude Code has native support for MCP servers. If you've installed the SmartBear MCP Server globally, you can connect it to Claude Code with:

```
claude mcp add --transport stdio smartbear node mcp

```

Alternatively, if you've scoped the MCP Server installation to a local project, use:

```
claude mcp add --transport stdio smartbear npx mcp

```

Then set the required environment variables:

```
export BUGSNAG_AUTH_TOKEN=your-bugsnag-auth-token
export BUGSNAG_PROJECT_API_KEY=your-bugsnag-project-api-key
export REFLECT_API_TOKEN=your-reflect-api-token
export API_HUB_API_KEY=your-api-hub-api-key
export QMETRY_API_KEY=your-qmetry_api_key
export QMETRY_BASE_URL=https://testmanagement.qmetry.com

export PACT_BROKER_BASE_URL=https://your-tenant.pactflow.io
export PACT_BROKER_TOKEN=your-pact-broker-token
# If using the open source Pact broker, replace the token with:
# export PACT_BROKER_USERNAME=your-username
# export PACT_BROKER_PASSWORD=your-password
```

Launch Claude Code with:

```
claude

```

You'll have access to all SmartBear tools within your Claude Code sessions.

### Other MCP Hosts

The SmartBear MCP Server follows standard MCP protocols and should work with any client that supports:

-   STDIO transport mode
-   Environment variable configuration
-   Standard MCP tool calling conventions

### Building the Server

You can also build the SmartBear MCP Server locally, and raise PRs back via GitHub. To do so, clone the repository and build it locally:

```
git clone https://github.com/SmartBear/smartbear-mcp.git
cd smartbear-mcp
npm install
npm run build

```

This will create a `dist/index.js` file that serves as the MCP server executable.

### Running the Server (VSCode Example)

To run the built server locally in VS Code, add the following configuration to `.vscode/mcp.json` replacing `<PATH_TO_SMARTBEAR_MCP>` with the location of this repo on your filesystem:

```
{
  "servers": {
    "smartbear": {
      "type": "stdio",
      "command": "node",
      "args": ["<PATH_TO_SMARTBEAR_MCP>/dist/index.js"],
      "env": {
        "BUGSNAG_AUTH_TOKEN": "${input:bugsnag_auth_token}",
        "BUGSNAG_PROJECT_API_KEY": "${input:bugsnag_project_api_key}",
        "REFLECT_API_TOKEN": "${input:reflect_api_token}",
        "API_HUB_API_KEY": "${input:api_hub_api_key}",
        "PACT_BROKER_BASE_URL": "${input:pact_broker_base_url}",
        "PACT_BROKER_TOKEN": "${input:pact_broker_token}",
        // If using the open source Pact broker, replace the token with:
        // "PACT_BROKER_USERNAME": "${input:pact_broker_username}",
        // "PACT_BROKER_PASSWORD": "${input:pact_broker_password}",
        "QMETRY_API_KEY": "${input:qmetry_api_key}",
        "QMETRY_BASE_URL": "${input:qmetry_base_url}",
      }
    }
  },
  "inputs": [
      {
         "id": "bugsnag_auth_token",
         "type": "promptString",
         "description": "BugSnag Auth Token",
         "password": true
      },
      {
         "id": "bugsnag_project_api_key",
         "type": "promptString",
         "description": "BugSnag Project API Key - for single project interactions",
         "password": false
      },
      {
         "id": "reflect_api_token",
         "type": "promptString",
         "description": "Reflect API Token",
         "password": true
      },
      {
         "id": "api_hub_api_key",
         "type": "promptString",
         "description": "API Hub API Key",
         "password": true
      },
      {
         "id": "pact_broker_base_url",
         "type": "promptString",
         "description": "Pact Broker Base URL (e.g. https://your-tenant.pactflow.io)",
         "password": false
      },
      {
         "id": "pact_broker_token",
         "type": "promptString",
         "description": "Pact Broker Token (or leave blank if using username/password)",
         "password": true
      },
      {
         "id": "pact_broker_username",
         "type": "promptString",
         "description": "Pact Broker Username (if using username/password auth)",
         "password": false
      },
      {
         "id": "pact_broker_password",
         "type": "promptString",
         "description": "Pact Broker Password (if using username/password auth)",
         "password": true
      },
      {
          "id": "qmetry_api_key",
          "type": "promptString",
          "description": "QMetry Open API Key",
          "password": true
      },
      {
          "id": "qmetry_base_url",
          "type": "promptString",
          "description": "By default, connects to https://testmanagement.qmetry.com. Change to a custom QMetry server URL or a region-specific endpoint if needed.",
          "password": false
      },
  ]
}

```

### Testing with MCP Inspector

To test the MCP server locally before integrating with your preferred host, you can use the MCP Inspector:

```
BUGSNAG_AUTH_TOKEN=your_token \
BUGSNAG_PROJECT_API_KEY=your_project_api_key \
REFLECT_API_TOKEN=your_reflect_token \
API_HUB_API_KEY=your_api_hub_key \
PACT_BROKER_BASE_URL=https://your-tenant.pactflow.io \
PACT_BROKER_TOKEN=your_pactflow_token \
QMETRY_API_KEY=your_qmetry_key \
QMETRY_BASE_URL=https://testmanagement.qmetry.com \
npx @modelcontextprotocol/inspector node dist/index.js

```

## Usage Examples

Once configured, you can interact with SmartBear tools through natural language queries in your AI assistant. Here are examples based on the available tools:

### BugSnag Error Investigation

-   "Help me fix this crash from BugSnag: https://app.bugsnag.com/my-org/my-project/errors/1a2b3c4d5e6f7g8h9i0j1k2l?&event_id=1a2b3c4d5e6f7g8h9i0j1k2l"
-   "What are my top events for the 'example' project in BugSnag?"
-   "Show me the latest occurrence of error ID abc123 in project xyz789"
-   "List all projects in my organization so I can investigate errors"
-   "Get details about the most recent event for this specific error"

### Event Analysis and Debugging

-   "Analyze this specific event ID and help me understand the root cause"
-   "What context information is available for this error occurrence?"
-   "Show me the complete stack trace and user data for this event"
-   "Help me understand the breadcrumbs leading to this crash"

### Cross-platform Debugging Workflows

-   "Compare this BugSnag error with similar issues in our codebase"
-   "Generate a debugging checklist based on this error's characteristics"
-   "What patterns do you see in the user context and device information?"
-   "Help me create a reproduction scenario based on this event data"

### Organization and Project Management

-   "What organizations do I have access to in BugSnag?"
-   "List all projects in organization org_12345"
-   "Show me project details for the mobile app project"

### API Hub Contract Testing (PactFlow)

-   "List all the provider states for the current provider"
-   "Generate Pact tests from this OpenAPI spec: [spec link]"
-   "Review this Pact test and suggest improvements"

### QMetry Test Management

-   "Set current QMetry project for your account"
-   "Fetch current QMetry project for your account"
-   "List all QMetry Test Cases for your account"
-   "Get the QMetry Test Case details"
-   "Get the QMetry Test Case detail for specific version"
-   "Get the QMetry Test Case steps"
