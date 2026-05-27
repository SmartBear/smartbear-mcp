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

## Prerequisites

**All tools require an active project context.** Before using any test case operations, call `qtm4j_set_project_context` to set the active project for the session.

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

### Link Operations

#### Get Linked Requirements

- **Purpose**: Retrieve all Jira requirements linked to a specific test case.
- **Parameters:**
  - Test case key (`key`) — format: `{PROJECT_KEY}-TC-{number}`, e.g., `SCRUM-TC-145`
  - optional test case version number (`versionNo`) — defaults to latest version
  - optional sort pattern (`sort`)
  - optional starting position for pagination (`startAt`)
  - optional max results to return (`maxResults`)
- **Returns**: A paginated list of linked Jira requirements with their key, summary, status, priority, and issue type.
- **Use case**: Auditing which Jira stories or bugs a test case covers; verifying requirement coverage before a release.

#### Link Requirements to Test Case

- **Purpose**: Link one or more Jira requirements to a test case.
- **Parameters:**
  - Test case key (`key`) — format: `{PROJECT_KEY}-TC-{number}`, e.g., `SCRUM-TC-145`
  - optional test case version number (`versionNo`) — defaults to latest version
  - optional list of Jira issue keys to link (`requirementKeys`) — e.g., `["SCRUM-1", "SCRUM-2"]`
  - optional JQL filter to select requirements by query (`filter.jql`) — e.g., `"project = DEMO AND issuetype = Story"`
- **Returns**: Confirmation with the test case key, version number, and `linked: true`. Requirements that could not be linked are reported as warnings.
- **Use case**: Linking Jira stories or bugs to a test case; linking all stories from a sprint using JQL.
- **Note**: Provide either `requirementKeys` or `filter.jql` — not both.

#### Unlink Requirements from Test Case

- **Purpose**: Remove one or more Jira requirements from a test case, or remove all linked requirements at once.
- **Parameters:**
  - Test case key (`key`) — format: `{PROJECT_KEY}-TC-{number}`, e.g., `SCRUM-TC-145`
  - optional test case version number (`versionNo`) — defaults to latest version
  - optional list of Jira issue keys to remove (`requirementKeys`) — e.g., `["SCRUM-1", "SCRUM-2"]`
  - optional flag to remove all linked requirements at once (`unLinkAll`)
- **Returns**: Confirmation with the test case key, version number, and `unlinked: true`. Requirements that could not be removed are reported as warnings.
- **Use case**: Removing incorrect requirement links from a test case; clearing all linked requirements before relinking.
- **Note**: Provide either `requirementKeys` or set `unLinkAll: true` — not both.

## Requirements

### Retrieval Operations

#### Get Linked Test Cases for Requirement

- **Purpose**: Retrieve all test cases linked to a specific Jira requirement.
- **Parameters:**
  - Jira issue key (`requirementKey`) — format: `{PROJECT_KEY}-{number}`, e.g., `SCRUM-1`
  - optional filter object (`filter`) with:
    - status names to include (`status`) — e.g., `["Done", "In Progress"]`
    - priority names to include (`priority`) — e.g., `["High", "Medium"]`
    - label names to include (`labels`) — e.g., `["Release_1"]`
    - folder ID to filter by (`folderId`)
    - archive state of test cases (`testCaseStatus`) — `"active"`, `"archived"`, or `"deleted"`
  - optional comma-separated fields to include in results (`fields`) — omit to return all fields
  - optional sort pattern (`sort`)
  - optional starting position for pagination (`startAt`)
  - optional max results per page (`maxResults`)
- **Returns**: A paginated list of linked test cases with their metadata, including `total`, `startAt`, `maxResults`, and a `data` array.
- **Use case**: Checking test coverage for a Jira story or bug; filtering linked test cases by status or priority before a release.

### Link Operations

#### Link Test Cases to Requirement

