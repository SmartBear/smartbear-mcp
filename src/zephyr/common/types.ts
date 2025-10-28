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

export const ZephyrProjectSchema = z.object({
  id: z.number().describe("The ID of the project in Zephyr."),
  jiraProjectId: z.number().describe("The ID of the project in Jira."),
  key: z.string(),
  enabled: z.boolean(),
});

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

export const TestCycleIdOrKeySchema = z
  .string()
  .regex(/^(\d+)|([A-Z][A-Z_0-9]+-R\d+)$/)
  .describe("The ID or Key of Zephyr test cycle.");

export const ReferenceSchema = z.object({
  id: z.number().describe("The ID of the resource."),
  self: z.string().url().describe("The API URL to get more resource details."),
});

export const JiraUserSchema = z.object({
  self: z
    .string()
    .url()
    .describe("Jira API URL to get more details about the user."),
  accountId: z.string().describe("The Atlassian account ID of the user."),
});

export const TypeSchema = z.enum(["COVERAGE", "RELATES", "BLOCKS"]);

export const IssueLinkSchema = z.object({
  self: z.string().url().describe("API URL for the issue link resource."),
  issueId: z.number().describe("ID of the linked issue."),
  id: z.number().describe("ID of the issue link."),
  target: z.string().url().describe("Target URL of the linked issue."),
  type: TypeSchema.describe("Type of the link (e.g., COVERAGE)."),
});

export const WebLinkSchema = z.object({
  self: z.string().url().describe("API URL for the web link resource."),
  description: z.string().nullable().describe("Description of the web link."),
  url: z.string().url().describe("URL of the web link."),
  id: z.number().describe("ID of the web link."),
  type: z.string().describe("Type of the web link."),
});

export const TestPlanLinkSchema = z.object({
  id: z.number().describe("ID of the test plan link."),
  self: z.string().url().describe("API URL for the test plan link resource."),
  type: z.string().describe("Type of the test plan link."),
  testPlanId: z.number().describe("ID of the test plan."),
  target: z.string().url().describe("Target URL of the test plan."),
});

export const TestCycleLinkSchema = z.object({
  self: z.string().url().describe("API URL for the links resource."),
  issues: z.array(IssueLinkSchema).describe("List of issue links."),
  webLinks: z.array(WebLinkSchema).describe("List of web links."),
  testPlans: z.array(TestPlanLinkSchema).describe("List of test plan links."),
});

export const TestCycleSchema = z.object({
  id: z.number().describe("The ID of the test cycle."),
  key: z.string().describe("The key of the test cycle."),
  name: z.string().describe("The name of the test cycle."),
  project: ReferenceSchema,
  jiraProjectVersion: ReferenceSchema.nullable(),
  status: ReferenceSchema,
  folder: ReferenceSchema.nullable().optional(),
  description: z.string().nullable().describe("Description of the test cycle."),
  plannedStartDate: z
    .string()
    .datetime()
    .nullable()
    .describe("Planned start date (ISO 8601)."),
  plannedEndDate: z
    .string()
    .datetime()
    .optional()
    .describe("Planned end date (ISO 8601)."),
  owner: JiraUserSchema.optional().describe(
    "Details about the Test Cycle owner",
  ),
  customFields: z
    .record(z.any())
    .nullable()
    .describe("Custom fields for the test cycle."),
  links: TestCycleLinkSchema.nullable(),
});
