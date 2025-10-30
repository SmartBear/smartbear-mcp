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

export const ReferenceSchema = z.object({
  id: z.number().describe("The ID of the resource"),
  self: z.string().url().describe("The API URL to get more resource details."),
});

export const JiraUserSchema = z.object({
  self: z
    .string()
    .url()
    .describe("Jira API URL to get more details about the user"),
  accountId: z.string().describe("The Atlassian account ID of the user."),
});

export const CustomFieldsSchema = z
  .record(z.any())
  .describe("Custom fields with dynamic keys and values.");

export const TypeSchema = z.enum(["COVERAGE", "RELATES", "BLOCKS"]);

export const IssueLinkSchema = ReferenceSchema.merge(
  z.object({
    issueId: z.number().describe("ID of the linked issue."),
    target: z.string().url().describe("Target URL of the linked issue."),
    type: TypeSchema.describe("Type of the link (e.g., COVERAGE)."),
  }),
);

export const WebLinkSchema = ReferenceSchema.merge(
  z.object({
    description: z.string().nullable().describe("Description of the web link."),
    url: z.string().url().describe("URL of the web link."),
    type: z.string().describe("Type of the web link."),
  }),
);

export const TestPlanLinkSchema = ReferenceSchema.merge(
  z.object({
    testPlanId: z.number().describe("ID of the test plan."),
    target: z.string().url().describe("Target URL of the test plan."),
    type: z.string().describe("Type of the test plan link."),
  }),
);

export const TestCycleLinksSchema = z.object({
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
  status: ReferenceSchema.nullable(),
  folder: ReferenceSchema.nullable(),
  description: z.string().nullable().describe("Description of the test cycle."),
  plannedStartDate: z
    .string()
    .datetime()
    .nullable()
    .describe("Planned start date (ISO 8601)."),
  plannedEndDate: z
    .string()
    .datetime()
    .nullable()
    .describe("Planned end date (ISO 8601)."),
  owner: JiraUserSchema.nullable().describe(
    "Details about the Test Cycle owner",
  ),
  customFields: CustomFieldsSchema.nullable().describe(
    "Custom fields for the test cycle.",
  ),
  links: TestCycleLinksSchema.nullable(),
});

export const TestCycleListSchema = createListSchema(TestCycleSchema);
export type TestCycleList = z.infer<typeof TestCycleListSchema>;
