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

export const ProjectKeySchema = z
  .string()
  .regex(/^[A-Z][A-Z_0-9]+$/)
  .describe(`Jira Project key. Must match pattern: [A-Z][A-Z_0-9]+`);

export const FolderIdSchema = z
  .number()
  .int()
  .min(1)
  .describe(`Folder ID. Must be an integer greater than or equal to 1.`);

export const JiraProjectVersionIdSchema = z
  .number()
  .int()
  .min(1)
  .describe(
    `JiraProjectVersion ID. Must be an integer greater than or equal to 1.`,
  );

export const TestCycleProjectSchema = z.object({
  id: z.number().describe("The ID of the project."),
  self: z.string().url().describe("API URL for the project resource."),
});

export const JiraProjectVersionSchema = z.object({
  id: z.number().describe("The ID of the Jira project version."),
  self: z
    .string()
    .url()
    .describe("API URL for the Jira project version resource."),
});

export const StatusSchema = z.object({
  id: z.number().describe("The ID of the status."),
  self: z.string().url().describe("API URL for the status resource."),
});

export const FolderSchema = z.object({
  id: z.number().describe("The ID of the folder."),
  self: z.string().url().describe("API URL for the folder resource."),
});

export const OwnerSchema = z.object({
  self: z.string().url().describe("API URL for the owner resource."),
  accountId: z.string().describe("Account ID of the owner."),
});

export const IssueLinkSchema = z.object({
  self: z.string().describe("API URL for the issue link resource."),
  issueId: z.number().describe("ID of the linked issue."),
  id: z.number().describe("ID of the issue link."),
  target: z.string().url().describe("Target URL of the linked issue."),
  type: z.string().describe("Type of the link (e.g., COVERAGE)."),
});

export const WebLinkSchema = z.object({
  self: z.string().describe("API URL for the web link resource."),
  description: z.string().describe("Description of the web link."),
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

export const LinksSchema = z.object({
  self: z.string().describe("API URL for the links resource."),
  issues: z.array(IssueLinkSchema).describe("List of issue links."),
  webLinks: z.array(WebLinkSchema).describe("List of web links."),
  testPlans: z.array(TestPlanLinkSchema).describe("List of test plan links."),
});

export const TestCycleSchema = z.object({
  id: z.number().describe("The ID of the test cycle."),
  key: z.string().describe("The key of the test cycle."),
  name: z.string().describe("The name of the test cycle."),
  project: TestCycleProjectSchema,
  jiraProjectVersion: JiraProjectVersionSchema.nullable().optional(),
  status: StatusSchema.optional(),
  folder: FolderSchema.nullable().optional(),
  description: z
    .string()
    .nullable()
    .optional()
    .describe("Description of the test cycle."),
  plannedStartDate: z
    .string()
    .datetime()
    .optional()
    .describe("Planned start date (ISO 8601)."),
  plannedEndDate: z
    .string()
    .datetime()
    .optional()
    .describe("Planned end date (ISO 8601)."),
  owner: OwnerSchema.optional(),
  customFields: z
    .record(z.any())
    .optional()
    .describe("Custom fields for the test cycle."),
  links: LinksSchema.optional(),
});

export const ZephyrTestCycleListSchema = createListSchema(TestCycleSchema);
export type ZephyrTestCycleList = z.infer<typeof ZephyrTestCycleListSchema>;
