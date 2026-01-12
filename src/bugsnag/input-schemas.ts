import z from "zod";

const filterValueSchema = z.object({
  type: z.enum(["eq", "ne", "empty"]),
  value: z.union([z.string(), z.boolean(), z.number()]),
});

const filtersSchema = z.record(z.string(), z.array(filterValueSchema));

/**
 * A collection of input parameter schemas for reuse between tools.
 * Add new entries when common parameters are identified.
 */
export const toolInputParameters = {
  empty: z.object({}).describe("No parameters are required for this tool"),
  buildId: z.string().describe("Unique identifier of the app build"),
  errorId: z.string().describe("Unique identifier of the error"),
  eventId: z.string().describe("Unique identifier of the event"),
  projectId: z
    .string()
    .optional()
    .describe(
      "Unique identifier of the project. This is optional if a current project is set and is used to set the current project for BugSnag tools.",
    ),
  releaseId: z.string().describe("Unique identifier of the app release"),
  direction: z
    .enum(["asc", "desc"])
    .describe("Sort direction for ordering results")
    .default("desc"),
  performanceFilters: filtersSchema
    .describe(
      "Apply filters to narrow down the span group list. Use the List Trace Fields tool to discover available filter fields. " +
        "Time filters support extended ISO 8601 format (e.g. 2018-05-20T00:00:00Z) or relative format (e.g. 7d, 24h).",
    )
    .default({
      "span.since": [{ type: "eq", value: "7d" }],
    }),
  filters: filtersSchema
    .describe(
      "Apply filters to narrow down the error list. Use the List Project Event Filters tool to discover available filter fields. " +
        "Time filters support extended ISO 8601 format (e.g. 2018-05-20T00:00:00Z) or relative format (e.g. 7d, 24h).",
    )
    .default({
      "event.since": [{ type: "eq", value: "30d" }],
      "error.status": [{ type: "eq", value: "open" }],
    }),
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
      "Filter releases by this stage (e.g. production, staging), defaults to 'production'",
    )
    .default("production"),
  sort: z
    .enum(["first_seen", "last_seen", "events", "users", "unsorted"])
    .describe("Field to sort the errors by")
    .default("last_seen"),
  spanGroupId: z.string().describe("ID of the span group"),
};
