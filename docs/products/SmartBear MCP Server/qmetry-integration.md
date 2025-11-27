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

### `list_qmetry_project_list`

-   Purpose: Fetch QMetry projects list including projectID, name, projectKey, isArchived, viewIds and folderPath needed for other operations.
-   Returns: Complete list of project details, viewIds, folderPaths, and project configuration.
-   Use case: Retrieve all projects available in your account.

### `create_release`

-   Purpose: "Create a new release in QMetry with optional cycle for test planning and execution tracking.
-   Parameters: Release name (`name`), Cycle name (`name`) Optional, If not provided, a "Default Cycle" is created automatically.
-   Returns: JSON object containing the new release ID, releaseName, and build JSON Object.
-   Use case: Create release for better test planning.

### `create_cycle`

-   Purpose: Create a new cycle within an existing release in QMetry for test execution planning.
-   Parameters: Cycle name (`name`), Release name (`name`) or Release ID.
-   Returns: JSON object containing the new build ID, and metadata.
-   Use case: Create a new test cycle for a sprint within an existing release for planning.

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

### `linked_requirements_to_testcase`

-   Purpose: Link requirements to test case.
-   Parameters: Test case identifier (`tcID`), test case version identifier (`tcVersionId`), and requirement identifier (`rqVersionIds`).
-   Returns: Requirements linked to test case successfully.
-   Use case: Link requirements to test case.

### `fetch_test_cases_linked_to_requirement`

-   Purpose: Get test cases that are linked to a specific requirement in QMetry.
-   Parameters: Requirement numeric ID (`rqID`).
-   Returns: Complete list of test cases linked to a requirement.
-   Use case: Retrieve all test cases linked to a specific requirement.

### `fetch_requirements_linked_to_test_case`

-   Purpose: Get requirements that are linked to a specific test case in QMetry.
-   Parameters: Test Case numeric ID (`tcID`).
-   Returns: Complete list of requirements linked to a test case.
-   Use case: Retrieve all requirements linked to a specific test case.

### `create_test_case`

-   Purpose: Create a new test case in QMetry with steps, metadata, and release/cycle mapping.
-   Parameters: Test case folder ID (`tcFolderID`), test case name (`name`), optional steps array with custom fields, priority, components, owner, state, type, testing type, estimated time, description, and release/cycle mapping.
-   Returns: JSON object containing the new test case ID, summary, and creation metadata.
-   Use case: Create test cases with detailed steps and custom fields (UDFs), set priority/owner/component using valid IDs from project info, associate with release/cycle for planning, add test cases for automation or manual testing types.

### `update_test_case`

-   Purpose: Update an existing QMetry test case by test case ID.
-   Parameters: Test case ID (`tcID`), version ID (`tcVersionID`), optional fields to update including name, priority, owner, component, state, type, description, estimated time, testing type, steps array, remove steps array, and step update flag (`isStepUpdated`).
-   Returns: JSON object containing the updated test case information and metadata.
-   Use case: Update test case metadata or steps, edit/add/remove test steps with step IDs, change priority/owner/state, update only metadata without affecting steps, modify description or estimated time.

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

### `qmetry_testcase_executions`

-   Purpose: Get execution records for a specific test case by ID.
-   Parameters: Test Case identifier (`tcID`).
-   Returns: Complete list of test case executions.
-   Use case: Retrieve available test case execution records.

### `create_test_suite`

-   Purpose: Create a new test suite in QMetry with metadata and release/cycle mapping.
-   Parameters: Test suite parent folder ID (`parentFolderId`), test suite name (`name`), optional automation flag (`isAutomatedFlag`), description, owner, state, and release/cycle mapping with build ID.
-   Returns: JSON object containing the new test suite ID, summary, and creation metadata.
-   Use case: Create test suites with metadata, set owner/state using valid IDs from project info, associate with release/cycle/build for planning, create automated or manual test suites.

### `update_test_suite`

-   Purpose: Update an existing QMetry test suite by test suite ID.
-   Parameters: Test suite ID (`id`), entity key (`entityKey`), folder ID (`TsFolderID`), optional fields to update including name, description, owner, and state.
-   Returns: JSON object containing the updated test suite information and metadata.
-   Use case: Update test suite summary/name, change owner or state, modify description, bulk update using entity key auto-resolution.

### `fetch_test_suites`

-   Purpose: Fetch QMetry test suites from the current project.
-   Parameters: Test Suite view ID (`viewId`), folder path (`folderPath`).
-   Returns: Complete list of test suites available within the current project with pagination info.
-   Use case: List all test suites in a project, search for specific test suites using filters, browse test suites in specific folders.

### `link_testcases_to_testsuite`

-   Purpose: Link test cases to a test suite in QMetry.
-   Parameters: Test suite ID (`tsID`), array of test case version identifiers, flag to indicate if linking from requirements (default false).
-   Returns: JSON object with linkage status and details.
-   Use case: Link test cases to a test suite by entity keys, bulk link multiple test cases to a suite, automate test suite composition from test cases.

### `requirements_linked_testcases_to_testsuite`

-   Purpose: Link test cases (including those linked to requirements) to a test suite in QMetry.
-   Parameters: Test suite ID (`tsID`), array of test case version identifiers from requirements, flag to indicate linking from requirements (set to true).
-   Returns: JSON object with linkage status and details.
-   Use case: Link requirements-linked test cases to a test suite, bulk link multiple requirements-linked test cases, automate test suite composition from requirement-based test cases.