- **Purpose**: Link one or more test cases to a Jira requirement.
- **Parameters:**
  - Jira issue key (`requirementKey`) — format: `{PROJECT_KEY}-{number}`, e.g., `SCRUM-1`
  - optional list of test case keys to link (`testCaseKeys`) — e.g., `["SCRUM-TC-10", "SCRUM-TC-11"]`
  - optional filter to select test cases by criteria (`filter`) with:
    - status names to include (`status`)
    - priority names to include (`priority`)
    - label names to include (`labels`)
    - folder ID to filter by (`folderId`)
    - flag to include test cases in child folders (`withChild`)
  - optional sort pattern for filter results (`sort`)
- **Returns**: Confirmation with the requirement key and `linked: true`. Test cases that could not be linked are reported as warnings.
- **Use case**: Linking test cases to a Jira story or bug; linking all high-priority test cases to a requirement.
- **Note**: Provide either `testCaseKeys` or `filter` — not both.

#### Unlink Test Cases from Requirement

- **Purpose**: Remove one or more test cases from a Jira requirement.
- **Parameters:**
  - Jira issue key (`requirementKey`) — format: `{PROJECT_KEY}-{number}`, e.g., `SCRUM-1`
  - optional list of test case keys to remove (`testCaseKeys`) — e.g., `["SCRUM-TC-10", "SCRUM-TC-11"]`
  - optional filter to select test cases to remove by criteria (`filter`) with:
    - status names to include (`status`)
    - priority names to include (`priority`)
    - label names to include (`labels`)
- **Returns**: Confirmation with the requirement key and `unlinked: true`. Test cases that could not be removed are reported as warnings.
- **Use case**: Removing stale test case links from a requirement; cleaning up after sprint changes.
- **Note**: Provide either `testCaseKeys` or `filter` — not both.

## Test Cycles

### Retrieval Operations

#### Search Test Cases in Test Cycle

- **Purpose**: Search and filter test case executions within a QTM4J test cycle.
- **Parameters:**
  - Test cycle key (`cycleKey`) — format: `{PROJECT_KEY}-TR-{id}`, e.g., `SCRUM-TR-1`
  - optional fields to include in each result (`fields`) — omit to return all fields; allowed values: `id`, `key`, `summary`, `description`, `executionResult`, `status`, `priority`, `environment`, `tcWithDefects`, `estimatedTime`, `actualTime`, `createdOn`, `updatedOn`, `sprint`, `seqNo`, `flakyScore`, `passRateScore`
  - optional sort pattern (`sort`) — format: `field:asc|desc`, e.g., `key:desc`; allowed fields match the `fields` list above
  - optional starting position for pagination (`startAt`) — default: `0`
  - optional max results per page (`maxResults`) — max 100, default 50
  - optional filter object (`filter`) with:
    - execution result values to include (`executionResult`) — e.g., `["Pass", "Fail", "Blocked"]`
    - status names to include (`status`)
    - priority names to include (`priority`)
    - environment names to include (`environment`)
    - execution assignee Jira account IDs (`executionAssignee`)
    - label names to include (`labels`)
    - component names to include (`components`)
    - flag to filter test cases with defects linked (`tcWithDefects`)
    - automation status (`isAutomated`)
    - folder ID to filter by (`folderId`)
    - planned execution date range (`executionPlannedDate`) — format: `dd/mmm/yyyy,dd/mmm/yyyy`
    - creation date range (`createdOn`) — format: `dd/mmm/yyyy,dd/mmm/yyyy`
    - last-updated date range (`updatedOn`) — format: `dd/mmm/yyyy,dd/mmm/yyyy`
    - free-text search (`searchText`)
- **Returns**: A paginated result with `total`, `startAt`, `maxResults`, and `data` array of test case execution objects.
- **Use case**: Listing all test cases in a cycle; finding failed or blocked executions; filtering by execution result, priority, or assignee before a release.

#### Get Linked Requirements

- **Purpose**: Retrieve all Jira requirements linked to a QTM4J test cycle.
- **Parameters:**
  - Test cycle key (`cycleKey`) — format: `{PROJECT_KEY}-TR-{id}`, e.g., `SCRUM-TR-1`
  - optional sort pattern (`sort`) — allowed fields: `key`, `status`, `priority`; default: `key:desc`
  - optional starting position for pagination (`startAt`) — default: `0`
  - optional max results per page (`maxResults`) — max 100, default 50
