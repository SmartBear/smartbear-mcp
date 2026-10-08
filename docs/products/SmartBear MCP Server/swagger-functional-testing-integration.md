![swagger-functional-testing.svg](./images/embedded/swagger-functional-testing.svg)

The Swagger Functional Testing client provides tools for discovering, creating, and executing API tests and test Suites. Tools for Swagger Functional Testing require a `SWAGGER_FUNCTIONAL_TESTING_API_TOKEN`.

## Available Tools

All tools listed below are only available through the Local MCP Server. They are not available on the Remote MCP Server.

---

## Tests

### `swagger_list_tests`

- **Purpose:** Lists all API tests available in your Swagger Functional Testing account. Use this tool to discover available tests before running them or checking their status. Do not use this tool to retrieve test execution results or history.
- **Returns:** A list of tests with their IDs and names. When no tests exist, the list is empty. Test IDs can be passed to `swagger_run_test` or used to build a Suite via `swagger_create_suite`.
- **Use case:** Discover available tests.

---

### `swagger_create_test`

- **Purpose:** Creates a new API test in your Swagger Functional Testing workspace. Use this tool to create an end-to-end API test, either from an existing API spec or by directly providing the request steps. Each step requires a URL and may specify:
  - HTTP method (defaults to `GET`)
  - Request body and headers
  - Whether to follow redirects
  - **Assertions:** expected HTTP status code ranges, and body assertions evaluated against the response body (exact match, or field-level rules matched by path using operators: `eq`, `lt`, `gt`, `lte`, `gte`, `contains`)

  Every step must set `baseUrl` to the endpoint's server/common URL (extracted into a shared parameter), and should set `apiName` to the name of the API it belongs to. A step's URL may include OAS-style `{pathParam}` placeholders — if the same placeholder appears in more than one step, it must be defined in the top-level `parameters` array so its value is shared. The top-level `parameters` array only accepts path and base-URL parameters, not request body parameters.
- **Returns:** The created test `id` and a `url` to the test definition. The `id` can be passed to `swagger_run_test` to execute it, or included in a Suite via `swagger_create_suite`.
- **Use case:** Create an API test with request steps, optional response assertions, and shared path/base-URL parameters.

---

### `swagger_run_test`

- **Purpose:** Runs a specific API test in your Swagger Functional Testing workspace. Execution is **asynchronous** — the tool returns an `executionId`, not the result directly. Use `swagger_get_test_status` with that `executionId` to poll for progress and retrieve the final result. Requires a `testId`, which can be obtained from `swagger_list_tests`.
- **Returns:** Run details including an `executionId` used to poll for the result.
- **Use case:** Trigger a test run against your API.

---

### `swagger_get_test_status`

- **Purpose:** Retrieves the status and result of a previously triggered test execution. Use this tool to check whether a test run has completed and whether it passed or failed. Requires an `executionId` returned by `swagger_run_test`. Poll until status is `passed` or `failed`; a status of `running` means the execution is still in progress.
- **Returns:** Execution status (`running`, `passed`, or `failed`), run time, and a per-step breakdown of results.
- **Use case:** Poll for the outcome of a test run after calling `swagger_run_test`.

---

### `swagger_get_test_history`

- **Purpose:** Retrieves the execution history for a given test in your Swagger Functional Testing workspace. Use this tool to check past run results, identify failures, or assess test reliability over time. Do not use this tool to run a test or retrieve suite-level execution results. Requires a `testId`. Supports pagination via `limit` (1–100, default 25) and `offset` (default 0).
- **Returns:** Total run count and a list of past runs, each including pass/fail status, run time, creation timestamp, and — for failed runs — a per-step breakdown of failure details.
- **Use case:** Review past run results and assess test reliability over time.

---

## Suites

### `swagger_list_suites`

