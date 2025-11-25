# AlertSite Integration

The AlertSite MCP client enables AI assistants to interact with SmartBear AlertSite monitoring platform through the Model Context Protocol.

## Overview

AlertSite is SmartBear's comprehensive website and web application monitoring solution. This MCP integration provides automated access to key AlertSite functionality including:

- Creating and managing URL monitors
- Running on-demand tests
- Generating SLA reports  
- Managing user accounts and permissions
- Monitoring performance and availability

## Configuration

### Environment Variables

The AlertSite client requires three environment variables:

```bash
export ALERTSITE_BASE_URL="https://api.alertsite.com"
export ALERTSITE_USERNAME="your_alertsite_username" 
export ALERTSITE_PASSWORD="your_alertsite_password"
```

### Authentication

The client uses OAuth 2.0 password flow:

1. **Token Acquisition**: Username and password are exchanged for an access token via `/api/token` endpoint
2. **Token Caching**: Access tokens are cached in memory with expiration tracking  
3. **Automatic Refresh**: Expired tokens are automatically refreshed on 401 responses
4. **Security Buffer**: Tokens are refreshed 5 minutes before expiration to prevent race conditions

## Available Tools

### 1. Create URL Monitor

Creates a new URL-based monitor to track website availability and performance.

**Use Cases:**
- Setting up monitoring for new websites or services
- Establishing baseline monitoring for critical business applications
- Creating monitors with custom intervals and alert configurations

**Input Parameters:**
- `name` (required): Descriptive name for the monitor
- `url` (required): Full URL to monitor (must be valid HTTP/HTTPS)
- `interval` (optional): Check interval in minutes (default: 15)
- `locations` (optional): Array of monitoring locations (default: all available)
- `alertEmail` (optional): Email address for alert notifications

**Example Usage:**
```
"Create a URL monitor named 'Production API' for https://api.mycompany.com with 5-minute intervals"
```

### 2. Run Test On Demand (TOD)

Executes immediate testing of a URL from specified locations without setting up permanent monitoring.

**Use Cases:**
- Troubleshooting reported issues
- Testing new deployments before going live
- Validating performance from different geographic locations
- One-time testing during maintenance windows

**Input Parameters:**
- `url` (required): URL to test
- `locations` (optional): Specific test locations (default: all available)
- `testType` (optional): Test type - "performance", "availability", or "full" (default: "availability")

**Example Usage:**
```
"Run a performance test on demand for https://checkout.mystore.com from US and Europe locations"
```

### 3. Create SLA Report

Generates Service Level Agreement reports showing uptime and performance metrics over specified time periods.

**Use Cases:**
- Monthly/quarterly SLA reporting for stakeholders
- Compliance documentation for contractual obligations
- Performance analysis and trend identification
- Customer-facing availability reports

**Input Parameters:**
- `monitorIds` (required): Array of monitor IDs to include
- `startDate` (required): Report start date (YYYY-MM-DD format)
- `endDate` (required): Report end date (YYYY-MM-DD format)
- `reportName` (optional): Custom report name
- `threshold` (optional): SLA threshold percentage (default: 99.9%)

**Example Usage:**
```
"Create an SLA report for monitors 12345,67890 from 2024-01-01 to 2024-03-31 with 99.5% threshold"
```

### 4. Add Role-Based User

Creates new user accounts with specific role-based permissions for AlertSite access.

**Use Cases:**
- Onboarding new team members
- Setting up customer access for managed monitoring
- Creating service accounts for integrations
- Establishing role-based access controls

**Input Parameters:**
- `username` (required): Unique username for login
- `email` (required): Valid email address
- `firstName` (required): User's first name
- `lastName` (required): User's last name  
- `role` (required): Role assignment - "admin", "user", "viewer", or "monitor_manager"
- `password` (optional): Custom password (auto-generated if not provided)

**Available Roles:**
- **admin**: Full system access and configuration
- **user**: Standard monitoring and reporting access
- **viewer**: Read-only access to monitors and reports
- **monitor_manager**: Can create/edit monitors but limited admin access

