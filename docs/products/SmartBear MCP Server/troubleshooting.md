## Common issues

### Authentication Failures

-   Verify your auth tokens are valid.
-   Check that environment variables are properly set and match the expected names:
    -   `BUGSNAG_AUTH_TOKEN` for BugSnag
    -   `REFLECT_API_TOKEN` for Reflect
    -   `API_HUB_API_KEY` for API Hub
-   Ensure you have the correct token type (Auth Token vs API Key) for each service.

### Build and Installation Problems

-   Ensure Node.js is installed and compatible (check requirements in package.json).
-   Verify that `npm run build` completed successfully and created the `dist/index.js` file.
-   Check that the path to `dist/index.js` is correct in your MCP client configuration.

### Connection Problems

-   Confirm the MCP server builds and runs locally using the MCP Inspector.
-   Check your MCP client configuration syntax and file paths.
-   Verify that the `dist/index.js` file exists and is executable.

## Getting help

For additional support and troubleshooting:

-   Visit the [GitHub repository](https://github.com/SmartBear/smartbear-mcp) for documentation and issues.
-   Check the [MCP specification](https://modelcontextprotocol.io/) for protocol details.
-   Contact SmartBear support for account-specific issues.
-   Join the community discussions for tips and best practices.
