![BugSnag](https://assets.smartbear.com/m/3945e02cdc983893/original/BugSnag-Repository-Header-Light.svg)

The BugSnag client provides comprehensive error monitoring and debugging capabilities as listed below. Tools for BugSnag require a `BUGSNAG_AUTH_TOKEN`.

If you wish to interact with only one BugSnag project, we also recommend setting `BUGSNAG_PROJECT_API_KEY` to reduce the scope of the conversation. This allows the MCP server to pre-cache your project's custom filters for better filtering prompts.

## Available Tools

### List Projects

-   Lists the projects in your organization.
-   Only available when no project API key is configured.

### List Errors

-   Lists the open errors in the configured project with some basic details, taking an optional set of filters.
-   The project ID parameter is required if no project API key is configured.

### Get Error

-   Retrieves detailed information about the specified error.
-   In addition to the basic error details, it includes:
  -   Details of the latest event (occurrence) of the error – including stacktrace, user context and device information.
  -   Summaries (pivots) of the aggregated event data – for example app version, OS versions and any custom filters configured.
  -   Link to the error on the dashboard.
-   This tool also takes filter parameters in the same format as List Errors to specialize the results returned in the summaries/pivots.

### Get Event Details

-   Retrieve event (occurrence) details from a dashboard URL.
-   This is useful if you are copying the link from your dashboard to your IDE.

### List Project Event Filters

-   Lists the filters available for the current/specified project.
-   These filters can be used in the List Errors and Get Error tools to refine the results.

### Update Error

-   Allows you to update the status of the specified error to mark it as Open, Fixed, Ignored, Discarded or Undiscarded.
-   The severity can also be overridden from the default calculated value.

## Available Resources

### Event

Refers to an occurrence of an error: `bugsnag://event/{id}`.

## Configuration Notes

-   **Required Environment Variables**: `BUGSNAG_AUTH_TOKEN` is required for all operations.
-   **Optional Environment Variables**: `BUGSNAG_PROJECT_API_KEY` to scope operations to a single project and enable project-specific caching.
-   **Project Scoping**: When `BUGSNAG_PROJECT_API_KEY` is configured:
    -   The `list_bugsnag_projects` tool is not available (since you're already scoped to one project)
    -   The `projectId` parameter becomes optional for other tools
    -   Project event filters are pre-cached for better performance
-   **Filtering**: Use `get_project_event_filters` to discover available filter fields before using `list_bugsnag_project_errors`
-   **Time Filters**: Support both relative format (e.g., `7d`, `24h`) and ISO 8601 UTC format (e.g., `2018-05-20T00:00:00Z`)
-   **On-Premise Support**: Set the `BUGSNAG_ENDPOINT` environment variable to your custom endpoint if you're using an on-premise installation of BugSnag.