### `link_platforms_to_testsuite`

-   Purpose: Link one or more platforms to a QMetry test suite.
-   Parameters: Test suite ID (`qmTsId`), comma-separated platform IDs (`qmPlatformId`).
-   Returns: JSON object with linkage status, success message, and details.
-   Use case: Link single or multiple platforms to a test suite for cross-platform testing, define execution environments, organize test suites by supported platforms.

### `get_testsuites_by_testcase`

-   Purpose: Get test suites that can be linked to test cases in QMetry.
-   Parameters: Test Suite folder ID identifier (`tsFolderID`).
-   Returns: Complete list of test suites for the given test case.
-   Use case: Retrieve available test suites that can be linked to a test case.

### `get_testcases_by_testsuite`

-   Purpose: Get test cases that are linked to a specific test suite in QMetry.
-   Parameters: Test Suite identifier (`tsID`).
-   Returns: Complete list of test cases linked to the test suite with test case details and metadata.
-   Use case: Retrieve all test cases associated with a specific test suite for execution planning and management.

### `qmetry_executions_by_testsuite`

-   Purpose: Get executions for a given test suite in QMetry.
-   Parameters: Test Suite identifier (`tsID`), Test Suite folder ID (`tsFolderID`).
-   Returns: Complete list of executions for the test suite with execution details.
-   Use case: Retrieve test suite execution data.

### `get_testcase_runs_by_testsuite_run`

-   Purpose: Get test case runs under a specific test suite run execution in QMetry.
-   Parameters: Test Suite Run identifier (`test suite run ID`), Test Execution View identifier (`viewId`).
-   Returns: Complete list of test case runs with detailed execution information, status, tester details, and run metadata.
-   Use case: Retrieve individual test case execution results and status within a specific test suite run.

### `update_testcase_execution_status`

-   Purpose: Update the execution status of test cases within a specific test suite run in QMetry.
-   Parameters: Test Suite Run identifier (`qmTsRunId`), Test Case Run identifiers (`entityIDs`), Execution Status ID (`runStatusID`), Type of entity('TCR'/'TCSR') to execute (`entityType`).
-   Returns: JSON object with update status and details.
-   Use case: Update execution status for one or more test cases within a test suite run.

### `create_issue`

-   Purpose: Create a new issue in QMetry for linking to test executions.
-   Parameters: Issue name (`name`), issue type ID (`issueType`), issue priority ID (`issuePriority`), optional issue owner (`issueOwner`), description, affected release array, affected cycles array, and component array.
-   Returns: JSON object containing the new issue ID, defect ID, and creation metadata.
-   Use case: Create defects/issues with summary and metadata, set issueType/priority/owner using valid IDs from project info, associate with releases/cycles for planning, create issues for automation or manual testing types.

### `update_issue`

-   Purpose: Update an existing QMetry issue by defect ID.
-   Parameters: Defect ID (`DefectId`), optional entity key (`entityKey`), optional fields to update including summary, issue type, priority, owner, description, affected release, and affected cycles.
-   Returns: JSON object with update status and details.
-   Use case: Update issue summary/title, change issue priority/type/owner, update affected release or cycles, modify description, bulk update using DefectId and entityKey.

### `fetch_issues`

-   Purpose: Fetch QMetry issues from the current project.
-   Parameters: Issue view ID (`viewId`).
-   Returns: Complete list of issues with pagination info and issue details including priorities, status, and metadata.
-   Use case: List all issues in a project, search for specific issues using filters, get paginated issue results.

### `link_issues_to_testcase_run`

-   Purpose: Link one or more issues to a QMetry test case run (execution).
-   Parameters: Array of issue IDs (`issueIds`), test case run ID (`tcrId`).
-   Returns: JSON object with linkage status and details.
-   Use case: Link single or multiple issues to a test case run, automate defect association during test execution, maintain traceability between defects and test runs.

### `get_issues_linked_to_tc`

-   Purpose: Get issues that are linked to a specific test case in QMetry.
-   Parameters: Test Case identifier (`tcID`).
-   Returns: Complete list of issues linked to the test case with issue details, priorities, and status information.
-   Use case: Retrieve defects and issues associated with a specific test case for traceability and defect tracking.

### `get_linked_issues_by_testcase_run`

-   Purpose: Get issues that are linked to a specific test case run in QMetry.
-   Parameters: Test Case Run identifier (`entityId`).
-   Returns: Complete list of issues linked to the test case run with issue details, priorities, status, owner information, and linkage metadata.
-   Use case: Retrieve issues associated with specific test case executions for defect tracking, traceability analysis, and test execution quality monitoring.

### `import_automation_test_results`

-   Purpose: Import/Publish automation test results from TestNG, JUnit, Cucumber, Robot, HPUFT, or QAF frameworks into QMetry.
-   Parameters: file(Supported file formats: .json, .xml and .zip), entityType ( Supported values: TESTNG, CUCUMBER, JUNIT, HPUFT, QAF, ROBOT).
-   Returns: JSON object with requestId, status and additional metadata.
-   Use case: Import results from automated test executions for reporting and analysis.

### `get_automation_status`

-   Purpose: Get the status of an automation import job by request ID.
-   Parameters: Request identifier (`requestId`).
-   Returns: JSON object containing the automation status details (e.g., PASS, FAIL, IN_PROGRESS, etc.).
-   Use case: Check and track the processing status of a specific automation results import job.
