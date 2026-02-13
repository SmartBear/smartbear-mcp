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

### Get Test Execution

- **Purpose**: Retrieve a Test Execution available within your Zephyr account by either its key or id.
- **Parameters:** Test Execution key or ID
- **Returns**: A Test Execution along with its properties.
- **Use case**: Getting a Test Execution with its properties.

### Get Test Cycle

- **Purpose**: Retrieve the test cycle available within your Zephyr projects by either its key or id.
- **Parameters:** Test cycle key or ID
- **Returns**: A Test Cycle along with its properties.
- **Use case**: Retrieve detailed information about a test cycle.

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

### Create folder

- **Purpose**: Create a new Folder within the specified Zephyr project to organize Test Cases, Test Plans, or Test Cycles.
- **Parameters:**
    - Project key (`projectKey`)
    - Name (`name`)
    - Folder Type (`folderType`)
    - optional parent Folder Id (`parentFolderId`)
- **Returns**: The created Folder ID and the API self URL to access it.
- **Use case**: Creating a root or sub-folder in a Zephyr project to structure and organize Test Cases, Test Plans, or Test Cycles.