- **Returns**: A paginated list of linked Jira requirements with their key, summary, status, priority, and issue type.
- **Use case**: Auditing which Jira stories or bugs a test cycle covers; verifying requirement coverage before a release.

### Link Operations

#### Link Test Cases to Test Cycle

- **Purpose**: Add one or more test cases to a QTM4J test cycle.
- **Parameters:**
  - Test cycle key (`cycleKey`) — format: `{PROJECT_KEY}-TR-{number}`, e.g., `SCRUM-TR-1`
  - optional list of test case keys to add (`testCaseKeys`) — e.g., `["SCRUM-TC-10", "SCRUM-TC-11"]`
  - optional filter to select test cases by criteria (`filter`) with:
    - status names to include (`status`)
    - priority names to include (`priority`)
    - label names to include (`labels`)
    - folder ID to filter by (`folderId`)
    - flag to include test cases in child folders (`withChild`)
  - optional Jira account ID to assign executions to (`assignee`)
  - optional flag to create a fresh execution record for each test case added (`startNewExecution`)
  - optional planned execution date in `yyyy-MM-dd` format (`executionPlannedDate`) — e.g., `"2024-03-31"`
  - optional actual time in `HH:mm` format (`actualTime`) — e.g., `"02:30"`
  - optional sort pattern for filter results (`sort`)
- **Returns**: Confirmation with the cycle key and `linked: true`. Test cases that could not be added are reported as warnings.
- **Use case**: Populating a test cycle before a release; adding all high-priority test cases to a cycle using a filter.
- **Note**: Provide either `testCaseKeys` or `filter` — not both.

#### Unlink Test Cases from Test Cycle

- **Purpose**: Remove one or more test cases from a QTM4J test cycle, or remove all at once.
- **Parameters:**
  - Test cycle key (`cycleKey`) — format: `{PROJECT_KEY}-TR-{number}`, e.g., `SCRUM-TR-1`
  - optional list of test case keys to remove (`testCaseKeys`) — e.g., `["SCRUM-TC-10", "SCRUM-TC-11"]`
  - optional flag to remove all test cases from the cycle at once (`unlinkAll`)
  - optional filter to select test cases to remove by criteria (`filter`) with:
    - status names to include (`status`)
    - label names to include (`labels`)
- **Returns**: Confirmation with the cycle key and `unlinked: true`. Test cases that could not be removed are reported as warnings.
- **Use case**: Clearing a test cycle before repopulating it; removing completed test cases after a release.
- **Note**: Provide exactly one of `testCaseKeys`, `unlinkAll`, or `filter`.

#### Link Requirements to Test Cycle

- **Purpose**: Link one or more Jira requirements to a QTM4J test cycle.
- **Parameters:**
  - Test cycle key (`cycleKey`) — format: `{PROJECT_KEY}-TR-{number}`, e.g., `SCRUM-TR-1`
  - optional list of Jira issue keys to link (`requirementKeys`) — e.g., `["SCRUM-1", "SCRUM-2"]`
  - optional JQL filter to select requirements by query (`filter.jql`) — e.g., `"project = DEMO AND issuetype = Story"`
- **Returns**: Confirmation with the cycle key and `linked: true`. Requirements that could not be linked are reported as warnings.
- **Use case**: Linking Jira stories or bugs to a test cycle; linking all stories from a sprint to a cycle using JQL.
- **Note**: Provide either `requirementKeys` or `filter.jql` — not both.

#### Unlink Requirements from Test Cycle

- **Purpose**: Remove one or more Jira requirements from a QTM4J test cycle, or remove all at once.
- **Parameters:**
  - Test cycle key (`cycleKey`) — format: `{PROJECT_KEY}-TR-{number}`, e.g., `SCRUM-TR-1`
  - optional list of Jira issue keys to remove (`requirementKeys`) — e.g., `["SCRUM-1", "SCRUM-2"]`
  - optional flag to remove all linked requirements at once (`unLinkAll`)
- **Returns**: Confirmation with the cycle key and `unlinked: true`. Requirements that could not be removed are reported as warnings.
- **Use case**: Removing incorrect requirement links from a test cycle; clearing all linked requirements before relinking.
- **Note**: Provide either `requirementKeys` or set `unLinkAll: true` — not both.
