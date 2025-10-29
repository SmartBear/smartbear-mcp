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

### Get Test Case

- **Purpose**: Retrieve the test case available within your Zephyr projects by key
- **Parameters:** Test case key
- **Returns**: A test case along with its properties.
- **Use case**: Retrieve detailed information about a test case.
