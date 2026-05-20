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

- `QTM4J_AUTOMATION_API_KEY` (required for automation tools): A separate API key used exclusively by the automation import tools (`qtm4j_upload_automation_result` and `qtm4j_get_automation_history`). Generate your Automation API key from your QTM4J instance — refer to the [QMetry automation help documentation](https://support.smartbear.com/qmetry-test-management-for-jira-cloud/docs/en/user-guide/qmetry-open-api.html) for setup instructions.

## Prerequisites

**Most tools require an active project context.** Before using test case operations, call `qtm4j_set_project_context` to set the active project for the session. Automation tools (`qtm4j_upload_automation_result` and `qtm4j_get_automation_history`) do **not** require project context and use `QTM4J_AUTOMATION_API_KEY` instead of `QTM4J_API_KEY`.

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

## Automation

Automation tools do not require an active project context and authenticate using `QTM4J_AUTOMATION_API_KEY` (not `QTM4J_API_KEY`).

### Upload Automation Result

- **Purpose**: Upload an automation result file from disk to QTM4J and map the results to a test cycle. Supports JUnit, TestNG, Cucumber, QAF, HP UFT, and SpecFlow result formats. Import processing is asynchronous — use the returned `trackingId` to poll progress with `qtm4j_get_automation_history`.

#### Providing the result file

You can supply the file in two ways:

1. **Explicit path** — provide the exact file path:
   > "Upload `./target/surefire-reports/TEST-results.xml` to QTM4J"

2. **Auto-discovery** — if you don't provide a path, the AI automatically scans common build output directories in your workspace (`target/surefire-reports`, `target/failsafe-reports`, `build/reports/tests`, `build/test-results`, `test-results`, `reports`, `cucumber-reports`). If a single file is found it will confirm with you before uploading; if multiple files are found it will list them and ask you to choose.

> For full details on automation import options, formats, and CI/CD integration, see the **Automation & CI/CD** section in your QTM4J Jira app (navigate to your project → **Automation & CI/CD** → **Automation API**).

- **Parameters**:
  - path to the result file on disk (`filePath`) — `.xml`, `.json`, or `.zip`
  - result file format (`format`) — one of `junit`, `testng`, `cucumber`, `qaf`, `hpuft`, `specflow`
  - optional work key of an existing test cycle to reuse (`testCycleToReuse`) — e.g., `SCRUM-TR-5`; if omitted, a new test cycle is created automatically
  - optional environment name for the test cycle (`environment`)
  - optional build name for the test cycle (`build`)
  - optional ZIP upload flag (`isZip`) — must be `true` for QAF format; defaults to `false`
  - optional flag to upload execution attachments (`attachFile`) — defaults to `false`
  - optional flag to match test cases by test steps as well as summary (`matchTestSteps`) — defaults to `true`
  - optional flag to append suite/test name to the method name in the test case summary (`appendTestName`) — JUnit and TestNG only
  - optional additional fields object (`fields`) with sub-objects for:
    - `fields.testCycle`: `summary`, `description`, `labels`, `components`, `priority`, `status`, `assignee`, `reporter`, `folderId`, `plannedStartDate`, `plannedEndDate`
    - `fields.testCase`: `description`, `precondition`, `labels`, `components`, `priority`, `status`, `assignee`, `reporter`, `folderId`, `estimatedTime`
    - `fields.testCaseExecution`: `comment`, `actualTime`, `executionPlannedDate`, `assignee`
- **Returns**: `trackingId` for polling import progress, a status message, the uploaded file path, and the format used.
- **Notes**:
  - `folderId` is a numeric ID — right-click the target folder in QTM4J and select **Copy Folder Id** to obtain it.
  - `assignee` and `reporter` require a Jira **Account ID**, not a display name or email address.
  - `fields.testCycle` is ignored when `testCycleToReuse` is provided.
  - Date fields (`plannedStartDate`, `plannedEndDate`) accept any natural language or standard date input — e.g., "today", "tomorrow", "2026-05-20 10:30".
- **Use case**: Importing CI/CD pipeline test results into QTM4J, linking results to an existing test cycle, creating new test cycles with automation results.

### Get Automation History

- **Purpose**: Retrieve the import history of automation result uploads with status and summary for each import record.
- **Parameters**:
  - optional zero-indexed starting position for pagination (`startAt`) — defaults to `0`
  - optional maximum number of records to return (`maxResults`) — defaults to `20`, max `100`
- **Returns**: A paginated list of import records, each containing: tracking ID, format, process status, import status, start and end times, file size, detailed message, and a summary of test cases created/reused, test case versions, test steps, and the test cycle issue key and summary.
- **Use case**: Checking whether a previous import succeeded or failed, reviewing the full import history, retrieving the test cycle key created by an automation import.
