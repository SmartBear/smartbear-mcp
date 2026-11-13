![BugSnag](https://assets.smartbear.com/m/3945e02cdc983893/original/BugSnag-Repository-Header-Light.svg)

The BugSnag client provides comprehensive error monitoring and debugging capabilities as listed below. Tools for BugSnag require a `BUGSNAG_AUTH_TOKEN`.

If you wish to interact with only one BugSnag project, we also recommend setting `BUGSNAG_PROJECT_API_KEY`. This makes that project the current project, so the `projectId` parameter becomes optional and you don't need to look up the project ID first.

## Common Parameters

Several parameters are shared by many tools and behave the same way everywhere.

- **Project ID (`projectId`)**: The BugSnag project ID, an opaque 24-character hex string such as `515fb9337c1074f6fd000003`. This is **not** the project name or slug. Get it from the `id` field returned by List Projects. Optional if a current project is configured; when none is configured, the project you provide becomes the current project for later calls.
- **Filters (`filters`)**: An object keyed by field name, where each value is an array of `{ type, value }`. `type` is `eq`, `ne` or `empty` (for `empty`, set `value` to `true`, or `false` to match non-empty). Multiple filters are combined with AND. Use List Project Event Filters (errors and events) or List Trace Fields (performance) to discover the available field names. Time filters support relative format (e.g. `7d`, `24h`) and ISO 8601 UTC format (e.g. `2018-05-20T00:00:00Z`).
- **Sort direction (`direction`)**: `desc` (default) returns the highest/newest values first, `asc` the lowest/oldest first.
- **Page size (`perPage`)**: Number of results per page, 1–100 (default 30).
- **Next page URL (`nextUrl`)**: The next URL returned by a previous response when more results are available. Use it exactly as returned; do not construct or modify it.

## Available Tools

### List Projects

`bugsnag_list_projects`

- **Purpose**: List the projects the current user has access to, or find the project matching an API key.
- **Parameters**:
  - optional project API key (`apiKey`) – the notifier API key found where the BugSnag SDK is configured; if provided, only the project with this key is returned
- **Returns**: A list of projects, each including its `id`, `name`, `slug` and `api_key`, and a count.
- **Use case**: Finding the project ID to use with other tools, from a project name, slug or API key.

### List Project Errors

`bugsnag_list_project_errors`

- **Purpose**: List errors in a project with basic details, optionally filtered and sorted.
- **Parameters**:
  - optional project ID (`projectId`)
  - optional filters (`filters`) – defaults to `event.since=30d` and `error.status=open`; set these filters explicitly to see fixed, ignored or snoozed errors, or older errors
  - optional sort field (`sort`) – one of `last_seen` (default), `first_seen`, `events`, `users` or `unsorted`
  - optional sort direction (`direction`)
  - optional page size (`perPage`)
  - optional next page URL (`nextUrl`)
- **Returns**: A list of errors in the `data` field, the number of results in the current page in `data_count`, the total across all pages in `total_count`, and a `next_url` when more results are available.
- **Use case**: Finding recent or high-impact errors, building error reports, or monitoring trends. If no errors are returned, widen `event.since` or change `error.status` before concluding there are none.

### Get Error

`bugsnag_get_error`

- **Purpose**: Retrieve detailed information about a specific error.
- **Parameters**:
  - optional project ID (`projectId`)
  - Error ID (`errorId`) – get it from List Project Errors
  - optional filters (`filters`) – restrict which events are used for the latest event and the summaries; no filters are applied by default, so events of any age are considered
- **Returns**:
  - Aggregated error details, including first and last seen.
  - Details of the latest event (occurrence) – including stacktrace, breadcrumbs, user context and device information. Thread traces are trimmed to keep the response small; use Get Event to retrieve them.
  - Summaries (pivots) of the aggregated event data – for example app version, OS versions and any custom filters configured.
  - A link to the error on the dashboard.
- **Use case**: Investigating a specific error in depth.

### Get Events on an Error

`bugsnag_get_events_on_an_error`

- **Purpose**: Retrieve the individual events (occurrences) that have grouped into an error, with complete details for each event.
- **Parameters**:
  - optional project ID (`projectId`)
  - Error ID (`errorId`) – get it from List Project Errors
  - optional filters (`filters`) – no filters are applied by default, so events of any age are returned
  - optional sort direction (`direction`)
  - optional page size (`perPage`) – keep it small when you only need a few events, because stack traces and metadata are included
  - optional next page URL (`nextUrl`)
- **Returns**: A list of events with stack trace, breadcrumbs, metadata and context, and a `next_url` when more are available.
- **Use case**: Comparing events to find commonalities or differences in stack traces, breadcrumbs and metadata.

### Get Event

`bugsnag_get_event`

- **Purpose**: Retrieve the details of a single event (occurrence) by ID.
- **Parameters**:
  - optional project ID (`projectId`)
  - Event ID (`eventId`) – get it from Get Events on an Error, or from the `event_id` parameter of a dashboard URL
- **Returns**: Complete event details including the stack trace (the error trace and other threads, if present), metadata and context.
- **Use case**: Looking at one event in full, including thread traces that are trimmed in Get Error.

### Get Event Details From Dashboard URL

`bugsnag_get_event_details_from_dashboard_url`

- **Purpose**: Retrieve event details from a BugSnag dashboard URL.
- **Parameters**:
  - Dashboard URL (`link`) – the full URL of an event, for example `https://app.bugsnag.com/<org-slug>/<project-slug>/errors/<errorId>?event_id=<eventId>`. It must contain the project slug in the path and the `event_id` query parameter.
- **Returns**: Complete event details including stack trace, metadata and context. The project slug is resolved for you, so you don't need to look up the project ID.
- **Use case**: Copying a link from your dashboard or a notification to your IDE.

### List Project Event Filters

`bugsnag_list_project_event_filters`

- **Purpose**: List the filter fields available for the current or specified project.
- **Parameters**:
  - optional project ID (`projectId`)
- **Returns**: A list of event fields, including each field's `display_id` (the name to use as a key in `filters`), whether it is custom, and its filter and pivot options.
- **Use case**: Discovering valid filter names (for example `error.status`, `event.since`, `user.email` or your own metadata) before using List Project Errors, Get Error or Get Events on an Error.

### Update Error

`bugsnag_update_error`

- **Purpose**: Change the workflow state of an error. These operations change the error for your whole team, so the assistant should confirm with you before applying them.
- **Parameters**:
  - optional project ID (`projectId`)
  - Error ID (`errorId`)
  - Operation (`operation`) – one of:
    - `open` – reopen the error
    - `fix` – mark it as fixed
    - `ignore` – ignore it until it is manually reopened
    - `snooze` – ignore it until the condition in `reopenRules` is met
    - `discard` / `undiscard` – stop storing new events for the error / resume storing them
    - `override_severity` – change its severity; you are asked to choose the new value
    - `link_issue` / `unlink_issue` – link the error to an external issue / remove that link
  - optional issue URL (`issue_url`) – required for `link_issue`, for example a Jira issue URL
  - optional reopen rules (`reopenRules`) – required for `snooze`:
    - Reopen condition (`reopenIf`) – one of `occurs_after`, `n_occurrences_in_m_hours`, `n_additional_occurrences` or `n_additional_users`
    - optional seconds (`seconds`) – for `occurs_after`, how long to snooze for
    - optional occurrences (`occurrences`) and hours (`hours`) – for `n_occurrences_in_m_hours`; both are required with this condition
    - optional additional occurrences (`additionalOccurrences`) – for `n_additional_occurrences`
    - optional additional users (`additionalUsers`) – for `n_additional_users`, from 1 to 100,000
- **Returns**: A success response describing the update that was applied.
- **Use case**: Marking errors as fixed or ignored, snoozing noisy errors, discarding unwanted errors, correcting severity, or linking errors to issues.

### List Releases

`bugsnag_list_releases`

- **Purpose**: List the releases of a project for a release stage.
- **Parameters**:
  - optional project ID (`projectId`)
  - optional release stage (`releaseStage`) – for example `production`, `staging` or `development`; defaults to `production`
  - optional visible only (`visibleOnly`) – if true, excludes releases hidden in the dashboard; defaults to false
  - optional page size (`perPage`)
  - optional next page URL (`nextUrl`)
- **Returns**: A list of release summaries with metadata, including the stability score and target information, and a URL for the next page when more are available.
- **Use case**: Reviewing the stability of recent releases.

### Get Release

`bugsnag_get_release`

- **Purpose**: Retrieve detailed information about a specific release.
- **Parameters**:
  - optional project ID (`projectId`)
  - Release ID (`releaseId`) – get it from List Releases
- **Returns**: Release details including source control information and metadata, and a summary of the builds that make up the release.
- **Use case**: Investigating a release, or finding the build IDs it contains.

### Get Build

`bugsnag_get_build`

- **Purpose**: Retrieve detailed information about a specific build.
- **Parameters**:
  - optional project ID (`projectId`)
  - Build ID (`buildId`) – get it from the builds returned by Get Release
- **Returns**: Build details including source control information and metadata, user and session stability (fractions between 0 and 1), and whether the build meets the project's target and critical stability.
- **Use case**: Checking the stability of a specific build.

### Get Current Project

`bugsnag_get_current_project`

- **Purpose**: Retrieve the currently configured project.
- **Parameters**: None.
- **Returns**: The current project, or no project if none has been set. The current project is set via the `BUGSNAG_PROJECT_API_KEY` environment variable or from project IDs provided to other tools.
- **Use case**: Checking whether other tools need an explicit project ID.

### List Span Groups

`bugsnag_list_span_groups`

- **Purpose**: List the span groups (operation types) tracked for performance.
- **Parameters**:
  - optional project ID (`projectId`)
  - optional sort field (`sort`) – for example `duration_p95` or `duration_p99` for the slowest operations, `total_spans` for the most frequently used, `last_seen` for the most recent. Other values include `name`, `display_name`, duration percentiles (p50–p99), CPU, memory and frame-rate percentiles, slow/frozen frame percentages, and HTTP 4xx/5xx percentages.
  - optional sort direction (`direction`)
  - optional page size (`perPage`)
  - optional starred only (`starredOnly`) – only include span groups starred as important in the dashboard
  - optional filters (`filters`) – span filters using trace fields; defaults to `span.since=7d`, so set `span.since` (for example `30d`) to look further back
  - optional next page URL (`nextUrl`)
- **Returns**: A list of span groups with their performance metrics.
- **Use case**: Finding slow or frequently used operations.

### Get Span Group

`bugsnag_get_span_group`

- **Purpose**: Retrieve detailed performance metrics for a span group.
- **Parameters**:
  - optional project ID (`projectId`)
  - Span group ID (`spanGroupId`) – for example `[HttpClient]GET-api.example.com`; get it from List Span Groups and pass it as returned, without URL-encoding
  - optional filters (`filters`) – span filters using trace fields; defaults to `span.since=7d`
- **Returns**: Statistics across multiple percentiles (p50, p75, p90, p95, p99), timeline and distribution data, the span count, and any registered performance targets for the operation.
- **Use case**: Analysing the performance of one operation.

### List Spans

`bugsnag_list_spans`

- **Purpose**: List the individual span instances belonging to a span group.
- **Parameters**:
  - optional project ID (`projectId`)
  - Span group ID (`spanGroupId`) – as for Get Span Group
  - optional sort field (`sort`) – for example `duration` for the slowest spans or `timestamp` for the newest. Other values include page load metrics (LCP, FID, CLS, TTFB, FCP), slow/frozen frame percentages, system metrics, frame rates and `http_response_code`.
  - optional sort direction (`direction`)
  - optional page size (`perPage`)
  - optional filters (`filters`) – span filters using trace fields; defaults to `span.since=7d`
  - optional next page URL (`nextUrl`)
- **Returns**: A list of spans, each including the trace ID to use with Get Trace.
- **Use case**: Investigating individual slow operations.

### Get Trace

`bugsnag_get_trace`

- **Purpose**: Retrieve all spans within a trace to view the complete execution path of a request or transaction.
- **Parameters**:
  - optional project ID (`projectId`)
  - Trace ID (`traceId`) – the trace ID of a span returned by List Spans
  - Start time (`from`) – start of the time window to search, ISO 8601 UTC; must be before the trace occurred
  - End time (`to`) – end of the time window to search, ISO 8601 UTC; must be after the trace occurred (use the span timestamp plus a few minutes)
  - optional target span ID (`targetSpanId`) – focus the results around this span
  - optional page size (`perPage`)
  - optional next page URL (`nextUrl`)
- **Returns**: The spans in the trace with their timing and hierarchy.
- **Use case**: Finding bottlenecks by examining the complete flow of a request through your system.

### List Trace Fields

`bugsnag_list_trace_fields`

- **Purpose**: List the custom attributes available for filtering performance data.
- **Parameters**:
  - optional project ID (`projectId`)
- **Returns**: A list of field names and types.
- **Use case**: Discovering valid filter names for List Span Groups, Get Span Group and List Spans.

### Get Network Endpoint Groupings

`bugsnag_get_network_endpoint_groupings`

- **Purpose**: Retrieve the network endpoint grouping rules for a project.
- **Parameters**:
  - optional project ID (`projectId`)
- **Returns**: The URL patterns used to consolidate similar network requests into single span groups.
- **Use case**: Checking the current patterns before updating them.

### Set Network Endpoint Groupings

`bugsnag_set_network_endpoint_groupings`

- **Purpose**: Configure the URL patterns that control how network spans are grouped in performance monitoring. This **replaces all existing patterns** for the project, so the assistant should call Get Network Endpoint Groupings first, send back the full list with your changes, and confirm with you before applying.
- **Parameters**:
  - optional project ID (`projectId`)
  - Endpoints (`endpoints`) – the array of URL patterns. Patterns use OpenAPI path templating with curly braces for path parameters (for example `/users/{userId}`). Wildcards (`*`) can be used in domains to match subdomains (for example `https://*.example.com`). Colon-prefixed parameters from frameworks like Express or React Router (for example `:userId`) are converted to `{userId}`.
- **Returns**: A success response confirming the update.
- **Use case**: Reducing span group clutter by grouping dynamic URLs.

## Available Resources

### Event

Refers to an occurrence of an error: `bugsnag://event/{id}`.

## Configuration Notes

- **Required Environment Variables**: `BUGSNAG_AUTH_TOKEN` is required for all operations.
- **Optional Environment Variables**: `BUGSNAG_PROJECT_API_KEY` to set the current project, and `BUGSNAG_ENDPOINT` for on-premise installations.
- **Project Scoping**: When `BUGSNAG_PROJECT_API_KEY` is configured:
  - The `projectId` parameter becomes optional for other tools, because the matching project is used as the current project.
  - `bugsnag_list_projects` is still available, so you can find other projects.
  - Without it, the first project ID provided to a tool becomes the current project for later calls.
- **Filtering**: Use `bugsnag_list_project_event_filters` to discover available filter fields before using `bugsnag_list_project_errors`.
- **Filter Defaults**: `bugsnag_list_project_errors` applies `event.since=30d` and `error.status=open` unless you override them. Tools that target a single error (`bugsnag_get_error`, `bugsnag_get_events_on_an_error`) apply no filters by default. The performance tools default to `span.since=7d`.
- **Time Filters**: Support both relative format (e.g., `7d`, `24h`) and ISO 8601 UTC format (e.g., `2018-05-20T00:00:00Z`).
- **On-Premise Support**: Set the `BUGSNAG_ENDPOINT` environment variable to your custom endpoint if you're using an on-premise installation of BugSnag.
