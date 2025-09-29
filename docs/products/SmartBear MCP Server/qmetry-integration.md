![qmetry.png](./images/embedded/qmetry.png)

The QMetry client provides the following test management capabilities as listed below. Tools for QMetry require a `QMETRY_API_TOKEN`.

## Available Tools

### `set_qmetry_project`

-   Purpose: Set current QMetry project for your account.
-   Returns: Set and fetch list of project information available within your account.
-   Use case: Sets your project context for all subsequent operations.

### `get_qmetry_project`

-   Purpose: Fetch current QMetry project for your account.
-   Returns: Complete list of project information available within your account.
-   Use case: Retrieve available current project details.

### `list_qmetry_testcases`

-   Purpose: List all QMetry Test Cases for your account.
-   Parameters: Test Case required parameters (`viewId`, `folderPath`).
-   Returns: Complete list of Test Cases available within your account.
-   Use case: Retrieve available Test Cases.

### `qmetry_testcase_details`

-   Purpose: Get the QMetry Test Case details.
-   Parameters: Test Case identifier (`tcID`).
-   Returns: Complete details for given Test Case.
-   Use case: Retrieve Test Case details.

### `qmetry_testcase_details_by_version`

-   Purpose: Get the QMetry Test Case detail for specific version.
-   Parameters: Test Case identifier (`id`), Version identifier (`version`).
-   Returns: Complete details for given Test Case version.
-   Use case: Retrieve Test Case details for a specific version.

### `qmetry_testcase_steps`

-   Purpose: Get the QMetry Test Case steps.
-   Parameters: Test Case identifier (`id`).
-   Returns: Complete Test Case Steps Details for given Test Case.
-   Use case: Retrieve Test Case steps.
