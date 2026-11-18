import { z } from "zod";

const filterValueSchema = z.object({
  type: z
    .enum(["eq", "ne", "empty"])
    .describe(
      "Comparison: 'eq' equals, 'ne' not equals, 'empty' matches when the field has no value (set 'value' to true, or false to match non-empty)",
    ),
  value: z
    .union([z.string(), z.boolean(), z.number()])
    .describe("Value to compare with"),
});

const filtersSchema = z.record(z.string(), z.array(filterValueSchema));

/**
 * A collection of input parameter schemas for reuse between tools.
 * Add new entries when common parameters are identified.
 */
export const toolInputParameters = {
  empty: z.object({}).describe("No parameters are required for this tool"),
  buildId: z
    .string()
    .describe(
      "ID of the app build. Get it from the 'builds' list returned by Get Release.",
    ),
  errorId: z
    .string()
    .describe(
      "ID of the error (a group of similar events). Get it from List Project Errors.",
    ),
  eventId: z
    .string()
    .describe(
      "ID of a single event (one occurrence of an error). Get it from Get Events on an Error, or from the 'event_id' parameter of a dashboard URL.",
    ),
  projectId: z
    .string()
    .optional()
    .describe(
      "The BugSnag project ID: an opaque 24-character hex string such as '515fb9337c1074f6fd000003'. " +
        "This is NOT the project name or slug (the 'my-project' part of a dashboard URL). Get it from the 'id' field returned by List Projects. " +
        "Optional if a current project is configured (see Get Current Project). When no project is configured, the project provided here becomes the current project for subsequent calls.",
    ),
  releaseId: z
    .string()
    .describe("ID of the release (release group). Get it from List Releases."),
  direction: z
    .enum(["asc", "desc"])
    .describe(
      "Sort direction: 'desc' (default) returns the highest/newest values first, 'asc' the lowest/oldest first",
    )
    .default("desc"),
  performanceFilters: filtersSchema
    .describe(
      "Filters for spans, as an object keyed by field name, where each value is an array of { type: 'eq' | 'ne' | 'empty', value }. Multiple filters are combined with AND. " +
        "Use the List Trace Fields tool to discover available filter fields. " +
        "Time filters support extended ISO 8601 format (e.g. 2018-05-20T00:00:00Z) or relative format (e.g. 7d, 24h). " +
        "If omitted this defaults to span.since=7d, so older spans are excluded - pass 'span.since' (e.g. 30d) to look further back.",
    )
    .default({
      "span.since": [{ type: "eq", value: "7d" }],
    }),
  filters: filtersSchema
    .describe(
      "Filters on event fields, as an object keyed by field name, where each value is an array of { type: 'eq' | 'ne' | 'empty', value }. Multiple filters are combined with AND. " +
        "Use the List Project Event Filters tool to discover available filter fields. " +
        "Time filters (event.since, event.before) support extended ISO 8601 format (e.g. 2018-05-20T00:00:00Z) or relative format (e.g. 7d, 24h). " +
        "If omitted this defaults to event.since=30d and error.status=open, so older events and errors that are not open are excluded. " +
        "Any filter you do not specify keeps its default, so pass 'event.since' to look further back or 'error.status' to include other statuses.",
    )
    .default({
      "event.since": [{ type: "eq", value: "30d" }],
      "error.status": [{ type: "eq", value: "open" }],
    }),
  // For tools that already target a single, specific error: no implicit time or status restriction.
  errorScopedFilters: filtersSchema
    .describe(
      "Optional filters on event fields, as an object keyed by field name, where each value is an array of { type: 'eq' | 'ne' | 'empty', value }. Multiple filters are combined with AND. " +
        "Use the List Project Event Filters tool to discover available filter fields. " +
        "Time filters (event.since, event.before) support extended ISO 8601 format (e.g. 2018-05-20T00:00:00Z) or relative format (e.g. 7d, 24h). " +
        "No filters are applied by default, so events of any age are included.",
    )
    .default({}),
  nextUrl: z
    .string()
    .describe(
      "URL for retrieving the next page of results. Use the value in the previous response to get the next page when more results are available. " +
        "Only values provided in the output from this tool can be used. Do not attempt to construct it manually.",
    )
    .optional(),
  page: z.number().describe("Page number to return (starts from 1)").default(1),
  perPage: z
    .number()
    .describe("How many results to return per page.")
    .min(1)
    .max(100)
    .default(30),
  releaseStage: z
    .string()
    .describe(
      "Only include releases from this release stage (e.g. production, staging, development). Defaults to 'production'",
    )
    .default("production"),
  sort: z
    .enum(["first_seen", "last_seen", "events", "users", "unsorted"])
    .describe(
      "Field to sort errors by: 'last_seen' (default), 'first_seen', 'events' (number of events), 'users' (number of users affected) or 'unsorted'",
    )
    .default("last_seen"),
  spanGroupId: z
    .string()
    .describe(
      "ID of the span group, e.g. '[HttpClient]GET-api.example.com'. Get it from List Span Groups and pass it as returned (do not URL-encode it).",
    ),
};