**Example Usage:**
```
"Add a new user with username 'john.smith', email 'john@company.com', role 'user'"
```

### 5. Delete User

Removes existing user accounts from AlertSite system.

**Use Cases:**
- Offboarding departing employees
- Cleaning up unused service accounts
- Removing compromised accounts
- Managing user lifecycle and access control

**Input Parameters:**
- `userId` (required): Username or user ID to delete
- `force` (optional): Force deletion even if user has active monitors (default: false)

**Safety Features:**
- Prevents accidental deletion of users with active monitors
- Force flag available for administrative cleanup
- Returns confirmation of deletion success

**Example Usage:**
```
"Delete user 'temp.contractor' with force enabled"
```

## Error Handling

The AlertSite client includes comprehensive error handling:

### Authentication Errors
- Invalid credentials result in clear error messages
- Automatic token refresh on expiration
- Graceful handling of authentication failures

### Network Errors  
- HTTP status codes included in error messages
- Retry logic for token refresh scenarios
- Timeout handling for slow responses

### Validation Errors
- Input parameter validation using Zod schemas
- URL format validation for monitor creation
- Email format validation for user management

### Common Error Scenarios

**Configuration Issues:**
```
Error: AlertSite client not configured
```
- Solution: Verify all required environment variables are set

**Authentication Failures:**
```
Error: AlertSite token request failed: 401 - Invalid credentials
```
- Solution: Check username and password are correct

**API Errors:**
```
Error: AlertSite API call failed: 403 - Insufficient permissions
```
- Solution: Verify user has appropriate role permissions

## Best Practices

### Security
- Store credentials in environment variables, never in code
- Use least-privilege roles for service accounts
- Regularly rotate passwords and review user access
- Monitor authentication logs for suspicious activity

### Monitoring Setup
- Use descriptive monitor names for easy identification
- Set appropriate check intervals based on criticality
- Configure multiple geographic locations for comprehensive coverage
- Establish meaningful alert thresholds

### Reporting
- Schedule regular SLA reports for stakeholder communication
- Maintain historical reports for trend analysis
- Use consistent date ranges for comparative analysis
- Include relevant monitors based on business impact

### User Management
- Follow consistent naming conventions for usernames
- Assign roles based on job function and access needs
- Document user permissions and review regularly
- Use force delete cautiously to prevent data loss

## Integration Examples

### Automated Monitoring Setup
```
"Create monitors for all URLs in our production environment with 5-minute intervals and alerts to ops@company.com"
```

### Incident Response
```
"Run availability tests for https://checkout.mystore.com from all locations - we're getting customer complaints"
```

### Compliance Reporting
```
"Generate monthly SLA reports for all customer-facing services with 99.9% threshold"
```

### Team Onboarding
```
"Add new team member Sarah Johnson (sarah.johnson@company.com) with monitor_manager role"
```

## Troubleshooting

### Connection Issues
1. Verify base URL is correct and accessible
2. Check network connectivity to AlertSite API
3. Confirm firewall rules allow HTTPS traffic

### Authentication Problems
1. Validate username and password are correct
2. Check if account is active and not locked
3. Verify account has API access permissions

### Permission Errors
1. Confirm user role has required permissions
2. Check if specific resources are accessible
3. Review AlertSite role assignments

### Tool-Specific Issues

**Monitor Creation Failures:**
- Verify URL is accessible and returns valid responses
- Check if monitor name conflicts with existing monitors
- Ensure sufficient license capacity for new monitors

**TOD Test Failures:**
- Confirm URL is publicly accessible
- Verify selected locations are available
- Check if URL requires authentication

**Report Generation Issues:**
- Validate date ranges are logical (start < end)
- Confirm monitor IDs exist and are accessible
- Check if sufficient data exists for date range

**User Management Problems:**
- Verify username is unique
- Check email format is valid
- Ensure role assignment is permitted

For additional support, consult the AlertSite API documentation or contact SmartBear support.