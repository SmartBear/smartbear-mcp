![reflect.png](./images/embedded/reflect.png)

The Reflect client provides test management, execution, and test authoring capabilities as listed below. Tools for Reflect require an `REFLECT_API_TOKEN`.

## Available Tools

### Test Suite Management

#### `list_reflect_suites`

- Purpose: List all Reflect test suites for your account.
- Returns: Complete list of test suites available within your account.
- Use case: Discovery of available test suites.

#### `list_reflect_suite_executions`

- Purpose: List all executions for a given Reflect suite.
- Parameters: Test Suite identifier (`suiteId`).
- Returns: Complete list of executions for a given suite.
- Use case: Understand the latest executions and timings.

#### `reflect_suite_execution_status`

- Purpose: Get the status of a Reflect suite execution.
- Parameters: Test Suite identifier (`suiteId`), Execution identifier (`executionId`).
- Returns: Status of a given execution.
- Use case: Understand the health status of a given suite execution.

#### `reflect_suite_execution`

- Purpose: Execute a test suite.
- Parameters: Test Suite identifier (`suiteId`).
- Returns: Execution results.
- Use case: Test expected functionality by running a test suite.

#### `cancel_reflect_suite_execution`

- Purpose: Cancel the execution of a test suite.
- Parameters: Test Suite identifier (`suiteId`), Execution identifier (`executionId`).
- Returns: Info on cancellation.
- Use case: Stop a long-running or accidental suite execution.

---

### Test Management

#### `list_reflect_tests`

- Purpose: Lists all Reflect tests.
- Returns: Complete list of tests in your account.
- Use case: Discover and understand available tests.

#### `run_reflect_test`

- Purpose: Runs a Reflect test.
- Parameters: Test identifier (`testId`).
- Returns: Result of test run.
- Use case: Test expected functionality by running a test.

#### `reflect_test_status`

- Purpose: Get the status of a Reflect test execution.
- Parameters: Test identifier (`testId`).
- Returns: Status of a test.
- Use case: Understand the health status of a given test.

---

### Test Authoring & Agent Interaction

#### `list_segments`

- Purpose: List reusable test step segments available in the account.
- Returns: List of segments along with relevant metadata.
- Use case: Discover reusable steps that can help accomplish a task more efficiently.

#### `connect_to_session`

- Purpose: Establish a WebSocket connection to a live Reflect test recording session.
- Parameters: sessionID (alpha-numeric string from the live session URL)
- Returns: Connection to an active session.
- Use case: Enable real-time interaction while authoring or recording a test.

#### `add_prompt_step`

- Purpose: Add a natural language instruction as a test step.
- Parameters: Natural language instruction.
- Returns: Result of step creation.
- Use case: Add actions, assertions, or queries using natural language.

#### `add_segment`

- Purpose: Add an existing reusable segment to the current test.
- Parameters: Segment identifier.
- Returns: Result of segment insertion.
- Use case: Reuse predefined steps to accelerate test creation.

#### `delete_previous_step`

- Purpose: Undo the most recently added step or segment.
- Returns: Result of deletion.
- Use case: Recover from incorrect or failed steps during test creation.

#### `get_screenshot`

- Purpose: Capture the current state of the application under test.
- Returns: Screenshot of the browser (Web) or device (Mobile).
- Use case: Analyze UI state and inform next actions during test execution or authoring.

---

## Additional Notes

- The Reflect client now includes enhanced guidance for agents on how to construct effective tests.
- A specialized `reflect-sap-test` skill is available to provide additional instructions when creating tests for SAP applications.
