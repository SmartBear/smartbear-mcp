![insight-hub.png](./images/embedded/insight-hub.png)

The Insight Hub client provides comprehensive error monitoring and debugging capabilities as listed below. Tools for Insight Hub requires an `INSIGHT_HUB_AUTH_TOKEN`.

If you wish to interact with only one Insight Hub project, we also recommend setting `INSIGHT_HUB_PROJECT_API_KEY` to reduce the scope of the conversation. This allows the MCP server to pre-cache your project's custom filters for better filtering prompts.

## Available Tools

### `list_insight_hub_projects`

-   Purpose: List all projects in the organization with optional pagination.
-   Parameters: `page_size` (optional number), `page` (optional number).
-   Returns: JSON object with `data` array containing projects and `count` field.
-   Use case: Browse available projects when no specific project API key is configured, find project IDs for other tools.
-   Note: Only available when no project API key is configured.

### `get_insight_hub_error`

-   Purpose: Get full details on an error, including aggregated data across all events and details of the latest event.
-   Parameters: `errorId` (required string), `projectId` (optional if project API key configured), `filters` (optional FilterObject).
-   Returns: JSON object containing error_details, latest_event, pivots, and dashboard URL.
-   Use case: Investigate specific errors, understand affected users, get debugging context.

### `get_insight_hub_event_details`

-   Purpose: Extract event details directly from Insight Hub dashboard links.
-   Parameters: `link` (required string) - Full Insight Hub event URL.
-   Returns: Complete event information including breadcrumbs, user context, device information, and stack traces.
-   Use case: Quick analysis when working with shared Insight Hub links.

### `list_insight_hub_project_errors`

-   Purpose: List and search errors in a project using customizable filters.
-   Parameters: `filters` (optional FilterObject), `projectId` (optional if project API key configured).
-   Returns: JSON object with `data` array containing errors and `count` field.
-   Use case: Debug recent errors, generate reports, monitor trends, find errors affecting specific users or environments.

### `get_project_event_filters`

-   Purpose: Get available event filter fields for the current project.
-   Parameters: None.
-   Returns: JSON array of EventField objects with display_id, custom flag, and filter options.
-   Use case: Discover valid filter field names before using list_insight_hub_project_errors.

### `update_error`

-   Purpose: Update the status of an error in Insight Hub.
-   Parameters: `errorId` (required string), `operation` (required string), `projectId` (optional if project API key configured).
-   Returns: Success response indicating the operation was completed.
-   Use case: Mark errors as fixed, open, ignored, discarded, or undiscarded; update error severity.
-   Operations: `override_severity`, `open`, `fix`, `ignore`, `discard`, `undiscard`.

## Available Resources

### `insight_hub_event`

-   URI Template: `insighthub://event/{id}`.
-   Purpose: Direct access to event details by event ID.
-   Returns: Full event payload with debugging context including breadcrumbs, user information, and stack traces.
-   Use case: Event-specific analysis and cross-referencing when you have an event ID.

## Configuration Notes

-   **Required Environment Variables**: `INSIGHT_HUB_AUTH_TOKEN` is required for all operations.
-   **Optional Environment Variables**: `INSIGHT_HUB_PROJECT_API_KEY` to scope operations to a single project and enable project-specific caching.
-   **Project Scoping**: When `INSIGHT_HUB_PROJECT_API_KEY` is configured:
    -   The `list_insight_hub_projects` tool is not available (since you're already scoped to one project)
    -   The `projectId` parameter becomes optional for other tools
    -   Project event filters are pre-cached for better performance
-   **Filtering**: Use `get_project_event_filters` to discover available filter fields before using `list_insight_hub_project_errors`
-   **Time Filters**: Support both relative format (e.g., `7d`, `24h`) and ISO 8601 UTC format (e.g., `2018-05-20T00:00:00Z`)

