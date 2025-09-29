# Zephyr Test Management Integration

## Overview

The Zephyr MCP integration provides AI assistants with comprehensive test management capabilities through the SmartBear MCP (Model Context Protocol) server. This integration enables seamless test case creation, test planning, execution tracking, and issue coverage analysis through conversational AI interfaces.

### Key Benefits

- **Automated Test Management**: Create and manage test cases, plans, and executions through natural language
- **Issue Traceability**: Analyze test coverage for Jira issues and requirements
- **Streamlined Workflows**: Execute complex test management tasks without manual UI navigation
- **Comprehensive API Access**: Full access to Zephyr Cloud functionality through standardized MCP tools

## Setup

### Environment Variables

The following environment variables configure the Zephyr integration:

#### Required

- **`ZEPHYR_ACCESS_TOKEN`** (required): JWT access token for Zephyr Cloud API authentication
  - Obtain from Zephyr Cloud: Account Settings → API Tokens
  - Format: Standard JWT token (3 base64url-encoded parts separated by dots)
  - Example: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`

#### Optional

- **`ZEPHYR_PROJECT_KEY`** (optional): Default project scope for operations
  - Format: Uppercase project key (e.g., `TEST`, `PROJ`, `AGILE`)
  - When set, tools will default to this project when no explicit project is specified
  - Example: `ZEPHYR_PROJECT_KEY=MYPROJECT`

- **`ZEPHYR_BASE_URL`** (optional): Custom API endpoint for self-hosted instances
  - Default: `https://api.zephyrscale.smartbear.com/v2`
  - Format: Full URL with protocol and version
  - Example: `ZEPHYR_BASE_URL=https://custom.zephyr.com/v2`

### Configuration Examples

#### Basic Configuration (Cloud)
```bash
export ZEPHYR_ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export ZEPHYR_PROJECT_KEY="MYPROJECT"
```

#### Self-Hosted Configuration
```bash
export ZEPHYR_ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export ZEPHYR_PROJECT_KEY="ENTERPRISE"
export ZEPHYR_BASE_URL="https://zephyr.company.com/v2"
```

#### Docker Environment
```dockerfile
ENV ZEPHYR_ACCESS_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ENV ZEPHYR_PROJECT_KEY=DOCKER_TESTS
```

### Validation Steps

1. **Token Validation**: Verify JWT token format and validity
   ```bash
   # Token should have 3 parts separated by dots
   echo $ZEPHYR_ACCESS_TOKEN | tr '.' '\n' | wc -l
   # Should output: 3
   ```

2. **API Connectivity**: Test connection to Zephyr API
   ```bash
   curl -H "Authorization: Bearer $ZEPHYR_ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        https://api.zephyrscale.smartbear.com/v2/projects
   ```

3. **Project Access**: Verify project key access
   ```bash
   curl -H "Authorization: Bearer $ZEPHYR_ACCESS_TOKEN" \
        https://api.zephyrscale.smartbear.com/v2/projects/$ZEPHYR_PROJECT_KEY
   ```

## Available Tools

### Issue Coverage

Analyze test coverage for Jira issues and requirements.

#### `zephyr_get_issue_test_coverage`

Retrieve test cases that cover a specific Jira issue.

**Parameters:**
- `issueKey` (required): Jira issue key (e.g., "PROJECT-123")
- `projectKey` (optional): Project scope for search

**Example:**
```json
{
  "issueKey": "PROJ-456",
  "projectKey": "PROJ"
}
```

**Use Cases:**
- Check which test cases cover a specific bug or feature
- Identify gaps in test coverage for requirements
- Generate coverage reports for stakeholders

### Test Case Management

Complete CRUD operations for test case lifecycle management.

#### `zephyr_list_test_cases`

List test cases for a project.

**Parameters:**
- `projectKey` (required): JIRA project key

#### `zephyr_list_test_cases__nextgen_`

List test cases using NextGen API with enhanced filtering.

**Parameters:**
- `projectKey` (required): JIRA project key
- `folderId` (optional): Folder ID to filter by
- `maxResults` (optional): Maximum number of results (default: 50, max: 100)

#### `zephyr_get_test_case`

Get details of a specific test case.

**Parameters:**
- `testCaseKey` (required): Test case key in Zephyr format

#### `zephyr_create_test_case`

Create a new test case with comprehensive metadata.

**Parameters:**
- `testCaseData` (required): Object containing test case information
  - `name` (required): Test case name
  - `projectKey` (required): JIRA project key
  - `objective` (optional): Test case objective
  - `precondition` (optional): Test precondition
  - `estimatedTime` (optional): Estimated time in minutes
  - `componentId` (optional): Component ID
  - `priorityName` (optional): Priority name
  - `statusName` (optional): Status name
  - `folderId` (optional): Folder ID
  - `ownerId` (optional): Owner ID
  - `labels` (optional): Array of test case labels
  - `customFields` (optional): Custom fields object

