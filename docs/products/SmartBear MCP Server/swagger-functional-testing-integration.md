![swagger-functional-testing.svg](./images/embedded/swagger-functional-testing.svg)

The Swagger Functional Testing client provides tools for discovering and executing API tests and test suites. Tools for Swagger Functional Testing require a `SWAGGER_FUNCTIONAL_TESTING_API_TOKEN`.

## Available Tools

### Test Discovery

#### `list_tests`

- Purpose: Lists all API tests available in your Swagger Functional Testing account. Use this tool when you need to discover available tests. Do not use this tool to retrieve test execution results or history.
- Returns: Complete list of tests with their identifiers and names.
- Use case: Discover available tests.

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

---

### Suite Execution

#### `run_suite`

- Purpose: Runs a specific test suite in your Swagger Functional Testing workspace. Use this tool when you need to verify expected API functionality by executing all tests in a suite. Requires a `suiteId`. Optionally accepts a `tunnelAgentName` to override the suite's saved tunnel for this run; when omitted, the suite's saved overrides are used (falling back to each test's saved tunnel).
- Returns: Execution details including an `executionId` that can be used to poll the run result.
- Use case: Trigger a suite run that exercises every test it contains.

#### `get_suite_status`

- Purpose: Retrieves the status and per-test result of triggered suite execution. Requires both the `suiteId` and the `executionId` returned by `run_suite`.
- Returns: Overall suite execution status (pending, canceled, passed, or failed), whether the run is finished, and a per-test breakdown with pass/fail.
- Use case: Poll for the outcome of a suite run after calling `run_suite`.

---

## Additional Notes

- The `SWAGGER_FUNCTIONAL_TESTING_API_TOKEN` environment variable is required to authenticate with the Swagger Functional Testing API.
- The optional `SWAGGER_FUNCTIONAL_TESTING_BASE_PATH` environment variable allows to override the Swagger Functional Testing API base URL. Defaults to `https://api.reflect.run/v1`
