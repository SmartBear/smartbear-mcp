![test-hub.png](./images/embedded/test-hub.png)

The Test Hub client provides test management and execution capabilities as listed below. Tools for Test Hub require an `REFLECT_API_TOKEN`.

## Available Tools

### `list_reflect_suites`

-   Purpose: List all Reflect test suites for your account.
-   Returns: Complete list of test suites available within your account.
-   Use case: Discovery of available test suites.

### `list_reflect_suite_executions`

-   Purpose: List all executions for a given Reflect suite.
-   Parameters: Test Suite identifier (`suiteId`).
-   Returns: Complete list executions for a given suite.
-   Use case: Understand the latest executions and timings.

### `reflect_suite_execution_status`

-   Purpose: Get the status of a Reflect suite execution.
-   Parameters: Test Suite identifier (`suiteId`), Execution identifier (`executionId`).
-   Returns: Status of a given execution.
-   Use case: Understand the health status of a given suite execution.

### `reflect_suite_execution`

-   Purpose: Execute a test suite.
-   Parameters: Test Suite identifier (`suiteId`).
-   Returns: Execution results.
-   Use case: Test expected functionality by running a test suite.

### `cancel_reflect_suite_execution`

-   Purpose: Cancel the execution of a test suite.
-   Parameters: Test Suite identifier (`suiteId`), Execution identifier (`executionId`).
-   Returns: Info on cancellation.
-   Use case: Stop a long running or accidental suite execution.

### `list_reflect_tests`

-   Purpose: Lists all Reflect tests.
-   Returns: Complete list of tests in your account.
-   Use case: Discover and understand available tests.

### `run_reflect_test`

-   Purpose: Runs a Reflect test.
-   Parameters: Test identifier (`testId`)
-   Returns: Result of test run.
-   Use case: Test expected functionality by running a test.

### `reflect_test_status`

-   Purpose: Get the status of a Reflect test execution.
-   Parameters: Test identifier (`testId`)
-   Returns: Status of a test.
-   Use case: Understand the health status of a given test.