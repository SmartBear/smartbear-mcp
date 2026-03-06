![zephyr.svg](./images/embedded/zephyr.svg)

The Zephyr client provides test management and execution capabilities within Zephyr as listed on [Available Tools](#Available-Tools).

## Setup

### Environment Variables

The following environment variables configure the Zephyr integration:

- `ZEPHYR_API_TOKEN` ***required**: The Zephyr Cloud API token for authentication. More information [here](https://support.smartbear.com/zephyr/docs/en/rest-api/api-access-tokens-management.html).
  - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

- `ZEPHYR_BASE_URL` (optional): The Zephyr Cloud API base url. Should be changed depending on the region of your Jira instance. More information [here](https://support.smartbear.com/zephyr-scale-cloud/api-docs/#section/Authentication/Accessing-the-API).
  - Default: `https://api.zephyrscale.smartbear.com/v2`

## Available Tools

### Get Issue Link Test Cases

- **Purpose**: Retrieve Test Cases linked to a given Jira issue within your Zephyr projects.
- **Parameters:**
  - Jira Issue key (`issueKey`)
- **Returns**: A list of Test Cases along with their keys and versions.
- **Use case**: Retrieve the Test Cases linked to a specific Jira issue.

### Get Projects

- **Purpose**: Retrieve projects available within your Zephyr account.
- **Parameters**:
  - optional starting position for pagination (`startAt`)
  - optional max results to return (`maxResults`)
- **Returns**: A list of projects along with their properties, including information about if they have Zephyr enabled or not. Results are filtered based on the provided parameters.
- **Use case**: Getting a list of projects and their properties.

### Get Project

- **Purpose**: Retrieve a project available within your Zephyr account by either its key or id.
- **Parameters:** Project key or ID
- **Returns**: A project along with its properties, including information about if it has Zephyr enabled or not.
- **Use case**: Getting a project with its properties.

### Get Test Cycles

-  **Purpose**: Retrieve Test Cycles available within your Zephyr account.
-  **Parameters**:
  - optional Project key (`projectKey`)
  - optional Folder ID (`folderId`)
  - optional Jira Project Version ID (`jiraProjectVersionId`)
  - optional max results to return (`maxResults`)
  - optional starting position for pagination (`startAt`)
-  **Returns**: A list of Test Cycles along with their properties.
-  **Use case**: Retrieve the Test Cycles, it can be filtered by Project Key, Folder ID, Jira Project version ID.

### Get Test Cycle

- **Purpose**: Retrieve the test cycle available within your Zephyr projects by either its key or id.
- **Parameters:** Test cycle key or ID
- **Returns**: A Test Cycle along with its properties.
- **Use case**: Retrieve detailed information about a test cycle.

### Create Test Cycles
- **Purpose**: Create a new Test Cycle within the Zephyr project specified by key
- **Parameters:**
    - Project key (`projectKey`)
    - Name (`name`)
    - optional description (`description`)
    - optional planned Start Date (`plannedStartDate`)
    - optional planned End Date (`plannedEndDate`)
    - optional Jira Project Version (`jiraProjectVersion`)
    - optional Status name (`statusName`)
    - optional Folder ID (`folderId`)
    - optional owner ID (`ownerId`)
    - optional Custom Field names with associated values (`customFields`)
- **Returns**: The created Test Cycle ID, with the API URL to access it and the Test Cycle key.
- **Use case**: Creating a Test Cycle with its properties.

### Update Test Cycle

- **Purpose**: Update an existing Test Cycle within the Zephyr project specified by ID or KEY
- **Parameters:**
  - Test Cycle ID or KEY (`testCycleIdOrKey`)
  - optional name (`name`)
  - optional jiraProjectVersion (`jiraProjectVersion`)
  - optional Status ID (`statusId`)
  - optional Folder ID (`folderId`)
  - optional description (`description`)
  - optional planned Start Date (`plannedStartDate`)
  - optional planned End Date (`plannedEndDate`)
  - optional owner ID (`ownerId`)
  - optional Custom Field names with associated values (`customFields`)
- **Returns**: Empty object if the update is successful.
- **Use case**: Updating a Test Cycle with its properties.

### Get Statuses

- **Purpose**: Retrieve statuses related to Test Cases, Cycles, Plans or Executions from your Zephyr account.
- **Parameters**:
  - optional starting position for pagination (`startAt`)
  - optional max results to return (`maxResults`)
  - optional Project key (`projectKey`)
  - optional type of status (`statusType`)
- **Returns**: A list of statuses along with their properties, including name and color. Results are filtered based on the provided parameters.
- **Use case**: Getting details about Zephyr statuses based on the provided filters.

### Get Priorities

- **Purpose**: Retrieve priorities related to Test Cases from your Zephyr account.
- **Parameters**:
  - optional starting position for pagination (`startAt`)
  - optional max results to return (`maxResults`)
  - optional Project key (`projectKey`)
- **Returns**: A list of priorities along with their properties, including name and color. Results are filtered based on the provided parameters.
- **Use case**: Getting details about Zephyr priorities based on the provided filters.

### Get Test Cases

-  **Purpose**: Retrieve Test Cases available within your Zephyr account.
-  **Parameters**:
- optional Project key (`projectKey`)
- optional Folder ID (`folderId`)
- optional max results to return (`limit`)
- optional starting cursor position for pagination (`startAtId`)
-  **Returns**: A list of Test Cases along with their properties.
-  **Use case**: Retrieve the Test Cases, it can be filtered by Project Key and Folder ID.

### Get Test Case

- **Purpose**: Retrieve the test case available within your Zephyr projects by key
- **Parameters:** Test case key
- **Returns**: A test case along with its properties.
- **Use case**: Retrieve detailed information about a test case.

### Create Test Case

- **Purpose**: Create a new Test Case within the Zephyr project specified by key
- **Parameters:**
    - Project key (`projectKey`)
    - Name (`name`)
    - optional objective (`objective`)
    - optional precondition (`precondition`)
    - optional estimated time (`estimatedTime`)
    - optional Jira Component ID (`componentId`)
    - optional Priority name (`priorityName`)
    - optional Status name (`statusName`)
    - optional Folder ID (`folderId`)
    - optional owner ID (`ownerId `)
    - optional Labels (`labels`)
    - optional Custom Field names with associated values (`customFields`)
- **Returns**: The created Test Case ID, with the API URL to access it and the Test Case key.
- **Use case**: Creating a Test Case with its properties.

### Update Test Case
- **Purpose**: Update an existing Test Case within the Zephyr project specified by key
- **Parameters:**
    - Test Case key (`testCaseKey`)
    - optional name (`name`)
    - optional objective (`objective`)
    - optional precondition (`precondition`)
    - optional estimated time (`estimatedTime`)
    - optional Jira Component ID (`componentId`)
    - optional Priority name (`priorityName`)
    - optional Status name (`statusName`)
    - optional Folder ID (`folderId`)
    - optional owner ID (`ownerId `)
    - optional Labels (`labels`)
    - optional Custom Field names with associated values (`customFields`)
- **Returns**: Empty object if the update is successful.
- **Use case**: Updating a Test Case with its properties.

### Create Test Case Web Link

- **Purpose**: Creates a web link that associates a test case with a specified generic URL.
 **Parameters:**
    - Test Case key (`testCaseKey`)
    - optional description (`description`)
    - url (`url`)
- **Returns**: The created Test Case Web Link ID and the API self URL to access it.
- **Use case**: Creates a link between a test case and a generic URL.

### Create Test Case Issue Link

- **Purpose**: Creates a Issue link that associates a test case with Jira Issue
  **Parameters:**
  - Test Case key (`testCaseKey`)
  - Jira Issue Id (`issueId`)
- **Returns**: The created Test Case Issue Link ID and the API self URL that can be used to delete the link.
- **Use case**: Creates a link between a test case and a Jira Issue.


### Create Test Script

- **Purpose**: Create a new Test Script, of the types Plain text or BDD - Gherkin syntax, for an existing Test Case.
- **Parameters:**
    - Test Case key (`testCaseKey`)
    - Type (`type`). Options are PLAIN_TEXT and BDD
    - text  (`text`). For PLAIN_TEXT, this supports HTML fragments. For BDD, you should use `\n` for line breaks.
- **Returns**: The created Test Script ID, with the API URL to access it
- **Use case**: Adding test case scripts (plain or BDD format) to an existing Test Case.

### Get Test Case Steps

- **Purpose**: Retrieve the test case steps for the given test case, available within your Zephyr account by test Case key.
- **Parameters:**
    - Test Case key (`testCaseKey`)
    - optional starting position for pagination (`startAt`)
    - optional max results to return (`maxResults`)
- **Returns**: A list of Test Case Steps along with their properties.
- **Use case**: Getting a list of Test Case Steps and their properties.

### Create Test Case Test Steps
- **Purpose**: Create test steps for a Test Case in Zephyr. Supports inline step definitions or delegating execution to another test case.
- **Parameters:**
    - Test Case key (`testCaseKey`)
    - Mode (`mode`) - "APPEND" to add steps, "OVERWRITE" to replace all steps
    - Items (`items`) - array of test steps, each containing either:
      - `inline`: step with description, optional testData, expectedResult, customFields
      - `testCase`: delegation to another test case by key, with optional parameters
- **Returns**: The ID of the Test Steps resource and the API self URL to fetch it
- **Use case**: Adding step-by-step test instructions to a test case, or composing test cases by referencing other test cases as steps.
### Get Test Execution

- **Purpose**: Retrieve a Test Execution available within your Zephyr account by either its key or id.
- **Parameters:** Test Execution key or ID
- **Returns**: A Test Execution along with its properties.
- **Use case**: Getting a Test Execution with its properties.

### Get Environments

- **Purpose**: Retrieve Environments from your Zephyr account.
- **Parameters**:
  - optional starting position for pagination (`startAt`)
  - optional max results to return (`maxResults`)
  - optional Jira Project key (`projectKey`)
- **Returns**: A list of environments along with their properties, including but not limited to name and description. Results are filtered based on the provided parameters.
- **Use case**: Getting details about Zephyr Environments based on the provided filters.

### Get Test Executions

- **Purpose**: Retrieve Test Executions available within your Zephyr account
- **Parameters:**
  - optional Jira Project key (`projectKey`)
  - optional Test Cycle key (`testCycle`)
  - optional Test Case key (`testCase`)
  - optional Actual End Date after filter (`actualEndDateAfter`)
  - optional Actual End Date before filter (`actualEndDateBefore`)
  - optional flag to include execution step issue links (`includeStepLinks`)
  - optional Jira Project Version ID (`jiraProjectVersionId`)
  - optional flag to include only last executions (`onlyLastExecutions`)
  - optional max results to return (`limit`)
  - optional starting cursor position for pagination (`startAtId`)
- **Returns**: A list of Test Executions along with their properties. Results are filtered based on the provided parameters.
- **Use case**: Retrieve Test Executions, filtered by various criteria such as project, test cycle, test case, or execution dates.

### Create Test Executions

- **Purpose**: Creates a test execution. All required test execution custom fields should be present in the request
- **Parameters:**
  - Jira Project key (`projectKey`)
  - Test Cycle key (`testCycle`)
  - Test Case key (`testCase`)
  - Status name (`statusName`)
  - optional test Script Results (`testScriptResults`)
  - optional Environment Name (`environmentName`)
  - optional Actual End Date (`actualEndDate`)
  - optional Execution Time (`executionTime`)
  - optional Executed by (`executedById`)
  - optional assigned To  (`assignedToId`)
  - optional comment (`comment`)
  - optional Custom Field names with associated values (`customFields`)
- **Returns**:  The created Test execution ID and the API self URL to access it.
- **Use case**: Creating Test Executions, with it's properties

### Update Test Execution

- **Purpose**: Update an existing Test execution.
- **Parameters:**
  - Test execution key or id (`testExecutionIdOrKey`)
  - Status name (`statusName`)
  - optional Environment Name (`environmentName`)
  - optional Actual End Date (`actualEndDate`)
  - optional Execution Time (`executionTime`)
  - optional Executed by (`executedById`)
  - optional assigned To  (`assignedToId`)
  - optional comment (`comment`)
- **Returns**:  Empty object if the update is successful.
- **Use case**: Updating a Test Execution with its properties.

### Create folder

- **Purpose**: Create a new Folder within the specified Zephyr project to organize Test Cases, Test Plans, or Test Cycles.
- **Parameters:**
  - Project key (`projectKey`)
  - Name (`name`)
  - Folder Type (`folderType`)
  - optional parent Folder Id (`parentFolderId`)
- **Returns**: The created Folder ID and the API self URL to access it.
- **Use case**: Creating a folder in a Zephyr project to structure and organize Test Cases, Test Plans, or Test Cycles.

## Notes regarding **Update** operations
- The update operations are partial, meaning that only the provided fields will be updated. For example, if only the `name` and `objective` of the Test Case are provided to the tool, only those fields will be updated while the rest of the Test Case properties will remain unchanged.
- For fields that accept multiple values, such as Test Case `labels`, if the field is provided, it will override the previous values. For example, if `labels` is provided with the values `["label1", "label2"]`, the Test Case will now only have those two labels, and any previous labels will be removed.
  - If you want to add a label, you would need to specify in the prompt the intention to _add a label_, and the MCP would internally call the tool to retrieve the current labels, add the new label to the list and then call the update tool with the complete list of labels.
- If a field is provided with a `null` value, it will clear the value of that field. For example, if `component` is provided with a `null` value, the component of the Test Case will be cleared. This is usually achieved by prompting for _Removal of the component_, or something similar, to indicate that the value should be removed.
