This guide walks you through installing and configuring the local SmartBear MCP Server — a single npm package that provides tools for all supported SmartBear products.

> **Looking for a simpler setup?** If you only need Swagger, BugSnag, or Zephyr tools, consider the [Remote MCP Servers](/smartbear-mcp/docs/remote-mcp-servers) instead. They require no installation and authenticate via OAuth.

## Prerequisites

Before setting up and using the SmartBear MCP Server, ensure you have:

-   An active account across our relevant products (e.g. [BearQ](https://bearq.smartbear.com), [Swagger](https://try.platform.smartbear.com/?product=ApiHub), [Reflect](https://app.reflect.run/registration), [QMetry](https://testmanagement.qmetry.com), and/or [BugSnag](https://app.bugsnag.com/user/new)) with valid API credentials.
-   Node.js 20 or later installed on your development machine
-   A compatible MCP client (Claude Desktop, Cursor, etc.)

## Installing the Server

The SmartBear MCP Server is available as an NPM package, and can be installed globally or as a project dependency.

Many IDEs and tools now support the "Add MCP Server" workflow, which automatically installs the server without requiring any manual setup. For example, in VS Code you can add the MCP server directly using the `"MCP: Add server"` command and providing the NPM package name.

Alternatively, install directly using NPM:

To install globally:

```
npm install -g @smartbear/mcp
```

This makes the `mcp` command available globally on your system, allowing you to start the server from any directory.

Or add it as a project dependency:

```
npm install @smartbear/mcp
```

## Authentication Setup

The SmartBear MCP Server supports multiple SmartBear products, each requiring its own authentication token.

- **BearQ**

  Generate a workspace API token from your BearQ workspace settings. Learn more: [BearQ integration](https://developer.smartbear.com/smartbear-mcp/docs/bearq-integration).

- **Swagger - Portal & Studio**

  Copy the API key from the Swagger dashboard at [`app.swaggerhub.com`](https://app.swaggerhub.com/settings/apiKey).

  > **Note:** The environment variable `API_HUB_API_KEY` is still supported for backward compatibility, but `SWAGGER_API_KEY` is now the preferred name.

- **Swagger - Contract Testing (PactFlow)**

  Copy the relevant API tokens from [`app.pactflow.io`](https://app.pactflow.io/settings/api-tokens). You will also need to note the tenant URL for your organization (e.g., `{tenant}.pactflow.io`). The MCP server also supports the open source Pact Broker, in which case you will need a username and password instead of a token.

- **Reflect**

  Generate an API key from your dashboard at [`app.reflect.run`](https://app.reflect.run/settings/account).

- **BugSnag**

  Generate a new Personal Auth Token from your account settings in the BugSnag dashboard at [`app.bugsnag.com`](https://app.bugsnag.com/settings/smartbear-software/my-account/auth-tokens).

- **QMetry**

  Generate an API key from QMetry at [`testmanagement.qmetry.com`](https://testmanagement.qmetry.com/#/integration/open-api).

- **Zephyr**

  Generate an API token from Zephyr by following the instructions [here](https://support.smartbear.com/zephyr/docs/en/rest-api/api-access-tokens-management.html).

- **QTM4J**

  Generate your QTM4J API key by following the instructions [here](https://support.smartbear.com/qmetry-test-management-for-jira-cloud/docs/en/user-guide/qmetry-open-api.html). To use automation tools, also generate a separate `QTM4J_AUTOMATION_API_KEY` from the same page.

- **Swagger Functional Testing**

  Generate an API key from your Swagger Functional Testing account dashboard at [`app.reflect.run`](https://app.reflect.run/settings/account).

> 🔐 Store your tokens securely. They provide access to sensitive data and should be treated like passwords. You can use any combination of the supported products — tokens for unused products can be omitted.

## Configure Environment Variables

Set the following environment variables for the SmartBear products you want to access:

```shell
# Required for BearQ tools
export BEARQ_API_TOKEN=your-bearq-api-token
# Optional: Override the BearQ API base URL (defaults to https://api.bearq.smartbear.com)
export BEARQ_API_BASE_URL=https://api.bearq.smartbear.com

# Required for BugSnag tools
export BUGSNAG_AUTH_TOKEN=your-bugsnag-auth-token

# (Recommended when using BugSnag Tools)
# The API key for the BugSnag project you wish to interact with. Use this to scope all operations to a single project.
export BUGSNAG_PROJECT_API_KEY=your-bugsnag-project-api-key

# Required for Reflect tools
export REFLECT_API_TOKEN=your-reflect-api-token

# Required for Swagger - Portal & Studio tools
export SWAGGER_API_KEY=your-swagger-api-key

# Required for Swagger - Contract Testing (PactFlow) tools
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

# Required for Zephyr tools
export ZEPHYR_API_TOKEN="your-zephyr-api-token"
# Optional: Set your Zephyr API base URL depending on the region of your Jira instance.
export ZEPHYR_BASE_URL="https://api.zephyrscale.smartbear.com/v2"

# Required for QTM4J tools
export QTM4J_API_KEY="your-qtm4j-api-key"
# Required for QTM4J automation tools (Upload Automation Result, Get Automation History)
export QTM4J_AUTOMATION_API_KEY="your-qtm4j-automation-api-key"
# Optional: Set your QTM4J base URL based on your region
# US (default): https://qtmcloud.qmetry.com Australia: https://syd-qtmcloud.qmetry.com
export QTM4J_BASE_URL="https://qtmcloud.qmetry.com"

# Required for Swagger Functional Testing tools
export SWAGGER_FUNCTIONAL_TESTING_API_TOKEN=your-functional-testing-api-token
# Optional: Override the Swagger Functional Testing API base URL (defaults to https://api.reflect.run/v1)
export SWAGGER_FUNCTIONAL_TESTING_BASE_PATH=https://api.reflect.run/v1
```

> ⚠️ The `MCP_SERVER_BUGSNAG_API_KEY` is used for monitoring the MCP server itself and should be different from your main application's API key.

## MCP Host Configuration

Configure your MCP host to connect to the SmartBear server. Below are examples for popular clients.

### VS Code with GitHub Copilot

Create or edit `.vscode/mcp.json` in your workspace:

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
        "BEARQ_API_TOKEN": "${input:bearq_api_token}",
        "BEARQ_API_BASE_URL": "${input:bearq_api_base_url}",
        "BUGSNAG_AUTH_TOKEN": "${input:bugsnag_auth_token}",
        "BUGSNAG_PROJECT_API_KEY": "${input:bugsnag_project_api_key}",
        "REFLECT_API_TOKEN": "${input:reflect_api_token}",
        "SWAGGER_API_KEY": "${input:swagger_api_key}",
        "PACT_BROKER_BASE_URL": "${input:pact_broker_base_url}",
        "PACT_BROKER_TOKEN": "${input:pact_broker_token}",
        // "PACT_BROKER_USERNAME": "${input:pact_broker_username}",
        // "PACT_BROKER_PASSWORD": "${input:pact_broker_password}",
        "QMETRY_API_KEY": "${input:qmetry_api_key}",
        "QMETRY_BASE_URL": "${input:qmetry_base_url}",
        "ZEPHYR_API_TOKEN": "${input:zephyr_api_token}",
        "ZEPHYR_BASE_URL": "${input:zephyr_base_url}",
        "QTM4J_API_KEY": "${input:qtm4j_api_key}",
        "QTM4J_AUTOMATION_API_KEY": "${input:qtm4j_automation_api_key}",
        "QTM4J_BASE_URL": "${input:qtm4j_base_url}",
        "SWAGGER_FUNCTIONAL_TESTING_API_TOKEN": "${input:swagger_functional_testing_api_token}",
        "SWAGGER_FUNCTIONAL_TESTING_BASE_PATH": "${input:swagger_functional_testing_base_path}"
      }
    }
  },
  "inputs": [
    {
      "id": "bearq_api_token",
      "type": "promptString",
      "description": "BearQ Workspace API Token",
      "password": true
    },
    {
      "id": "bearq_api_base_url",
      "type": "promptString",
      "description": "BearQ API Base URL (leave blank for default https://api.bearq.smartbear.com)",
      "password": false
    },
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
      "id": "swagger_api_key",
      "type": "promptString",
      "description": "Swagger API Key",
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
    {
      "id": "zephyr_api_token",
      "type": "promptString",
      "description": "Zephyr API Token",
      "password": true
    },
    {
      "id": "zephyr_base_url",
      "type": "promptString",
      "description": "By default, connects to https://api.zephyrscale.smartbear.com/v2. Change to a custom server URL if your Jira instance is pinned to a specific region.",
      "password": false
    },
    {
      "id": "qtm4j_api_key",
      "type": "promptString",
      "description": "QTM4J API Key",
      "password": true
    },
    {
      "id": "qtm4j_automation_api_key",
      "type": "promptString",
      "description": "QTM4J Automation API Key — required for Upload Automation Result and Get Automation History tools.",
      "password": true
    },
    {
      "id": "qtm4j_base_url",
      "type": "promptString",
      "description": "US region (default): https://qtmcloud.qmetry.com. Australia region: https://syd-qtmcloud.qmetry.com.",
      "password": false
    },
    {
      "id": "swagger_functional_testing_api_token",
      "type": "promptString",
      "description": "Swagger Functional Testing API Token",
      "password": true
    },
    {
      "id": "swagger_functional_testing_base_path",
      "type": "promptString",
      "description": "Swagger Functional Testing API Base URL (leave blank for default https://api.reflect.run/v1)",
      "password": false
    }
  ]
}
```

### Cursor

Add to your `mcp.json` configuration:

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
        "BEARQ_API_TOKEN": "your-bearq-api-token",
        "BUGSNAG_AUTH_TOKEN": "your-bugsnag-auth-token",
        "BUGSNAG_PROJECT_API_KEY": "your-bugsnag-project-api-key",
        "REFLECT_API_TOKEN": "your-reflect-api-token",
        "SWAGGER_API_KEY": "your-swagger-api-key",
        "PACT_BROKER_BASE_URL": "https://your-tenant.pactflow.io",
        "PACT_BROKER_TOKEN": "your-pact-broker-token",
        // If using the open source Pact broker, replace the token with:
        // "PACT_BROKER_USERNAME": "your-username",
        // "PACT_BROKER_PASSWORD": "your-password",
        "QMETRY_API_KEY": "your-qmetry-api-key",
        "QMETRY_BASE_URL": "https://testmanagement.qmetry.com",
        "ZEPHYR_API_TOKEN": "your-zephyr-api-token",
        "ZEPHYR_BASE_URL": "https://api.zephyrscale.smartbear.com/v2",
        "QTM4J_API_KEY": "your-qtm4j-api-key",
        "QTM4J_AUTOMATION_API_KEY": "your-qtm4j-automation-api-key",
        "QTM4J_BASE_URL": "https://qtmcloud.qmetry.com",
        "SWAGGER_FUNCTIONAL_TESTING_API_TOKEN": "your-functional-testing-api-token"
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
    "smartbear": {
      "command": "npx",
      "args": [
        "-y",
        "@smartbear/mcp@latest"
      ],
      "env": {
        "BEARQ_API_TOKEN": "your-bearq-api-token",
        "BUGSNAG_AUTH_TOKEN": "your-bugsnag-auth-token",
        "BUGSNAG_PROJECT_API_KEY": "your-bugsnag-project-api-key",
        "REFLECT_API_TOKEN": "your-reflect-api-token",
        "SWAGGER_API_KEY": "your-swagger-api-key",
        "PACT_BROKER_BASE_URL": "https://your-tenant.pactflow.io",
        "PACT_BROKER_TOKEN": "your-pact-broker-token",
        // If using the open source Pact broker, replace the token with:
        // "PACT_BROKER_USERNAME": "your-username",
        // "PACT_BROKER_PASSWORD": "your-password",
        "QMETRY_API_KEY": "your-qmetry-api-key",
        "QMETRY_BASE_URL": "https://testmanagement.qmetry.com",
        "ZEPHYR_API_TOKEN": "your-zephyr-api-token",
        "ZEPHYR_BASE_URL": "your-zephyr-base-url",
        "QTM4J_API_KEY": "your-qtm4j-api-key",
        "QTM4J_AUTOMATION_API_KEY": "your-qtm4j-automation-api-key",
        "QTM4J_BASE_URL": "https://qtmcloud.qmetry.com",
        "SWAGGER_FUNCTIONAL_TESTING_API_TOKEN": "your-functional-testing-api-token"
      }
    }
  }
}
```

### Claude Code

Claude Code has native support for MCP servers. If you've installed the SmartBear MCP Server globally, connect it with:

```
claude mcp add --transport stdio smartbear node mcp
```

Alternatively, if you've scoped the MCP Server installation to a local project:

```
claude mcp add --transport stdio smartbear npx mcp
```

Then set the required environment variables:

```shell
export BEARQ_API_TOKEN=your-bearq-api-token
export BUGSNAG_AUTH_TOKEN=your-bugsnag-auth-token
export BUGSNAG_PROJECT_API_KEY=your-bugsnag-project-api-key
export REFLECT_API_TOKEN=your-reflect-api-token
export SWAGGER_API_KEY=your-swagger-api-key
export QMETRY_API_KEY=your-qmetry_api_key
export QMETRY_BASE_URL=https://testmanagement.qmetry.com
export ZEPHYR_API_TOKEN="your-zephyr-api-token"
export ZEPHYR_BASE_URL="https://api.zephyrscale.smartbear.com/v2"

export PACT_BROKER_BASE_URL=https://your-tenant.pactflow.io
export PACT_BROKER_TOKEN=your-pact-broker-token
# If using the open source Pact broker, replace the token with:
# export PACT_BROKER_USERNAME=your-username
# export PACT_BROKER_PASSWORD=your-password
export QTM4J_API_KEY="your-qtm4j-api-key"
export QTM4J_AUTOMATION_API_KEY="your-qtm4j-automation-api-key"
export QTM4J_BASE_URL="https://qtmcloud.qmetry.com"
export SWAGGER_FUNCTIONAL_TESTING_API_TOKEN=your-functional-testing-api-token
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

## Building the Server

You can also build the SmartBear MCP Server locally and raise PRs via GitHub. Clone the repository and build it locally:

```
git clone https://github.com/SmartBear/smartbear-mcp.git
cd smartbear-mcp
npm install
npm run build
```

This creates a `dist/index.js` file that serves as the MCP server executable.

### Running the Built Server (VS Code Example)

To run the built server locally in VS Code, add the following to `.vscode/mcp.json`, replacing `<PATH_TO_SMARTBEAR_MCP>` with the location of this repo on your filesystem:

```json
{
  "servers": {
    "smartbear": {
      "type": "stdio",
      "command": "node",
      "args": ["<PATH_TO_SMARTBEAR_MCP>/dist/index.js"],
      "env": {
        "BEARQ_API_TOKEN": "${input:bearq_api_token}",
        "BEARQ_API_BASE_URL": "${input:bearq_api_base_url}",
        "BUGSNAG_AUTH_TOKEN": "${input:bugsnag_auth_token}",
        "BUGSNAG_PROJECT_API_KEY": "${input:bugsnag_project_api_key}",
        "REFLECT_API_TOKEN": "${input:reflect_api_token}",
        "SWAGGER_API_KEY": "${input:swagger_api_key}",
        "PACT_BROKER_BASE_URL": "${input:pact_broker_base_url}",
        "PACT_BROKER_TOKEN": "${input:pact_broker_token}",
        // If using the open source Pact broker, replace the token with:
        // "PACT_BROKER_USERNAME": "${input:pact_broker_username}",
        // "PACT_BROKER_PASSWORD": "${input:pact_broker_password}",
        "QMETRY_API_KEY": "${input:qmetry_api_key}",
        "QMETRY_BASE_URL": "${input:qmetry_base_url}",
        "ZEPHYR_API_TOKEN": "${input:zephyr_api_token}",
        "ZEPHYR_BASE_URL": "${input:zephyr_base_url}",
        "QTM4J_API_KEY": "${input:qtm4j_api_key}",
        "QTM4J_AUTOMATION_API_KEY": "${input:qtm4j_automation_api_key}",
        "QTM4J_BASE_URL": "${input:qtm4j_base_url}",
        "SWAGGER_FUNCTIONAL_TESTING_API_TOKEN": "${input:swagger_functional_testing_api_token}",
        "SWAGGER_FUNCTIONAL_TESTING_BASE_PATH": "${input:swagger_functional_testing_base_path}"
      }
    }
  },
  "inputs": [
    {
      "id": "bearq_api_token",
      "type": "promptString",
      "description": "BearQ Workspace API Token",
      "password": true
    },
    {
      "id": "bearq_api_base_url",
      "type": "promptString",
      "description": "BearQ API Base URL (leave blank for default https://api.bearq.smartbear.com)",
      "password": false
    },
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
      "id": "swagger_api_key",
      "type": "promptString",
      "description": "Swagger API Key",
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
    {
      "id": "zephyr_api_token",
      "type": "promptString",
      "description": "Zephyr API Token",
      "password": true
    },
    {
      "id": "zephyr_base_url",
      "type": "promptString",
      "description": "By default, connects to https://api.zephyrscale.smartbear.com/v2. Change to a custom server URL if your Jira instance is pinned to a specific region.",
      "password": false
    },
    {
      "id": "qtm4j_api_key",
      "type": "promptString",
      "description": "QTM4J API Key",
      "password": true
    },
    {
      "id": "qtm4j_automation_api_key",
      "type": "promptString",
      "description": "QTM4J Automation API Key — required for Upload Automation Result and Get Automation History tools.",
      "password": true
    },
    {
      "id": "qtm4j_base_url",
      "type": "promptString",
      "description": "US region (default): https://qtmcloud.qmetry.com. Australia region: https://syd-qtmcloud.qmetry.com.",
      "password": false
    },
    {
      "id": "swagger_functional_testing_api_token",
      "type": "promptString",
      "description": "Swagger Functional Testing API Token",
      "password": true
    },
    {
      "id": "swagger_functional_testing_base_path",
      "type": "promptString",
      "description": "Swagger Functional Testing API Base URL (leave blank for default https://api.reflect.run/v1)",
      "password": false
    }
  ]
}
```

## Testing with MCP Inspector

To test the MCP server locally before integrating with your preferred host, use the MCP Inspector:

```
BEARQ_API_TOKEN=your_bearq_token \
BUGSNAG_AUTH_TOKEN=your_token \
BUGSNAG_PROJECT_API_KEY=your_project_api_key \
REFLECT_API_TOKEN=your_reflect_token \
SWAGGER_API_KEY=your_swagger_key \
PACT_BROKER_BASE_URL=https://your-tenant.pactflow.io \
PACT_BROKER_TOKEN=your_pactflow_token \
QMETRY_API_KEY=your_qmetry_key \
QMETRY_BASE_URL=https://testmanagement.qmetry.com \
ZEPHYR_API_TOKEN=your_zephyr_token \
ZEPHYR_BASE_URL=https://api.zephyrscale.smartbear.com/v2 \
QTM4J_API_KEY=your_qtm4j_key \
QTM4J_AUTOMATION_API_KEY=your_qtm4j_automation_key \
QTM4J_BASE_URL=https://qtmcloud.qmetry.com \
SWAGGER_FUNCTIONAL_TESTING_API_TOKEN=your_functional_testing_token \
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

### Swagger Contract Testing (PactFlow)

-   "List all the provider states for the current provider"
-   "Generate Pact tests from this OpenAPI spec: [spec link]"
-   "Review this Pact test and suggest improvements"

### QMetry Test Management

-   "Set current QMetry project for your account"
-   "Get QMetry releases and cycles from your account"
-   "List all QMetry Test Cases for your account"
-   "Get execution records for a specific test case by ID"
-   "Get executions for a given test suite in QMetry"

### Zephyr Test Management

-   "List all projects where Zephyr is enabled"
-   "Get Zephyr test cases from the project with key TEST"
-   "Get the last executions from the Zephyr Test Cycle TEST-R1"

### QTM4J Test Management

-   "Set up the SCRUM project context in QTM4J"
-   "Search for all high-priority test cases in the active project"
-   "Create a new test case for the login functionality with High priority"
-   "Find test case SCRUM-TC-145 and show its details"
-   "Update the status of SCRUM-TC-145 to Done"
-   "Add the Release_2 label to SCRUM-TC-145 and remove Release_1"
-   "Show me the test steps for SCRUM-TC-32"
-   "Create a test cycle called 'Regression Suite' with High priority"
-   "Find all in-progress test cycles in the active project"
-   "Update the status of SCRUM-TR-101 to In Progress"
-   "Upload JUnit test results to QTM4J"
-   "Check whether last automation import succeeded"
-   "Start a new execution for SCRUM-TC-42 in test cycle SCRUM-TR-101"
-   "Update execution and step details for SCRUM-TC-42 in SCRUM-TR-101"
-   "Link and retrieve Jira bugs at test case and step executions for SCRUM-TC-42 in SCRUM-TR-101"