**Example:**
```json
{
  "testCaseData": {
    "name": "User Login Validation",
    "projectKey": "PROJ",
    "objective": "Verify user can login with valid credentials",
    "folderId": 123,
    "priorityName": "High"
  }
}
```

#### `zephyr_update_test_case`

Update existing test case properties.

**Parameters:**
- `testCaseKey` (required): Test case key in Zephyr format (e.g., PROJECT-T123)
- `updateData` (required): Object containing fields to update
  - `name` (optional): Updated test case name
  - `objective` (optional): Updated test case objective
  - `precondition` (optional): Updated test precondition
  - `estimatedTime` (optional): Updated estimated time in minutes
  - `componentId` (optional): Updated component ID
  - `priorityName` (optional): Updated priority name
  - `statusName` (optional): Updated status name
  - `folderId` (optional): Updated folder ID
  - `ownerId` (optional): Updated owner ID
  - `labels` (optional): Updated test case labels
  - `customFields` (optional): Updated custom fields

#### `zephyr_add_test_script`

Add executable script or detailed instructions to test case.

**Parameters:**
- `testCaseKey` (required): Test case key in Zephyr format (e.g., PROJECT-T123)
- `text` (required): Test script content
- `type` (optional): Test script type - must be 'plain' or 'bdd'. Defaults to 'plain'.

#### `zephyr_add_test_steps`

Add structured test steps with expected results.

**Parameters:**
- `testCaseKey` (required): Test case key in Zephyr format (e.g., PROJECT-T123)
- `testSteps` (required): Array of test steps with descriptions and expected results
  - `description` (required): Step description
  - `expectedResult` (required): Expected result
  - `testData` (optional): Test data for this step

**Example:**
```json
{
  "testCaseKey": "PROJ-T123",
  "testSteps": [
    {
      "description": "Navigate to login page",
      "expectedResult": "Login form is displayed",
      "testData": "URL: /login"
    },
    {
      "description": "Enter valid credentials",
      "expectedResult": "User is authenticated",
      "testData": "user: admin, pass: secure123"
    }
  ]
}
```

#### `zephyr_link_test_case_to_issue`

Create traceability link between test case and Jira issue.

**Parameters:**
- `testCaseKey` (required): Test case key in Zephyr format (e.g., PROJECT-T123)
- `issueId` (required): JIRA issue Id (e.g., 12345)

### Test Planning

Organize test activities with test plans.

#### `zephyr_list_test_plans`

List test plans for a project.

**Parameters:**
- `projectKey` (required): JIRA project key

### Test Case Links and Versions

Manage test case relationships and versioning.

#### `zephyr_get_test_case_links`

Get all links for a test case.

**Parameters:**
- `testCaseKey` (required): Test case key in Zephyr format (e.g., PROJECT-T123)

#### `zephyr_create_test_case_web_link`

Create a web link for a test case.

