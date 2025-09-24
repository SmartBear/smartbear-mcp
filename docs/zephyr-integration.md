# Zephyr Test Management Integration

## Overview

The Zephyr Test Management integration provides AI assistants with comprehensive test management capabilities through the Model Context Protocol (MCP). This integration enables seamless interaction with Zephyr Cloud for test case creation, test planning, execution tracking, and issue coverage analysis directly through conversational AI interfaces.

### Key Benefits

- **AI-Assisted Test Management**: Leverage conversational AI for creating and managing test cases, plans, and executions
- **Issue Traceability**: Analyze test coverage for JIRA issues and requirements
- **Automated Workflows**: Streamline test planning and execution processes
- **Comprehensive API Coverage**: Full access to Zephyr Cloud functionality through standardized MCP tools

## Setup

### Environment Variables

The Zephyr integration requires the following environment variables:

#### Required
- `ZEPHYR_ACCESS_TOKEN` (required): JWT access token for Zephyr Cloud API authentication
  - Obtain from Zephyr Cloud account settings
  - Format: Standard JWT token (e.g., `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

#### Optional
- `ZEPHYR_PROJECT_KEY` (optional): Default project scope for operations
  - Format: Uppercase project key (e.g., `PROJ`, `DEV`, `TEST`)
  - When specified, operations will default to this project unless overridden

- `ZEPHYR_BASE_URL` (optional): Custom API endpoint for enterprise deployments
  - Default: `https://api.zephyrscale.smartbear.com/v2`
  - Format: Full URL including protocol and version

### Configuration Examples

#### Basic Configuration
```bash
# Minimum required setup
export ZEPHYR_ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Start the MCP server
npx @smartbear/mcp-server
```

#### Project-Scoped Configuration
```bash
# Configuration with default project scope
export ZEPHYR_ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export ZEPHYR_PROJECT_KEY="MYPROJECT"

# Start the MCP server
npx @smartbear/mcp-server
```

#### Enterprise Configuration
```bash
# Configuration for enterprise/custom deployment
export ZEPHYR_ACCESS_TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
export ZEPHYR_PROJECT_KEY="CORP"
export ZEPHYR_BASE_URL="https://zephyr.company.com/api/v2"

# Start the MCP server
npx @smartbear/mcp-server
```

### Validation Steps

1. **Token Validation**: Verify your access token is valid and has appropriate permissions
2. **Project Access**: Ensure the token has access to the specified project(s)
3. **API Connectivity**: Test connection to the Zephyr Cloud API endpoint

## Available Tools

### Issue Coverage

Tools for analyzing test coverage of JIRA issues and requirements.

#### Get Issue Test Coverage
- **Purpose**: Retrieve test cases that provide coverage for specific issues
- **Use Cases**:
  - Check which test cases cover a specific user story or bug fix
  - Identify gaps in test coverage for requirements
  - Generate coverage reports for stakeholders
- **Parameters**:
  - `issueKey` (required): JIRA issue key in format PROJECT-123
  - `projectKey` (optional): Project key to scope the search
- **Example**:
  ```json
  {
    "issueKey": "PROJ-123",
    "projectKey": "PROJ"
  }
  ```

### Test Case Management

Comprehensive CRUD operations for test case lifecycle management.

#### Create Test Case
- **Purpose**: Create new test cases with comprehensive metadata
- **Parameters**:
  - `name` (required): Test case name
  - `projectKey` (required): Target project
  - `folderId` (optional): Organization folder
  - `priority` (optional): Priority level
  - `status` (optional): Initial status
- **Example**:
  ```json
  {
    "name": "Test user login functionality",
    "projectKey": "PROJ",
    "folderId": 123,
    "priority": "High",
    "status": "Approved"
  }
  ```

#### Update Test Case
- **Purpose**: Modify existing test case properties
- **Parameters**:
  - `testCaseId` (required): ID of test case to update
  - Updates can include name, description, priority, status, etc.

#### Add Test Script
- **Purpose**: Add executable test scripts to test cases
- **Types**: STEP_BY_STEP, BDD, FREE_FORM
- **Example**:
  ```json
  {
    "testCaseId": 123,
    "type": "STEP_BY_STEP",
    "text": "1. Navigate to login page\n2. Enter credentials\n3. Click login"
  }
  ```

#### Add Test Steps
- **Purpose**: Add structured test steps with expected results
- **Example**:
  ```json
  {
    "testCaseId": 123,
    "steps": [
      {
        "description": "Enter username",
        "expectedResult": "Username field populated"
      },
      {
        "description": "Enter password",
        "expectedResult": "Password field populated"
      }
    ]
  }
  ```

#### Link Test Case to Issue
- **Purpose**: Establish traceability between test cases and JIRA issues
- **Parameters**:
  - `testCaseId` (required): Test case ID
  - `issueKey` (required): JIRA issue key

### Test Planning & Execution

Tools for organizing and executing comprehensive test campaigns.

#### Create Test Plan
- **Purpose**: Organize test cases into executable plans
- **Parameters**:
  - `name` (required): Plan name
  - `projectKey` (required): Target project
  - `description` (optional): Plan description
- **Example**:
  ```json
  {
    "name": "Sprint 1 Regression Plan",
    "projectKey": "PROJ",
    "description": "Comprehensive regression testing for Sprint 1 features"
  }
  ```

#### Create Test Cycle
- **Purpose**: Define execution timeframes and environments
- **Parameters**:
  - `name` (required): Cycle name
  - `projectKey` (required): Target project
  - `plannedStartDate` (optional): Execution start date
  - `plannedEndDate` (optional): Execution end date
  - `environment` (optional): Test environment

#### Link Test Plan to Cycle
- **Purpose**: Associate plans with execution cycles
- **Parameters**:
  - `testPlanId` (required): Test plan ID
  - `testCycleId` (required): Test cycle ID

#### Create Test Execution
- **Purpose**: Create individual test execution records
- **Parameters**:
  - `testCaseId` (required): Test case to execute
  - `testCycleId` (required): Target cycle
  - `assigneeId` (optional): Assigned tester
  - `status` (optional): Initial execution status

#### Update Test Execution
- **Purpose**: Record test execution results
- **Parameters**:
  - `executionId` (required): Execution record ID
  - `status` (required): Result status (Pass, Fail, Blocked, etc.)
  - `comment` (optional): Execution notes
  - `executedOn` (optional): Execution timestamp

### Structure & Metadata

Organizational tools and metadata retrieval for comprehensive test management.

#### Get Folders
- **Purpose**: Retrieve organizational folder structure
- **Parameters**:
  - `projectKey` (required): Target project
  - `folderType` (optional): Filter by folder type

#### Create Folder
- **Purpose**: Create organizational folders for test cases
- **Parameters**:
  - `name` (required): Folder name
  - `projectKey` (required): Target project
  - `type` (required): Folder type (TEST_CASE, etc.)
  - `parentFolderId` (optional): Parent folder for nesting

#### Get Statuses
- **Purpose**: Retrieve available test case statuses
- **Parameters**:
  - `projectKey` (optional): Project-specific statuses

#### Get Priorities
- **Purpose**: Retrieve available priority levels
- **Parameters**:
  - `projectKey` (optional): Project-specific priorities

#### Get Environments
- **Purpose**: Retrieve available test environments
- **Parameters**:
  - `projectKey` (optional): Project-specific environments

## Common Workflows

### Creating Test Cases

A typical workflow for creating comprehensive test cases:

1. **Prepare Structure**:
   ```json
   {
     "tool": "zephyr_get_folders",
     "parameters": {"projectKey": "PROJ"}
   }
   ```

2. **Create Test Case**:
   ```json
   {
     "tool": "zephyr_create_test_case",
     "parameters": {
       "name": "Test user authentication",
       "projectKey": "PROJ",
       "folderId": 123,
       "priority": "High"
     }
   }
   ```

3. **Add Test Steps**:
   ```json
   {
     "tool": "zephyr_add_test_steps",
     "parameters": {
       "testCaseId": 456,
       "steps": [
         {"description": "Navigate to login", "expectedResult": "Login page displayed"},
         {"description": "Enter credentials", "expectedResult": "Fields populated"},
         {"description": "Submit form", "expectedResult": "User authenticated"}
       ]
     }
   }
   ```

4. **Link to Requirements**:
   ```json
   {
     "tool": "zephyr_link_test_case_to_issue",
     "parameters": {
       "testCaseId": 456,
       "issueKey": "PROJ-123"
     }
   }
   ```

### Planning Test Execution

Workflow for setting up test execution campaigns:

1. **Create Test Plan**:
   ```json
   {
     "tool": "zephyr_create_test_plan",
     "parameters": {
       "name": "Release 1.0 Testing",
       "projectKey": "PROJ",
       "description": "Comprehensive testing for major release"
     }
   }
   ```

2. **Create Test Cycle**:
   ```json
   {
     "tool": "zephyr_create_test_cycle",
     "parameters": {
       "name": "Regression Cycle",
       "projectKey": "PROJ",
       "plannedStartDate": "2024-01-15",
       "plannedEndDate": "2024-01-22",
       "environment": "Staging"
     }
   }
   ```

3. **Link Plan to Cycle**:
   ```json
   {
     "tool": "zephyr_link_test_plan_to_cycle",
     "parameters": {
       "testPlanId": 789,
       "testCycleId": 101
     }
   }
   ```

4. **Create Executions**:
   ```json
   {
     "tool": "zephyr_create_test_execution",
     "parameters": {
       "testCaseId": 456,
       "testCycleId": 101,
       "assigneeId": "user-123"
     }
   }
   ```

### Issue Traceability

Workflow for analyzing and ensuring test coverage:

1. **Analyze Coverage**:
   ```json
   {
     "tool": "zephyr_get_issue_coverage",
     "parameters": {
       "issueKey": "PROJ-456",
       "projectKey": "PROJ"
     }
   }
   ```

2. **Create Missing Test Cases** (if coverage gaps identified):
   ```json
   {
     "tool": "zephyr_create_test_case",
     "parameters": {
       "name": "Test specific requirement scenario",
       "projectKey": "PROJ",
       "priority": "High"
     }
   }
   ```

3. **Link to Issue**:
   ```json
   {
     "tool": "zephyr_link_test_case_to_issue",
     "parameters": {
       "testCaseId": 789,
       "issueKey": "PROJ-456"
     }
   }
   ```

## Error Handling

### Common Error Scenarios

#### Authentication Errors
- **Cause**: Invalid or expired access token
- **Solution**: Refresh token in Zephyr Cloud account settings
- **Example Error**: `HTTP 401: Unauthorized`

#### Permission Errors
- **Cause**: Token lacks necessary project permissions
- **Solution**: Contact project administrator for appropriate access
- **Example Error**: `HTTP 403: Access denied for project`

#### Validation Errors
- **Cause**: Invalid parameter formats or missing required fields
- **Solution**: Verify parameter formats match API requirements
- **Example Error**: `Invalid issue key format: expected PROJECT-123`

#### Resource Not Found
- **Cause**: Referenced resources (test cases, issues, projects) don't exist
- **Solution**: Verify resource IDs and project access
- **Example Error**: `Issue not found: PROJ-123`

#### Rate Limiting
- **Cause**: Too many API requests in short timeframe
- **Solution**: Implement delays between requests
- **Example Error**: `HTTP 429: Rate limit exceeded`

### Troubleshooting Guide

1. **Token Issues**:
   - Verify token format (should be JWT)
   - Check token permissions in Zephyr Cloud
   - Ensure token hasn't expired

2. **Project Access**:
   - Confirm project key format (uppercase)
   - Verify project exists and is accessible
   - Check user permissions within project

3. **API Connectivity**:
   - Test network connectivity to API endpoint
   - Verify custom base URL if configured
   - Check firewall/proxy settings

4. **Data Validation**:
   - Ensure issue keys follow PROJECT-123 format
   - Verify required parameters are provided
   - Check parameter data types and formats

### Best Practices

- **Error Resilience**: Always handle API errors gracefully
- **Rate Limiting**: Implement appropriate delays for bulk operations
- **Data Validation**: Validate parameters before API calls
- **Logging**: Enable detailed logging for troubleshooting
- **Testing**: Use staging environment for initial testing and validation

## Integration Examples

### Claude/AI Assistant Integration

Example conversation flows demonstrating natural language interaction:

```
User: "Check test coverage for PROJ-123"