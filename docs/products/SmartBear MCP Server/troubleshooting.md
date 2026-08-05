# Troubleshooting

## Common issues

### Authentication Failures

- Verify your auth tokens are valid.
- Check that environment variables are properly set and match the expected names:
  - `BEARQ_API_TOKEN` for BearQ
  - `BUGSNAG_AUTH_TOKEN` for BugSnag
  - `REFLECT_API_TOKEN` for Reflect
  - `SWAGGER_API_KEY` for Swagger
  - `QMETRY_API_KEY` for QMetry
  - `ZEPHYR_API_TOKEN` for Zephyr
  - `QTM4J_API_KEY` for QTM4J
- Ensure you have the correct token type (Auth Token vs API Key) for each desired service.

### Build and Installation Problems

- Ensure Node.js is installed and compatible (check requirements in package.json).
- Verify that `npm run build` completed successfully and created the `dist/index.js` file.
- Check that the path to `dist/index.js` is correct in your MCP client configuration.

### Connection Problems

- Confirm the MCP server builds and runs locally using the MCP Inspector.
- Check your MCP client configuration syntax and file paths.
- Verify that the `dist/index.js` file exists and is executable.

### Npx cache issues for local MCP server

Github issue link - [4108](https://github.com/npm/cli/issues/4108).

There can be issues when `npx` can cache some of the dependencies and this can result in your MCP server not running correctly. To fix this you will have to clear your local `npx` cache.

On Unix and Unix-Like systems (macOS and Linux):

```bash
rm -rvf "${NPM_CONFIG_CACHE:-$HOME/.npm}/_npx"
```

On Windows:

```pwsh
Remove-Item -Path $(if ($env:NPM_CONFIG_CACHE) { "$env:NPM_CONFIG_CACHE\_npx" } else { "$env:APPDATA\npm-cache\_npx" }) -Recurse -Force -Verbose
```

After doing the above you can reinstall the MCP server.

### VS Code OAuth Authentication Error

If you encounter the following error when signing in via VS Code:

```
An error occurred while signing in:
Unknown or expired client_id; re-register via dynamic client registration
```

This means VS Code's cached OAuth dynamic client registration has expired or become invalid. To fix this:

1. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`).
2. Run the command: **`Authentication: Remove Dynamic Authentication Providers`**.
3. Remove the problematic authentication provider from the list.
4. Restart VS Code and sign in again.

For more details, see [VS Code issue #250960](https://github.com/microsoft/vscode/issues/250960).

## Getting help

For additional support and troubleshooting:

- Visit the [GitHub repository](https://github.com/SmartBear/smartbear-mcp) for documentation and issues.
- Check the [MCP specification](https://modelcontextprotocol.io/) for protocol details.
- Contact SmartBear support for account-specific issues.
- Join the community discussions for tips and best practices.
