![swagger-functional-testing.svg](./images/embedded/swagger-functional-testing.svg)

The Swagger Functional Testing client provides tools for discovering and executing API tests and test Suites. Tools for Swagger Functional Testing require a `SWAGGER_FUNCTIONAL_TESTING_API_TOKEN`.

## Available Tools

All tools listed below are only available through the Local MCP Server. They are not available on the Remote MCP Server.

### Test Discovery

#### `list_tests`

- Purpose: Lists all API tests available in your Swagger Functional Testing account. Use this tool when you need to discover available tests. Do not use this tool to retrieve test execution results or history.
- Returns: Complete list of tests with their identifiers and names.
- Use case: Discover available tests.

---

### Suite Discovery

#### `list_suites`

- Purpose: Lists all test Suites available in your Swagger Functional Testing workspace. Use this tool when you need to discover available Suites before running them or checking their execution history. Do not use this tool to retrieve individual tests or test Suite execution results.
- Returns: An object with a `suites` array of the test Suites in the workspace. Each Suite includes its `slug`, which identifies it for other suite tools (e.g. `run_suite`). When no Suites exist, the `suites` array is empty (`{ "suites": [] }`).
- Use case: Discover available test Suites.

---

### Test Creation

#### `create_test`

- Purpose: Creates a new API test in your Swagger Functional Testing workspace. Use this tool when you need to create an end-to-end API test, either from an existing API spec or by directly providing the request steps (URL, HTTP method, headers, body, redirect handling). Each step can optionally define assertions for HTTP status code ranges the response must fall within and body assertions evaluated against the response body, e.g. matching, comparing, or extracting a field by path.
- Returns: The created test ID and the URL to test definition; the ID can be used with `run_test` to run it.
- Use case: Create an API test from an existing API spec or from directly supplied endpoint data, optionally with assertions to validate the response status and body.

---

### Suite Creation

#### `create_suite`

- Purpose: Creates a new test Suite in your Swagger Functional Testing workspace by grouping existing tests into ordered blocks for collective execution. Requires a `name` and one or more `runApiTests` blocks, each with a non-empty `testIds` array (from `list_tests`). Blocks always run one after another; within a block, tests run sequentially by default. Each block may optionally set:
  - `parallel` — run the block's tests in parallel instead of sequentially (default `false`)
  - `maxRetryAttempts` — retry a block's failed tests before they count as failed, 0-3 (default no retry)
  - `title` — a label that must be unique across the Suite's blocks

  Optionally accepts `agentName` to save a tunnel agent override for future runs of the Suite.
- Returns: The created Suite's `slug` and `url`.
- Use case: Group existing tests into a Suite, optionally with parallel/sequential blocks and retry behavior, for collective execution.

---

### Test Execution

#### `run_test`

- Purpose: Runs a specific API test in your Swagger Functional Testing workspace. Use this tool when you need to verify expected API functionality by executing a single test. Requires a `testId`, which can be obtained from `list_tests`.
- Returns: Execution details including an `executionId` that can be used to poll for the result.
- Use case: Trigger a test run against your API.

#### `get_test_status`

- Purpose: Retrieves the status and result of a previously triggered test execution. Use this tool to check whether a test run has completed and whether it passed or failed. Requires an `executionId` returned by `run_test`.
- Returns: Execution status and result details for the given execution.
- Use case: Poll for the outcome of a test run after calling `run_test`.

#### `get_test_history`

- Purpose: Retrieves the execution history for a given test in your Swagger Functional Testing workspace. Use this tool when you need to check past run results, identify failures, or assess test reliability over time. Do not use this tool to run a test or retrieve suite-level execution results. Requires a `testId`.
- Returns: A list of past runs, each including pass/fail status, run time, creation timestamp, and — for failed runs — a per-step breakdown of failure details.
- Use case: Review past run results and assess test reliability over time.

---

### Suite Execution

#### `run_suite`

- Purpose: Runs a specific test Suite in your Swagger Functional Testing workspace. Use this tool when you need to verify expected API functionality by executing all tests within your Suite. Requires the Suite's `slug` (from `create_suite` or `list_suites`). Optionally accepts a `tunnelAgentName` that will override any tunnels saved on each API tests within that Suite; when omitted, each test's saved tunnel is used instead.
- Returns: Run details including `executionId` and current status. That `executionId`, together with the Suite's `slug`, can be used in `get_suite_status` tool to poll the Suite run result.
- Use case: Trigger a Suite run that exercises every test it contains.

#### `get_suite_status`

- Purpose: Retrieves the status and per-test result of triggered Suite execution. Requires the `slug` of your test Suite and the `executionId` returned by `run_suite`.
- Returns: Execution details including `executionId`, overall status (pending, canceled, passed, or failed), whether run finished, and a per-test breakdown. The per-test results include status (pending, canceled, passed, or failed), runtime and number of steps.
- Use case: Poll for the outcome of a Suite run after calling `run_suite`.

#### `list_suite_executions`

- Purpose: Lists all executions for a given test Suite in your Swagger Functional Testing workspace. Use this tool when you need to review execution history and timings for a specific Suite. Do not use this tool to retrieve the status of a single execution or individual test results. Requires the Suite's `slug`.
- Returns: Complete list of executions for the given Suite. An empty list is returned when no executions exist.
- Use case: Review the execution history and timings of a test Suite.

#### `cancel_suite_execution`

- Purpose: Cancels an ongoing test Suite execution in your Swagger Functional Testing workspace. Use this tool when you need to stop a long-running or accidentally triggered Suite run. Do not use this tool to cancel individual test runs. Requires the Suite's `slug` and an `executionId`.
- Returns: Confirmation of the cancellation. The cancelled execution is persisted in run history with status `cancelled`.
- Use case: Stop a long-running or accidentally triggered Suite run.

---

## Additional Notes

- The `SWAGGER_FUNCTIONAL_TESTING_API_TOKEN` environment variable is required to authenticate with the Swagger Functional Testing API.
- The optional `SWAGGER_FUNCTIONAL_TESTING_BASE_PATH` environment variable allows to override the Swagger Functional Testing API base URL. Defaults to `https://api.reflect.run/v1`
