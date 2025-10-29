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

export const TestCaseKeySchema = z
  .string()
  .regex(/^[A-Z0-9]+-T\d+$/)
  .describe("The key of a Zephyr test case. Must match [A-Z0-9]+-T[0-9]+.");

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
export const TestCaseLabelsSchema = z.enum([
  "Regression",
  "Performance",
  "Automated",
]);

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

export const TestCaseLinksSchema = z.object({
  self: z.string().url().describe("API URL for the links resource."),
  issues: z.array(IssueLinkSchema).describe("List of issue links."),
  webLinks: z.array(WebLinkSchema).describe("List of web links."),
});

export const TestCaseSchema = z.object({
  id: z.number().describe("The ID of the test Case."),
  key: z.string().describe("The key of the test Case."),
  name: z.string().describe("The name of the test Case."),
  project: ReferenceSchema,
  createdOn: z.string().datetime().describe("Created on date (ISO 8601)."),
  objective: z.string().nullable().describe("Objective of the test Case."),
  precondition: z
    .string()
    .nullable()
    .describe("Precondition of the test Case."),
  estimatedTime: z
    .number()
    .nullable()
    .describe("Estimated time to execute the test Case in seconds."),
  labels: z
    .array(TestCaseLabelsSchema)
    .nullable()
    .describe("Labels associated with the test Case."),
  component: ReferenceSchema.nullable().describe("Component of the test Case."),
  priority: ReferenceSchema.describe("Priority of the test Case."),
  status: ReferenceSchema.nullable().describe(
    "Current status of the test Case.",
  ),
  folder: ReferenceSchema.nullable().describe(
    "Folder containing the test Case.",
  ),
  owner: JiraUserSchema.nullable().describe(
    "Details about the Test Case owner",
  ),
  testScript: z
    .object({
      self: z
        .string()
        .url()
        .describe("The API url for Test script or steps for the test Case."),
    })
    .nullable()
    .describe("Test script object for the test Case."),
  customFields: CustomFieldsSchema.nullable().describe(
    "Custom fields for the test Case.",
  ),
  links: TestCaseLinksSchema.nullable().describe(
    "Links associated with the test Case.",
  ),
});
