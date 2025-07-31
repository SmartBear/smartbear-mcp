This guide is to help you get up and running with our MCP server.

## Installation and Setup

### Prerequisites

Before setting up and using the SmartBear MCP Server, ensure you have: 

-   An active account across our relevant hubs (e.g. [API Hub](https://try.platform.smartbear.com/?product=ApiHub), [Test Hub](https://app.reflect.run/registration), and/or [Insight Hub](https://app.bugsnag.com/user/new)).
-   Node.js 20 or later installed on your development machine
-   A compatible MCP client (Claude Desktop, Cursor, etc.)
-   Valid API credentials for the relevant hubs.

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

The SmartBear MCP Server supports multiple SmartBear Hubs, each requiring its own authentication token. You only need to configure tokens for the products you plan to use:

For API Hub access:

1.  Log in to your API Hub dashboard
2.  Navigate to Profile → API Key
3.  Click the "Copy API Key" button

For Test Hub (Reflect) access:

1.  Log in to your Test Hub (Reflect) dashboard
2.  Navigate to Settings → Account Information
3.  Scroll to the "API Access" section

For Insight Hub access:

1.  Log in to your Insight Hub dashboard
2.  Navigate to Settings → My account/Personal auth tokens
3.  Generate a new token

> 🔐 Store your tokens securely. They provide access to sensitive data and should be treated like passwords. You can use any combination of the supported products - tokens for unused products can be omitted.

## Configure Environment Variables

The following environment variables based on which SmartBear hubs you want to access:

```
# Required for Insight Hub tools
export INSIGHT_HUB_AUTH_TOKEN=your-insight-hub-auth-token

#(Recommended when using Insight Hub Tools)
# The API key for the Insight Hub project you wish to interact with. Use this to scope all operations to a single project.
INSIGHT_HUB_PROJECT_API_KEY:=your-insight-hub-project-api-key

# Required for Reflect tools
export REFLECT_API_TOKEN=your-reflect-api-token

# Required for API Hub tools
export API_HUB_API_KEY=your-api-hub-api-key

# Optional: Enable error reporting for the MCP server itself
export MCP_SERVER_INSIGHT_HUB_API_KEY=your-monitoring-api-key

```

> ⚠️ The `MCP_SERVER_INSIGHT_HUB_API_KEY` is used for monitoring the MCP server itself and should be different from your main application's API key.

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
      "description": "Insight Hub Auth Token",
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
      "description": "Reflect API Token",
      "password": true
    },
    {
      "id": "api_hub_api_key",
      "type": "promptString",
      "description": "API Hub API Key",
      "password": true
    }
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
        "INSIGHT_HUB_AUTH_TOKEN": "your-insight-hub-auth-token",
        "INSIGHT_HUB_PROJECT_API_KEY": "your-insight-hub-project-api-key",
        "REFLECT_API_TOKEN": "your-reflect-api-token",
        "API_HUB_API_KEY": "your-api-hub-api-key"
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
        "INSIGHT_HUB_AUTH_TOKEN": "your-insight-hub-auth-token",
        "INSIGHT_HUB_PROJECT_API_KEY": "your-insight-hub-project-api-key",
        "REFLECT_API_TOKEN": "your-reflect-api-token",
        "API_HUB_API_KEY": "your-api-hub-api-key"
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
export INSIGHT_HUB_AUTH_TOKEN=your-insight-hub-auth-token
export INSIGHT_HUB_PROJECT_API_KEY=your-insight-hub-project-api-key
export REFLECT_API_TOKEN=your-reflect-api-token
export API_HUB_API_KEY=your-api-hub-api-key

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
         "description": "Insight Hub Auth Token",
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
         "description": "Reflect API Token",
         "password": true
      },
      {
         "id": "api_hub_api_key",
         "type": "promptString",
         "description": "API Hub API Key",
         "password": true
      }
  ]
}

```

### Testing with MCP Inspector

To test the MCP server locally before integrating with your preferred host, you can use the MCP Inspector:

```
INSIGHT_HUB_AUTH_TOKEN=your_token\
INSIGHT_HUB_PROJECT_API_KEY=your_project_api_key\
REFLECT_API_TOKEN=your_reflect_token\
API_HUB_API_KEY=your_api_hub_key\
npx @modelcontextprotocol/inspector node dist/index.js

```

## Usage Examples

Once configured, you can interact with SmartBear tools through natural language queries in your AI assistant. Here are examples based on the available tools:

### Insight Hub Error Investigation

-   "Help me fix this crash from Insight Hub: https://app.bugsnag.com/my-org/my-project/errors/1a2b3c4d5e6f7g8h9i0j1k2l?&event_id=1a2b3c4d5e6f7g8h9i0j1k2l"
-   "What are my top events for the 'example' project in Insight Hub?"
-   "Show me the latest occurrence of error ID abc123 in project xyz789"
-   "List all projects in my organization so I can investigate errors"
-   "Get details about the most recent event for this specific error"

### Event Analysis and Debugging

-   "Analyze this specific event ID and help me understand the root cause"
-   "What context information is available for this error occurrence?"
-   "Show me the complete stack trace and user data for this event"
-   "Help me understand the breadcrumbs leading to this crash"

### Cross-platform Debugging Workflows

-   "Compare this Insight Hub error with similar issues in our codebase"
-   "Generate a debugging checklist based on this error's characteristics"
-   "What patterns do you see in the user context and device information?"
-   "Help me create a reproduction scenario based on this event data"

### Organization and Project Management

-   "What organizations do I have access to in Insight Hub?"
-   "List all projects in organization org_12345"
-   "Show me project details for the mobile app project"