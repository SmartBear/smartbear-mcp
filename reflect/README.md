# Reflect

## Environment Variables

- `REFLECT_API_TOKEN`: Required. The Reflect Account API Key.
- `MCP_SERVER_INSIGHT_HUB_API_KEY`: Optional. If set, enables error reporting of the _MCP_server_ code via the BugSnag SDK. This is useful for debugging and monitoring of the MCP server itself and shouldn't be set to the same API key as your app.

## Tools

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