The SmartBear Functional Testing client provides tools for discovering API tests. Tools for SmartBear Functional Testing require a `FUNCTIONAL_TESTING_API_TOKEN`.

## Available Tools

### Test Discovery

#### `list_functional_testing_tests`

- Purpose: Lists all API tests available in your SmartBear Functional Testing account.
- Returns: Complete list of tests with their identifiers and names.
- Use case: Discover available tests before running them or checking their status. Do not use this tool to retrieve test execution results or history.

---

## Additional Notes

- The `FUNCTIONAL_TESTING_API_TOKEN` environment variable is required to authenticate with the SmartBear Functional Testing API.