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

export const JiraProjectVersionSchema = z
  .object({
    id: z.number().describe("The ID of the Jira project version."),
    self: z.string().describe("The self link of the Jira project version."),
  })
  .nullable();

export const StatusSchema = z.object({
  id: z.number().describe("The ID of the status."),
  self: z.string().describe("The self link of the status."),
});

export const FolderSchema = z
  .object({
    id: z.number().describe("The ID of the folder."),
    self: z.string().describe("The self link of the folder."),
  })
  .nullable();

export const OwnerSchema = z.object({
  self: z.string().describe("The self link of the owner."),
  accountId: z.string().describe("The account ID of the owner."),
});

export const IssueSchema = z.object({
  self: z.string().describe("The self link of the issue."),
  issueId: z.number().describe("The ID of the issue."),
  id: z.number().describe("The ID of the issue."),
  target: z.string().describe("The target of the issue."),
  type: z.string().describe("The type of the issue."),
});

export const WebLinkSchema = z.object({
  self: z.string().describe("The self link of the web link."),
  description: z.string().describe("The description of the web link."),
  url: z.string().describe("The URL of the web link."),
  id: z.number().describe("The ID of the web link."),
  type: z.string().describe("The type of the web link."),
});

export const TestPlanSchema = z.object({
  id: z.number().describe("The ID of the test plan."),
  self: z.string().describe("The self link of the test plan."),
  type: z.string().describe("The type of the test plan."),
  testPlanId: z.number().describe("The ID of the test plan."),
  target: z.string().describe("The target of the test plan."),
});

export const TestCycleProjectSchema = z.object({
  id: z.number().describe("The ID of the project."),
  self: z.string().describe("The self link of the project."),
});

export const LinksSchema = z.object({
  self: z.string().describe("The self link of the test cycle."),
  issues: z.array(IssueSchema),
  webLinks: z.array(WebLinkSchema),
  testPlans: z.array(TestPlanSchema),
});

export const ZephyrTestCycleSchema = z.object({
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
    .describe("The description of the test cycle."),
  plannedStartDate: z
    .string()
    .optional()
    .nullable()
    .describe("The planned start date of the test cycle."),
  plannedEndDate: z
    .string()
    .optional()
    .nullable()
    .describe("The planned end date of the test cycle."),
  owner: OwnerSchema.optional(),
  customFields: z
    .record(z.any())
    .optional()
    .describe("Custom fields for the test cycle."),
  links: LinksSchema.optional(),
});

export type ZephyrTestCycle = z.infer<typeof ZephyrTestCycleSchema>;
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
export const ZephyrTestCycleListSchema = createListSchema(
  ZephyrTestCycleSchema,
);
export type ZephyrTestCycleList = z.infer<typeof ZephyrTestCycleListSchema>;
