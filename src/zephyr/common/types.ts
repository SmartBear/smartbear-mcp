import { type ZodTypeAny, z } from "zod";

export const MaxResultsSchema = z
  .number()
  .min(1)
  .max(1000)
  .describe(`
    Specifies the maximum number of results to return in a single call. The default value is 10, and the maximum value that can be requested is 1000.

    Note that the server may enforce a lower limit than requested, depending on resource availability or other internal constraints.
    If this happens, the result set may be truncated. Always check the maxResults value in the response to confirm how many results were actually returned.
  `);

export const StartAtSchema = z
  .number()
  .min(0)
  .max(1000000)
  .describe(`
    Zero-indexed starting position used to paginate through results. Defaults to 0.
  `);

export const ZephyrProjectKeySchema = z
  .string()
  .regex(/([A-Z][A-Z_0-9]+)/)
  .describe("A Jira project key.");

export const SingleLineTextSchema = z.string().min(1).max(255);

export const ZephyrProjectSchema = z.object({
  id: z.number().describe("The ID of the project in Zephyr."),
  jiraProjectId: z.number().describe("The ID of the project in Jira."),
  key: z.string(),
  enabled: z.boolean(),
});

export const ProjectIdOrKeySchema = z
  .string()
  .regex(/^(\d+)|([A-Z][A-Z_0-9]+)$/)
  .describe("The Zephyr project ID or Jira project key.");

export type ZephyrProject = z.infer<typeof ZephyrProjectSchema>;

export function createListSchema<T extends ZodTypeAny>(itemSchema: T) {
  return z.object({
    next: z
      .string()
      .nullable()
      .describe(
        "Returns a URL to the next page of results, or null if there are no more results.",
      ),
    startAt: StartAtSchema,
    maxResults: MaxResultsSchema,
    total: z.number().describe("The total number of items available."),
    isLast: z
      .boolean()
      .describe("Indicates if this is the last page of results."),
    values: z.array(itemSchema),
  });
}

export const ZephyrProjectListSchema = createListSchema(ZephyrProjectSchema);
export type ZephyrProjectList = z.infer<typeof ZephyrProjectListSchema>;

export const StatusSchema = z.object({
  id: z.number().describe("The ID of the status in Zephyr."),
  project: z.object({
    id: z.number().describe("The ID of the project in Zephyr."),
    self: z
      .string()
      .describe(
        "The URL to fetch more information about the project from Zephyr.",
      ),
  }),
  name: SingleLineTextSchema,
  description: SingleLineTextSchema.nullable(),
  index: z
    .number()
    .min(0)
    .describe(
      "The order index of the status. Starts from 0 and defines the position of the status in lists.",
    ),
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/)
    .describe("The color code of the status in hexadecimal format.")
    .nullable(),
  archived: z
    .boolean()
    .describe(
      "Indicates whether the status is archived. Archived statuses cannot be assigned to new test artifacts but remain associated with existing ones.",
    ),
  default: z
    .boolean()
    .describe(
      "Indicates whether the status is the default status for its type within the project. Default statuses are pre-selected when creating new test artifacts of that type.",
    ),
});

export const StatusListSchema = createListSchema(StatusSchema);
export type StatusList = z.infer<typeof StatusListSchema>;

export const StatusTypeSchema = z
  .enum(["TEST_CASE", "TEST_PLAN", "TEST_CYCLE", "TEST_EXECUTION"])
  .describe("The type of test artifact that the status applies to.");