**Parameters:**
- `testCaseKey` (required): Test case key in Zephyr format (e.g., PROJECT-T123)
- `webLinkData` (required): Web link data with URL and optional description
  - `url` (required): Web link URL (must start with http:// or https://)
  - `description` (optional): Optional description for the web link

#### `zephyr_list_test_case_versions`

List all versions of a test case.

**Parameters:**
- `testCaseKey` (required): Test case key in Zephyr format (e.g., PROJECT-T123)
- `maxResults` (optional): Maximum number of results (default: 10, max: 1000)

#### `zephyr_get_test_case_version`

Get a specific version of a test case.

**Parameters:**
- `testCaseKey` (required): Test case key in Zephyr format (e.g., PROJECT-T123)
- `version` (required): Version number of the test case to retrieve

### Test Scripts and Steps

Retrieve test case implementation details.

#### `zephyr_get_test_case_test_script`

Get the test script for a test case.

**Parameters:**
- `testCaseKey` (required): Test case key in Zephyr format (e.g., PROJECT-T123)

#### `zephyr_get_test_case_test_steps`

Get test steps for a test case.

**Parameters:**
- `testCaseKey` (required): Test case key in Zephyr format (e.g., PROJECT-T123)
- `maxResults` (optional): Maximum number of results (default: 10, max: 1000)
- `startAt` (optional): Zero-indexed starting position (default: 0)


## Common Workflows

### Creating Test Cases

Complete workflow for creating comprehensive test cases:

```json
// 1. Create the test case
{
  "tool": "zephyr_create_test_case",
  "parameters": {
    "testCaseData": {
      "name": "User Registration Validation",
      "objective": "Verify new user registration process",
      "projectKey": "ECOM",
      "folderId": 456,
      "priorityName": "High"
    }
  }
}

// 2. Add detailed test steps
{
  "tool": "zephyr_add_test_steps",
  "parameters": {
    "testCaseKey": "ECOM-T789",
    "testSteps": [
      {
        "description": "Navigate to registration page",
        "expectedResult": "Registration form displays all required fields"
      },
      {
        "description": "Fill form with valid data",
        "expectedResult": "Form accepts input without validation errors",
        "testData": "email: test@example.com, password: SecurePass123"
      },
      {
        "description": "Submit registration",
        "expectedResult": "User account created and confirmation email sent"
      }
    ]
  }
}

// 3. Link to requirement issue
{
  "tool": "zephyr_link_test_case_to_issue",
  "parameters": {
    "testCaseKey": "ECOM-T789",
    "issueId": "123"
  }
}
```

### Test Planning

List and analyze test plans:

```json
// List test plans for a project
{
  "tool": "zephyr_list_test_plans",
  "parameters": {
    "projectKey": "ECOM"
  }
}
```

### Issue Traceability

Analyzing test coverage and ensuring comprehensive testing:

```json
// 1. Analyze issue coverage
{
  "tool": "zephyr_get_issue_test_coverage",
  "parameters": {
    "issueKey": "ECOM-BUG-456",
    "projectKey": "ECOM"
  }
}

// 2. Create additional test case if coverage is insufficient
{
  "tool": "zephyr_create_test_case",
  "parameters": {
    "testCaseData": {
      "name": "Regression Test for Payment Bug",
      "objective": "Verify payment processing bug is resolved",
      "projectKey": "ECOM"
    }
  }
}

// 3. Link new test case to bug issue
{
  "tool": "zephyr_link_test_case_to_issue",
  "parameters": {
    "testCaseKey": "ECOM-T790",
    "issueKey": "ECOM-BUG-456"
  }
}
```

## Error Handling

### Common Error Scenarios

#### Authentication Errors
```
Error: Zephyr API error (GET /projects): Invalid authentication token [Status: 401]
```
**Resolution**: Verify `ZEPHYR_ACCESS_TOKEN` is valid and not expired

#### Authorization Errors
```
Error: Zephyr API error (POST /testcases): Insufficient permissions [Status: 403]
```
**Resolution**: Ensure token has required permissions for project and operation

#### Invalid Project Key
```
Error: Project not found: NONEXISTENT
```
**Resolution**: Verify project key exists and user has access

#### Rate Limiting
```
Error: API rate limit exceeded [Status: 429]
```
**Resolution**: Implement delays between requests or contact administrator for rate limit increase

#### Network Connectivity
```
Error: Network request failed: ECONNREFUSED
```
**Resolution**: Check network connectivity and `ZEPHYR_BASE_URL` configuration

### Troubleshooting Guide

#### Token Issues
1. **Expired Token**: Generate new token from Zephyr Cloud account settings
2. **Invalid Format**: Ensure token is complete JWT with 3 parts separated by dots
3. **Permissions**: Verify token has required project and API permissions

#### API Connection Issues
1. **Custom URL**: Verify `ZEPHYR_BASE_URL` is correct for self-hosted instances
2. **SSL/TLS**: Ensure proper certificate configuration for HTTPS endpoints
3. **Firewall**: Check network firewall rules for API endpoint access

#### Data Validation Errors
1. **Required Fields**: Ensure all required parameters are provided
2. **Format Validation**: Check parameter formats match API expectations
3. **Reference Integrity**: Verify referenced entities (projects, folders, etc.) exist

#### Performance Considerations
1. **Caching**: Enable caching for metadata operations to improve performance
2. **Batch Operations**: Group related operations to minimize API calls
3. **Error Retry**: Implement appropriate retry logic for transient failures

### Support Resources

- **Zephyr Documentation**: [https://support.smartbear.com/zephyr-scale-cloud/](https://support.smartbear.com/zephyr-scale-cloud/)
- **API Reference**: [https://support.smartbear.com/zephyr-scale-cloud/api-docs/](https://support.smartbear.com/zephyr-scale-cloud/api-docs/)
- **SmartBear Community**: [https://community.smartbear.com/](https://community.smartbear.com/)
- **MCP Protocol**: [https://modelcontextprotocol.io/](https://modelcontextprotocol.io/)

## Advanced Configuration

### Custom Headers
The integration automatically sets required headers:
- `Authorization: Bearer <token>`
- `Content-Type: application/json`
- `Accept: application/json`
- `User-Agent: SmartBear-MCP-Server/1.0.0`

### Caching Configuration
Metadata operations (statuses, priorities, environments) are cached with 5-minute TTL for improved performance. Cache behavior is handled automatically.

### Logging
Integration provides comprehensive debug logging for troubleshooting. Logs include:
- Entry/exit points for all operations
- Parameter validation results
- API request/response details
- Error context and stack traces

### Performance Optimization
- Metadata caching reduces API calls for reference data
- Concurrent request support for bulk operations
- Efficient error handling with context preservation
- Memory-efficient response processing