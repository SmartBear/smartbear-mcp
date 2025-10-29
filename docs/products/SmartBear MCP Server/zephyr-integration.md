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
- **Returns**: A list of projects along with their properties, including information about if they have Zephyr enabled or not.

### Get Project

- **Purpose**: Retrieve a project available within your Zephyr account by either its key or id.
- **Parameters:** Project key or ID
- **Returns**: A project along with its properties, including information about if it has Zephyr enabled or not.
- **Use case**: Getting a list of projects and their properties.

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
