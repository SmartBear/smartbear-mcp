# SmartBear plugin for Claude

![SmartBear](icon.png)

This plugin connects Claude to SmartBear products through the [SmartBear MCP server](https://github.com/SmartBear/smartbear-mcp). It gives Claude tools for BearQ, BugSnag, Collaborator, PactFlow, QMetry, QTM4J (QMetry Test Management for Jira), Reflect, Swagger (Portal, Studio and Functional Testing) and Zephyr.

Full product documentation: https://developer.smartbear.com/smartbear-mcp

## Configuration

When you enable the plugin, Claude asks for the settings of each product you use. Every setting is optional: a product's tools only appear once you supply its token or base URL, so fill in just the products you need. Tokens, API keys, passwords and login tickets are marked sensitive, so they are masked when you type them and kept in your system's secure credential store rather than in a settings file.

| Product | Settings |
| --- | --- |
| [BearQ](https://developer.smartbear.com/smartbear-mcp/docs/bearq-integration) | API token, API base URL |
| [BugSnag](https://developer.smartbear.com/smartbear-mcp/docs/bugsnag-integration) | Auth token, project API key, endpoint |
| [Collaborator](https://developer.smartbear.com/smartbear-mcp/docs/collaborator-integration) | Base URL, username, login ticket |
| [PactFlow / Pact Broker](https://developer.smartbear.com/smartbear-mcp/docs/contract-testing-with-pactflow) | Base URL, token, or username and password |
| [QMetry](https://developer.smartbear.com/smartbear-mcp/docs/qmetry-integration) | API key, base URL |
| [QTM4J](https://developer.smartbear.com/smartbear-mcp/docs/qtm4j-integration) | API key, automation API key, base URL |
| [Reflect](https://developer.smartbear.com/smartbear-mcp/docs/reflect-integration) | API token |
| [Swagger](https://developer.smartbear.com/smartbear-mcp/docs/swagger-portal-integration) | API key, Portal, Registry and UI base paths |
| [Swagger Functional Testing](https://developer.smartbear.com/smartbear-mcp/docs/swagger-functional-testing-integration) | API token, base path |
| [Zephyr](https://developer.smartbear.com/smartbear-mcp/docs/zephyr-integration) | API token, base URL |

In Claude Code you can change these settings later with `/plugin configure smartbear`.

## What the plugin runs and where data goes

- **What runs:** a local MCP server, started with `npx` from the public npm package `@smartbear/mcp`, pinned to the exact version in this plugin's `.mcp.json`. Node.js 22 or later must be installed. npm downloads the package and its dependencies from the public npm registry the first time the server starts.
- **What it connects to:** only the SmartBear product APIs you configure, at their default endpoints or at the base URLs you enter. Each request uses the credentials you entered for that product.
- **Telemetry:** the plugin doesn't turn on any usage analytics or error reporting. The server sends neither unless its own analytics or error-reporting keys are set, and this plugin doesn't set them.

The server's source code is public at https://github.com/SmartBear/smartbear-mcp.

## Support

Report issues at https://github.com/SmartBear/smartbear-mcp/issues or contact SmartBear support at https://support.smartbear.com/.

## License

MIT. See [LICENSE.txt](https://github.com/SmartBear/smartbear-mcp/blob/main/LICENSE.txt).
