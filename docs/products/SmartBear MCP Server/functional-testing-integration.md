The Swagger Functional Testing client provides tools for discovering API tests. Tools for Swagger Functional Testing require a `FUNCTIONAL_TESTING_API_TOKEN`.

## Available Tools

### Test Discovery

#### `list_tests`

- Purpose: Lists all API tests available in your Swagger Functional Testing account. Use this tool when you need to discover available tests. Do not use this tool to retrieve test execution results or history.
- Returns: Complete list of tests with their identifiers and names.
- Use case: Discover available tests.

---

## Additional Notes

- The `FUNCTIONAL_TESTING_API_TOKEN` environment variable is required to authenticate with the Swagger Functional Testing API.
