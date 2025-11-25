# AlertSite MCP Client

This client provides integration with SmartBear AlertSite monitoring platform through the Model Context Protocol (MCP).

## Features

The AlertSite MCP client provides the following tools:

1. **Create URL Monitor** - Creates a new URL-based monitor in AlertSite
2. **Run Test On Demand** - Runs a Test On Demand (TOD) for a specific URL
3. **Create SLA Report** - Creates a Service Level Agreement (SLA) report
4. **Add Role-Based User** - Adds a new user with specified role to AlertSite
5. **Delete User** - Deletes an existing user from AlertSite

## Configuration

The client requires the following environment variables:

- `ALERTSITE_BASE_URL` - AlertSite API base URL
- `ALERTSITE_USERNAME` - AlertSite username for authentication
- `ALERTSITE_PASSWORD` - AlertSite password for authentication

### Setup

1. Copy the configuration template:
   ```bash
   cp src/alertsite/config.example.sh src/alertsite/config.sh
   ```

2. Edit `src/alertsite/config.sh` with your actual AlertSite credentials:
   ```bash
   export ALERTSITE_BASE_URL="https://api.alertsite.com"
   export ALERTSITE_USERNAME="your_alertsite_username"
   export ALERTSITE_PASSWORD="your_alertsite_password"
   ```

3. Source the configuration:
   ```bash
   source src/alertsite/config.sh
   ```

## Authentication

The client uses OAuth 2.0 password flow for authentication:

1. On first API call, the client exchanges username/password for an access token
2. The access token is cached and reused for subsequent calls
3. When the token expires (or API returns 401), a new token is automatically obtained
4. Token refresh is handled transparently by the `call()` method

## API Tools

### 1. Create URL Monitor

Creates a new URL-based monitor in AlertSite.

**Parameters:**
- `name` (string) - Name of the monitor
- `url` (string) - URL to monitor
- `interval` (number, optional) - Monitoring interval in minutes (default: 15)
- `locations` (array, optional) - Monitoring locations (default: all available)
- `alertEmail` (string, optional) - Email address for alerts

### 2. Run Test On Demand

Runs a Test On Demand (TOD) for a specific URL.

**Parameters:**
- `url` (string) - URL to test
- `locations` (array, optional) - Test locations (default: all available)
- `testType` (enum, optional) - Type of test: "performance", "availability", "full" (default: "availability")

### 3. Create SLA Report

Creates a Service Level Agreement (SLA) report.

**Parameters:**
- `monitorIds` (array) - Array of monitor IDs to include in the report
- `startDate` (string) - Report start date (YYYY-MM-DD format)
- `endDate` (string) - Report end date (YYYY-MM-DD format)
- `reportName` (string, optional) - Name of the SLA report
- `threshold` (number, optional) - SLA threshold percentage (default: 99.9)

### 4. Add Role-Based User

Adds a new user with specified role to AlertSite.

**Parameters:**
- `username` (string) - Username for the new user
- `email` (string) - Email address of the user
- `firstName` (string) - First name of the user
- `lastName` (string) - Last name of the user
- `role` (enum) - Role: "admin", "user", "viewer", "monitor_manager"
- `password` (string, optional) - Password for the user (auto-generated if not provided)

### 5. Delete User

Deletes an existing user from AlertSite.

**Parameters:**
- `userId` (string) - User ID or username of the user to delete
- `force` (boolean, optional) - Force deletion even if user has active monitors (default: false)

## Error Handling

The client includes comprehensive error handling:

- **Configuration errors**: Throws if required environment variables are missing
- **Authentication errors**: Automatic token refresh on 401 responses
- **Network errors**: Detailed error messages with HTTP status codes
- **Token expiry**: Automatic refresh with 5-minute buffer before expiration

## Usage Examples

Once configured and running, you can use these tools through any MCP-compatible AI assistant:

```
Create a URL monitor for https://example.com named "Example Website" with 10-minute intervals
```

```
Run a performance test on demand for https://api.example.com from all locations
```

```
Create an SLA report for monitors 123,456,789 from 2024-01-01 to 2024-01-31 with 99.5% threshold
```

```
Add a new user with username "john.doe", email "john@example.com", role "user"
```

```
Delete user with ID "john.doe"
```