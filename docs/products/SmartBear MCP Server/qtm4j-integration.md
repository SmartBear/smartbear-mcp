![qtm4j.svg](./images/embedded/qtm4j.svg)

The QTM4J client provides test management capabilities for [QMetry Test Management for Jira](https://www.qmetry.com/qmetry-test-management-for-jira), enabling AI assistants to search, create, and update test cases directly within your Jira-integrated QMetry environment. For full API reference, see the [QMetry Open API documentation](https://support.smartbear.com/qmetry-test-management-for-jira-cloud/docs/en/user-guide/qmetry-open-api.html).

# Setup

## Environment Variables

The following environment variables configure the QTM4J integration:

- `QTM4J_API_KEY` **required**: The QMetry Test Management for Jira API key for authentication. Generate your API key from within your QTM4J instance — refer to the [QMetry Open API setup guide](https://support.smartbear.com/qmetry-test-management-for-jira-cloud/docs/en/user-guide/qmetry-open-api.html) for step-by-step instructions.
  - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

- `QTM4J_BASE_URL` (optional): The QTM4J base URL. Set based on your region or for on-premise installations.
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