- **Purpose:** Lists all test Suites available in your Swagger Functional Testing workspace. Use this tool to discover available Suites before running them or checking their execution history. Do not use this tool to retrieve individual tests or Suite execution results.
- **Returns:** An object with a `suites` array. Each Suite includes its `slug`, which identifies it for other Suite tools (e.g. `swagger_run_suite`). When no Suites exist, the `suites` array is empty (`{ "suites": [] }`).
- **Use case:** Discover available test Suites.

---

### `swagger_create_suite`

- **Purpose:** Creates a new test Suite in your Swagger Functional Testing workspace by grouping existing tests into ordered blocks for collective execution. Requires a `name` and one or more `runApiTests` blocks, each with a non-empty `testIds` array (from `swagger_list_tests`). Blocks always run one after another; within a block, tests run sequentially by default. Each block may optionally set:
  - `parallel` — run the block's tests in parallel instead of sequentially (default `false`)
  - `maxRetryAttempts` — retry a block's failed tests before they count as failed, 0–3 (default: no retry)
  - `title` — a label that must be unique across the Suite's blocks

  Optionally accepts `agentName` to save a tunnel agent override for future runs of the Suite.
- **Returns:** The created Suite's `slug` and `url`. The `slug` identifies the Suite for other Suite tools (e.g. `swagger_run_suite`).
- **Use case:** Group existing tests into a Suite, optionally with parallel/sequential blocks and retry behavior, for collective execution.

---

### `swagger_run_suite`

- **Purpose:** Runs a specific test Suite in your Swagger Functional Testing workspace. Execution is **asynchronous** — the tool returns an `executionId`, not results directly. Use `swagger_get_suite_status` with the Suite's `slug` and the `executionId` to poll for progress and retrieve per-test results. Requires the Suite's `slug` (from `swagger_create_suite` or `swagger_list_suites`). Optionally accepts `tunnelAgentName` to override the Suite's saved tunnel for this run; when omitted, the Suite's saved tunnel is used. Do not use this tool to run a single test — use `swagger_run_test` instead.
- **Returns:** Run details including `executionId` and current status. Use both `slug` and `executionId` with `swagger_get_suite_status` to poll the result.
- **Use case:** Trigger a Suite run that exercises every test it contains.

---

### `swagger_get_suite_status`

- **Purpose:** Retrieves the status and per-test result of a triggered Suite execution. Requires the `slug` of your test Suite and the `executionId` returned by `swagger_run_suite`. `pending` means the execution has not started yet. Poll until `finished` is `true`.
- **Returns:** Execution details including `executionId`, overall status (`pending`, `canceled`, `passed`, or `failed`), whether the run is finished, and a per-test breakdown with status, runtime, and number of steps.
- **Use case:** Poll for the outcome of a Suite run after calling `swagger_run_suite`.

---

### `swagger_list_suite_executions`

- **Purpose:** Lists all executions for a given test Suite in your Swagger Functional Testing workspace. Use this tool to review execution history and timings for a specific Suite. Do not use this tool to retrieve the status of a single execution or individual test results. Requires the Suite's `slug`.
- **Returns:** Complete list of executions for the given Suite. An empty list is returned when no executions exist.
- **Use case:** Review the execution history and timings of a test Suite.

---

### `swagger_cancel_suite_execution`

- **Purpose:** Cancels an ongoing test Suite execution in your Swagger Functional Testing workspace. Use this tool to stop a long-running or accidentally triggered Suite run. The canceled execution is preserved in run history with status `canceled`. Do not use this tool to cancel individual test runs. Requires the Suite's `slug` and an `executionId`.
- **Returns:** Confirmation of the cancellation with the updated execution record.
- **Use case:** Stop a long-running or accidentally triggered Suite run.

---

## Additional Notes

- The `SWAGGER_FUNCTIONAL_TESTING_API_TOKEN` environment variable is required to authenticate with the Swagger Functional Testing API.
- The optional `SWAGGER_FUNCTIONAL_TESTING_BASE_PATH` environment variable allows overriding the Swagger Functional Testing API base URL. Defaults to `https://api.reflect.run/v1`.
