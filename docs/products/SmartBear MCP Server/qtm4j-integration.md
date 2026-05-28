![qtm4j.svg](./images/embedded/qtm4j.svg)

The QTM4J client enables AI assistants to interact with QTM4J through available MCP tools for managing test assets, executions, cycles, automation workflows, and more.

# Setup

## Environment Variables

The following environment variables configure the QTM4J integration:

- `QTM4J_API_KEY` **required**: The QMetry Test Management for Jira API key for authentication. Generate your API key from your QTM4J instance — refer to the [QMetry Open API setup guide](https://support.smartbear.com/qmetry-test-management-for-jira-cloud/docs/en/user-guide/qmetry-open-api.html) for step-by-step instructions.
  - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

- `QTM4J_BASE_URL` (optional): The QTM4J base URL. Set based on your region.
  - US region (default): `https://qtmcloud.qmetry.com`
  - Australia region: `https://syd-qtmcloud.qmetry.com`

- `QTM4J_AUTOMATION_API_KEY` (required for automation tools): A separate API key used exclusively by the automation import tools (`qtm4j_upload_automation_result` and `qtm4j_get_automation_history`). Generate your Automation API key from your QTM4J instance — refer to the [QMetry automation help documentation](https://support.smartbear.com/qmetry-test-management-for-jira-cloud/docs/en/automation/generate-api-key.html) for setup instructions.

## Prerequisites

**Most tools require an active project context.** Call `qtm4j_set_project_context` to set the active project before performing any project-specific operation. Automation tools (`qtm4j_upload_automation_result` and `qtm4j_get_automation_history`) are the exception — they work independently without any project context.

# Available Tools

## Project Context

### Set Project Context

- **Purpose**: Set the active QTM4J project for the current session. Must be called before any project-specific operation.
- **Parameters**:
  - Project key or name to activate (`projectKey`)
- **Returns**: Details of the active project, including the project ID, key, name, and other relevant information.
- **Use case**: Initializing the project context before create, search, update, or other operations.
## Projects

### Retrieval Operations

#### Get Projects

- **Purpose**: Retrieve all QTM4J projects available in your account with optional text filtering.
- **Parameters**:
  - optional text to filter by project key or name (`searchText`)
  - optional flag to filter by QMetry-enabled projects (`qmetryEnabled`)
  - optional starting position for pagination (`startAt`)
  - optional max results to return (`maxResults`)
- **Returns**: A paginated list of projects with their properties including project ID, key, name, and QMetry-enabled status.
- **Use case**: Discovering available projects and their keys before setting the project context.

## Test Cases

### Retrieval Operations

#### Search Test Cases

- **Purpose**: Search and filter test cases within the active QTM4J project using a rich set of criteria.
- **Parameters**:
  - optional filter object (`filter`) containing:
    - free-text search across summary and description (`searchText`) — use this to find a test case by its key (e.g., `SCRUM-TC-145`)
    - status names to include (`status`) — e.g., `["Done", "In Progress"]`
    - priority names to include (`priority`) — e.g., `["High", "Medium"]`
    - label names to include (`labels`) — e.g., `["Release_1", "Sprint 1"]`
    - component names to include (`components`) — e.g., `["UI", "Cloud"]`
    - folder IDs to filter by (`folders`)
    - assignee Jira account IDs (`assignee`)
    - reporter Jira account IDs (`reporter`)
    - automation status (`isAutomated`)
    - creation date range (`createdOnFrom`, `createdOnTo`) — format: `dd/MMM/yyyy`
    - update date range (`updatedOnFrom`, `updatedOnTo`) — format: `dd/MMM/yyyy`
    - execution date range (`executedOnFrom`, `executedOnTo`) — format: `dd/MMM/yyyy`
    - fix version IDs (`fixVersions`)
    - sprint IDs (`sprint`)
    - AI-generated flag (`aiGenerated`)
  - optional fields to include in each result (`fields`) — omit to return all fields
  - optional sort pattern (`sort`) — format: `fieldName:asc|desc`, e.g., `priority:asc,created:desc`
  - optional starting position for pagination (`startAt`)
  - optional max results per page (`maxResults`) — max 50
- **Returns**: A paginated result with `total`, `startAt`, `maxResults`, and `data` array of test case objects.
- **Use case**: Finding test cases by status, priority, labels, or free-text; retrieving test case details by key; paginating through large result sets; generating test reports.
- **Note**: Multiple values within a filter field use OR logic; different filter fields are combined with AND.

#### Get Test Steps

- **Purpose**: Retrieve the test steps for a specific test case by its human-readable key.
- **Parameters**:
  - Test case key in `{PROJECT_KEY}-TC-{number}` format (`key`) — e.g., `SCRUM-TC-145`
  - optional version number to retrieve (`versionNo`) — defaults to the latest version
  - optional filter criteria (`filter`)
  - optional sort pattern (`sort`)
  - optional starting position for pagination (`startAt`)
  - optional max results to return (`maxResults`)
- **Returns**: A paginated list of test steps with their properties including description, expected result, and test data.
- **Use case**: Reviewing the step-by-step instructions of an existing test case.

### Creation Operations

#### Create Test Case

- **Purpose**: Create a new test case in the active QTM4J project.
- **Parameters**:
  - Test case summary/title (`summary`)
  - optional description (`description`)
  - optional precondition (`precondition`)
  - optional priority name (`priority`) — e.g., `["High", "Medium"]`
  - optional status name (`status`) — e.g., `["Done", "In Progress"]`
  - optional assignee Jira account ID (`assignee`)
  - optional estimated time in HH:MM:SS format (`estimatedTime`) — e.g., `"01:30:00"`
  - optional label names to attach (`labels`) — e.g., `["Release_1", "Sprint 1"]`
  - optional component names to attach (`components`) — e.g., `["UI", "Backend"]`
  - optional folder ID to place the test case in (`folderId`) — defaults to the `MCP Generated` folder if not provided
- **Returns**: The created test case key (e.g., `SCRUM-TC-146`) and ID.
- **Use case**: Adding new test cases with metadata, associating them with labels and components, organizing them into folders.

### Update Operations

#### Update Test Case

- **Purpose**: Update an existing test case in QTM4J using its human-readable key.
- **Parameters**:
  - Test case key in `{PROJECT_KEY}-TC-{number}` format (`key`) — e.g., `SCRUM-TC-145`. **Required.**
  - optional version number to update (`versionNo`) — defaults to the latest version
  - optional updated summary (`summary`)
  - optional updated description (`description`)
  - optional updated precondition (`precondition`)
  - optional priority name (`priority`)
  - optional status name (`status`)
  - optional assignee Jira account ID (`assignee`)
  - optional estimated time in HH:MM:SS format (`estimatedTime`)
  - optional labels add/delete object (`labels`):
    - names to add (`add`) — e.g., `["Release_2"]`
    - names to remove (`delete`) — e.g., `["Release_1"]`
  - optional components add/delete object (`components`):
    - names to add (`add`) — e.g., `["Auth"]`
    - names to remove (`delete`) — e.g., `["Legacy"]`
- **Returns**: Confirmation object with the test case key, version number updated, and `updated: true`. Any unrecognized field values are reported as warnings.
- **Use case**: Changing priority or status, adding or removing labels/components, updating summary or description, reassigning a test case, setting estimated time.

## Test Cycles

### Retrieval Operations

#### Search Test Cycles

- **Purpose**: Search and filter test cycles within the active QTM4J project using a rich set of criteria.
- **Parameters**:
  - optional filter object (`filter`) containing:
    - free-text search across key, summary, and description (`searchText`)
    - status names to include (`status`) — e.g., `["In Progress", "To Do"]`
    - priority names to include (`priority`) — e.g., `["High", "Medium"]`
    - label names to include (`labels`) — e.g., `["Release_1", "Sprint 1"]`
    - component names to include (`components`) — e.g., `["UI", "Cloud"]`
    - folder ID to filter by (`folderId`) — numeric ID; right-click a folder in QTM4J and select "Copy Folder Id"
    - assignee Jira account IDs (`assignee`)
    - reporter Jira account IDs (`reporter`)
    - automation status (`isAutomated`) — `true` for automated only, `false` for manual only
    - planned start date range (`plannedStartDate`) — format: `dd/MMM/yyyy,dd/MMM/yyyy` e.g., `"01/Apr/2026,30/Apr/2026"`
    - planned end date range (`plannedEndDate`) — format: `dd/MMM/yyyy,dd/MMM/yyyy`
    - creation date range (`createdOn`) — format: `dd/MMM/yyyy,dd/MMM/yyyy`
    - last-updated date range (`updatedOn`) — format: `dd/MMM/yyyy,dd/MMM/yyyy`
    - AI-generated flag (`aiGenerated`)
  - optional fields to include in each result (`fields`) — omit to return server default fields. Available: `key`, `summary`, `description`, `status`, `priority`, `assignee`, `reporter`, `isAutomated`, `plannedStartDate`, `plannedEndDate`, `labels`, `components`, `fixVersions`, `sprint`, `defectCount`, `estimatedTime`, `actualTime`, `created`, `updated`. Note: `plannedStartDate` and `plannedEndDate` are **not** in the default response — include them explicitly when needed.
  - optional sort pattern (`sort`) — format: `fieldName:asc|desc` (default: `key:asc`). Allowed fields: `key`, `summary`, `status`, `plannedStartDate`, `plannedEndDate`, `defectCount`.
  - optional starting position for pagination (`startAt`)
  - optional max results per page (`maxResults`) — max 100
- **Returns**: A paginated result with `total`, `startAt`, `maxResults`, and `data` array of test cycle objects. Each item always includes `id` and `key`; other fields depend on what was requested via `fields`.
- **Use case**: Finding test cycles by status, priority, labels, components, or owner; filtering by planned or creation date range; searching by keyword; paginating through large result sets.
- **Note**: Multiple values within the same filter field use OR logic; different filter fields are combined with AND.

### Creation Operations

#### Create Test Cycle

- **Purpose**: Create a new test cycle in the active QTM4J project to group test cases for a specific execution context (sprint, release, environment, etc.).
- **Parameters**:
  - Test cycle summary/title (`summary`)
  - optional description (`description`)
  - optional priority name (`priority`) — e.g., `["High", "Medium"]`
  - optional status name (`status`) — e.g., `["To Do", "In Progress"]`
  - optional assignee Jira account ID (`assignee`)
  - optional reporter Jira account ID (`reporter`)
  - optional label names to attach (`labels`) — e.g., `["Release_1", "Sprint 1"]`
  - optional component names to attach (`components`) — e.g., `["UI", "Cloud"]`
  - optional planned start date (`plannedStartDate`) — format: `dd/MMM/yyyy HH:mm` e.g., `"10/May/2026 00:00"`
  - optional planned end date (`plannedEndDate`) — format: `dd/MMM/yyyy HH:mm`
- **Returns**: The created test cycle key (e.g., `SCRUM-TR-218`) and ID.
- **Use case**: Creating sprint cycles, release cycles, or environment-specific cycles; organizing test cases for a planned execution window.
- **Note**: All cycles are placed in the `MCP Generated` folder automatically.

### Update Operations

#### Update Test Cycle

- **Purpose**: Update an existing test cycle in QTM4J using its human-readable key.
- **Parameters**:
  - Test cycle key in `{PROJECT_KEY}-TR-{number}` format (`key`) — e.g., `SCRUM-TR-101`. **Required.**
  - optional updated summary (`summary`)
  - optional updated description (`description`) — pass `null` to clear
  - optional priority name (`priority`) — pass `null` to clear
  - optional status name (`status`) — pass `null` to clear
  - optional planned start date (`plannedStartDate`) — format: `dd/MMM/yyyy HH:mm`; pass `null` to clear
  - optional planned end date (`plannedEndDate`) — format: `dd/MMM/yyyy HH:mm`; pass `null` to clear
  - optional assignee Jira account ID (`assignee`) — pass `null` to unassign
  - optional reporter Jira account ID (`reporter`) — pass `null` to clear
  - optional labels add/delete object (`labels`):
    - names to add (`add`) — e.g., `["Release_2"]`
    - names to remove (`delete`) — e.g., `["Sprint1"]`
  - optional components add/delete object (`components`):
    - names to add (`add`) — e.g., `["Auth"]`
    - names to remove (`delete`) — e.g., `["Legacy"]`
- **Returns**: Confirmation object with the test cycle key and `updated: true`. Any unrecognized field values are reported as warnings.
- **Use case**: Changing status or priority, updating planned dates, reassigning ownership, adding or removing labels/components, renaming a cycle, clearing a description.
- **Note**: Only the fields you provide are changed — omitted fields are left as-is. Archived test cycles cannot be updated.

## Automation

Automation tools authenticate using `QTM4J_AUTOMATION_API_KEY` and do not require an active project context.

### Upload Automation Result

- **Purpose**: Upload an automation result file from disk to QTM4J and map results to a test cycle. Supports JUnit, TestNG, Cucumber, QAF, HP UFT, and SpecFlow formats. Import is asynchronous — use the returned `trackingId` with `qtm4j_get_automation_history` to check progress.
- **Parameters**:
  - path to the result file on disk (`filePath`) — `.xml`, `.json`, or `.zip`
  - result file format (`format`) — one of `junit`, `testng`, `cucumber`, `qaf`, `hpuft`, `specflow`
  - optional existing test cycle key to reuse (`testCycleToReuse`) — e.g. `SCRUM-TR-5`; if omitted, a new cycle is created
  - optional environment name (`environment`)
  - optional build name (`build`) — e.g. `"2.1.0"`
  - optional ZIP flag (`isZip`) — set `true` for QAF; defaults to `false`
  - optional flag to attach execution files (`attachFile`) — defaults to `false`
  - optional flag to match test cases by test steps (`matchTestSteps`) — defaults to `true`
  - optional flag to append suite/test name to the method name (`appendTestName`) — JUnit and TestNG only
  - optional fields object (`fields`) with sub-objects:
    - `fields.testCycle`: `summary`, `description`, `labels`, `components`, `priority`, `status`, `assignee`, `reporter`, `folderId`, `plannedStartDate`, `plannedEndDate`
    - `fields.testCase`: `description`, `precondition`, `labels`, `components`, `priority`, `status`, `assignee`, `reporter`, `folderId`, `estimatedTime`
    - `fields.testCaseExecution`: `comment`, `actualTime`, `executionPlannedDate`, `assignee`
- **Returns**: `trackingId`, a status message, the uploaded file path, and the format used.
- **Use case**: Importing CI/CD pipeline test results into QTM4J, linking results to an existing test cycle, creating new test cycles with automation results.
- **Notes**:
  - **Providing the result file** — three options:
    1. **Explicit path**: provide the exact file path, e.g. `"./target/surefire-reports/TEST-results.xml"`
    2. **Auto-discovery**: omit `filePath` and the AI scans common directories (`target/surefire-reports`, `build/reports/tests`, `reports`, `cucumber-reports`, and more). A single match is confirmed before uploading; multiple matches are listed for you to choose.
    3. **Drag and drop**: drag the result file directly into the chat — the AI will read its contents and upload it automatically.
  - Maximum file size is **10 MB**. Files exceeding this limit will be rejected before upload.
  - `folderId` is a numeric ID — right-click the target folder in QTM4J and select **Copy Folder Id**.
  - `assignee` and `reporter` require a Jira **Account ID**, not a display name or email.
  - `fields.testCycle` is ignored when `testCycleToReuse` is provided.
  - `plannedStartDate` and `plannedEndDate` accept natural language or standard date input — e.g. `"today"`, `"2026-05-20 10:30"`.

### Get Automation History

- **Purpose**: Retrieve the import history of automation result uploads with status and summary for each record.
- **Parameters**:
  - optional zero-indexed starting position (`startAt`) — defaults to `0`
  - optional maximum number of records to return (`maxResults`) — defaults to `20`, max `100`
- **Returns**: A paginated list of import records each containing tracking ID, format, process and import status, start/end times, file size, detailed message, and a summary of test cases/versions/steps created or reused and the test cycle key.
- **Use case**: Checking whether a previous import succeeded or failed, reviewing upload history, retrieving the test cycle key created by an import.
