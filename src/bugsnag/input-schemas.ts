import z from "zod";

const filterValueSchema = z.object({
  type: z.enum(["eq", "ne", "empty"]),
  value: z.union([z.string(), z.boolean(), z.number()]),
});

/**
 * A collection of input parameter schemas for reuse between tools.
 * Add new entries when common parameters are identified.
 */
export const toolInputParameters = {
  errorId: z.string().describe("Unique identifier of the error"),
  sort: z
    .enum(["first_seen", "last_seen", "events", "users", "unsorted"])
    .describe("Field to sort the errors by")
    .default("last_seen"),
  direction: z
    .enum(["asc", "desc"])
    .describe("Sort direction for ordering results")
    .default("desc"),
  page: z.number().describe("Page number to return (starts from 1)").default(1),
  perPage: z
    .number()
    .describe("How many results to return per page.")
    .min(1)
    .max(100)
    .default(30),
  nextUrl: z
    .string()
    .describe(
      "URL for retrieving the next page of results. Use the value in the previous response to get the next page when more results are available. " +
        "Only values provided in the output from this tool can be used. Do not attempt to construct it manually.",
    )
    .optional(),
  projectId: z.string().describe("ID of the project"),
  filters: z
    .record(z.array(filterValueSchema))
    .describe(
      "Apply filters to narrow down the error list. Use the List Project Event Filters tool to discover available filter fields. " +
        "Time filters support extended ISO 8601 format (e.g. 2018-05-20T00:00:00Z) or relative format (e.g. 7d, 24h).",
    )
    .default({
      "event.since": [{ type: "eq", value: "30d" }],
      "error.status": [{ type: "eq", value: "open" }],
    }),
  releaseStage: z
    .string()
    .describe(
      "Filter releases by this stage (e.g. production, staging), defaults to 'production'",
    )
    .default("production"),
  releaseId: z.string().describe("ID of the release"),
  buildId: z.string().describe("ID of the build"),
};
