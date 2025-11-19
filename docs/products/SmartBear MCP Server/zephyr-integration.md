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

### Get Test Execution

- **Purpose**: Retrieve a Test Execution available within your Zephyr account by either its key or id.
- **Parameters:** Test Execution key or ID
- **Returns**: A Test Execution along with its properties.
- **Use case**: Getting a Test Execution with its properties.

### Get Test Executions

- **Purpose**: Retrieve Test Executions available within your Zephyr account
- **Parameters:**
  - optional Jira Project key (`projectKey`)
  - optional Test Cycle key (`testCycle`)
  - optional Test Case key (`testCase`)
  - optional Actual End Date after filter (`actualEndDateAfter`)
  - optional Actual End Date before filter (`actualEndDateBefore`)
  - optional include execution step issue links flag (`includeStepLinks`)
  - optional Jira Project Version ID (`jiraProjectVersionId`)
  - optional flag to include only last executions (`onlyLastExecutions`)
  - optional max results to return (`limit`)
  - optional starting cursor position for pagination (`startAtId`)
- **Returns**: A list of Test Executions along with their properties. Results are filtered based on the provided parameters.
- **Use case**: Retrieve Test Executions, filtered by various criteria such as project, test cycle, test case, or execution dates.
