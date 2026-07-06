![swagger-functional-testing.svg](./images/embedded/swagger-functional-testing.svg)

The Swagger Functional Testing client provides tools for discovering and executing API tests. Tools for Swagger Functional Testing require a `SWAGGER_FUNCTIONAL_TESTING_API_TOKEN`.

## Available Tools

### Test Discovery

#### `list_tests`

- Purpose: Lists all API tests available in your Swagger Functional Testing account. Use this tool when you need to discover available tests. Do not use this tool to retrieve test execution results or history.
- Returns: Complete list of tests with their identifiers and names.
- Use case: Discover available tests.

#### `list_suites`

- Purpose: Lists all test Suites available in your Swagger Functional Testing workspace. Use this tool when you need to discover available Suites before running them or checking their execution history. Do not use this tool to retrieve individual tests or test Suite execution results.
- Returns: An object with a `suites` array of the test Suites in the workspace, alongside aggregate `stats`. When no Suites exist, the `suites` array is empty (`{ "suites": [] }`).
- Use case: Discover available test Suites.

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

#### `list_suite_executions`

- Purpose: Lists all executions for a given test suite in your Swagger Functional Testing workspace. Use this tool when you need to review execution history and timings for a specific suite. Do not use this tool to retrieve the status of a single execution or individual test results. Requires a `suiteId`.
- Returns: Complete list of executions for the given suite. An empty list is returned when no executions exist.
- Use case: Review the execution history and timings of a test suite.

---

## Additional Notes

- The `SWAGGER_FUNCTIONAL_TESTING_API_TOKEN` environment variable is required to authenticate with the Swagger Functional Testing API.
- The optional `SWAGGER_FUNCTIONAL_TESTING_BASE_PATH` environment variable allows to override the Swagger Functional Testing API base URL. Defaults to `https://api.reflect.run/v1`
