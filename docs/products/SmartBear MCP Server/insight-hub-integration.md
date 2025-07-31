![insight-hub.png](./images/embedded/insight-hub.png)

The Insight Hub client provides comprehensive error monitoring and debugging capabilities as listed below. Tools for Insight Hub requires an `INSIGHT_HUB_AUTH_TOKEN`.

If you wish to interact with only one Insight Hub project, we also recommend setting `INSIGHT_HUB_PROJECT_API_KEY` to reduce the scope of the conversation. This allows the MCP server to pre-cache your project's custom filters for better filtering prompts.

## Available Tools

### `list_insight_hub_projects`

-   Purpose: List all projects within a specific organization.
-   Parameters: Organization ID (`orgId`).
-   Returns: Complete list of projects with metadata including project names, slugs, IDs, and configuration details.
-   Use case: Discovery of available projects for error investigation.

### `get_insight_hub_error`

-   Purpose: Retrieve detailed information about a specific error.
-   Parameters: Project ID (`projectId`) and Error ID (`errorId`).
-   Returns: Comprehensive error details including stack traces, occurrence patterns, affected users, and error metadata.
-   Use case: Deep analysis of specific errors for debugging and resolution.

### `get_insight_hub_error_latest_event`

-   Purpose: Retrieve detailed information about a specific error.
-   Parameters: Project ID (`projectId`) and Error ID (`errorId`).
-   Returns: Comprehensive error details including stack traces, occurrence patterns, affected users, and error metadata.
-   Use case: Deep analysis of specific errors for debugging and resolution.

### `get_insight_hub_error_latest_event`

-   Purpose: Fetch the most recent event/occurrence of a specific error.
-   Parameters: Error ID (`errorId`).
-   Returns: Latest event details with current context, user information, device data, and complete error payload.
-   Use case: Understanding the current state and recent occurrences of an error.

### `get_insight_hub_event_details`

-   Purpose: Extract event details directly from Insight Hub dashboard links.
-   Parameters: Full Insight Hub event URL (`link`).
-   Returns: Complete event information including breadcrumbs, user context, device information, and stack traces.
-   Use case: Quick analysis when working with shared Insight Hub links.

## Available Resources

### `insight_hub_orgs`

-   URI: `insighthub://orgs`
-   Purpose: List all organizations accessible with your authentication token.
-   Returns: Organization details including IDs, names, and access permissions..
-   Use case: Account overview and organization discovery.

### `insight_hub_event`

-   URI Template: `insighthub://event/{id}`.
-   Purpose: Direct access to event details by event ID.
-   Returns: Full event payload with debugging context.
-   Use case: Event-specific analysis and cross-referencing.