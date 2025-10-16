![qmetry.png](./images/embedded/qmetry.png)

The QMetry client provides the following test management capabilities as listed below. Tools for QMetry require a `QMETRY_API_KEY`.

## Available Tools

### `set_qmetry_project`

-   Purpose: Set current QMetry project for your account.
-   Returns: Set and fetch list of project information available within your account.
-   Use case: Sets your project context for all subsequent operations.

### `get_qmetry_project`

-   Purpose: Fetch the current QMetry project for your account.
-   Returns: Complete list of project information available within your account.
-   Use case: Retrieve current project details.

### `get_qmetry_releases_cycles`

-   Purpose: Fetch QMetry releases and cycles from your account.
-   Returns: Project hierarchy containing releases and their associated cycles.
-   Use case: Retrieve all releases and cycles.

### `get_qmetry_builds`

-   Purpose: Fetch QMetry builds from the current project.
-   Returns: List of available builds with pagination metadata.
-   Use case: Retrieve all builds.

### `get_qmetry_platforms`

-   Purpose: Fetch QMetry platforms from the current project.
-   Returns: List of available platforms for cross-platform testing.
-   Use case: Retrieve all platforms.

### `list_qmetry_requirements`

-   Purpose: Fetch QMetry requirements from the current project.
-   Parameters: Requirement required parameters (`viewId`, `folderPath`).
-   Returns: Complete list of requirements available within your current project.
-   Use case: Retrieve available requirements.

### `qmetry_requirement_details`

-   Purpose: Get the QMetry requirement details.
-   Parameters: Requirement identifier (`id`), Version identifier (`version`).
-   Returns: Complete details for the given requirement.
-   Use case: Retrieve requirement details.

### `qmetry_testcases_linked_to_requirement`

-   Purpose: Get test cases that are linked to a specific requirement.
-   Parameters: Requirement identifier (`rqID`).
-   Returns: Complete list of test cases linked to a requirement.
-   Use case: Retrieve available test cases linked to a requirement.

### `list_qmetry_testcases`

-   Purpose: List all QMetry test cases from the current project.
-   Parameters: Test Case required parameters (`viewId`, `folderPath`).
-   Returns: Complete list of test cases available within the current project.
-   Use case: Retrieve available test cases.

### `qmetry_testcase_details`

-   Purpose: Get the QMetry test case details.
-   Parameters: Test Case identifier (`tcID`).
-   Returns: Complete details for given test case.
-   Use case: Retrieve test case details.

### `qmetry_testcase_details_by_version`

-   Purpose: Get the QMetry test case detail for specific version.
-   Parameters: Test Case identifier (`id`), Version identifier (`version`).
-   Returns: Complete details for given test case version.
-   Use case: Retrieve test case details for a specific version.

### `qmetry_testcase_steps`

-   Purpose: Get the QMetry test case steps.
-   Parameters: Test Case identifier (`id`).
-   Returns: Complete test case steps details for given test case.
-   Use case: Retrieve test case steps.

### `qmetry_requirements_linked_to_testcase`

-   Purpose: Get requirements that are linked to a specific test case.
-   Parameters: Test Case identifier (`tcID`).
-   Returns: Complete list of requirements linked to a test case.
-   Use case: Retrieve available requirements linked to a test case.

### `qmetry_testcase_executions`

-   Purpose: Get execution records for a specific test case by ID.
-   Parameters: Test Case identifier (`tcID`).
-   Returns: Complete list of test case executions.
-   Use case: Retrieve available test case execution records.

### `qmetry_testsuites_for_testcase`

-   Purpose: Get test suites that can be linked to test cases in QMetry.
-   Parameters: Test Suite folder ID identifier (`tsFolderID`).
-   Returns: Complete list of test suites for the given test case.
-   Use case: Retrieve available test suites that can be linked to a test case.

### `qmetry_executions_by_testsuite`

-   Purpose: Get executions for a given test suite in QMetry.
-   Parameters: Test Suite identifier (`tsID`), Test Suite folder ID (`tsFolderID`).
-   Returns: Complete list of executions for the test suite with execution details.
-   Use case: Retrieve test suite execution data.
