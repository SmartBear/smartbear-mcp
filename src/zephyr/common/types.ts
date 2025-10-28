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

export const TestExecutionStatusSchema = z.object({
  id: z
    .number()
    .describe("The unique identifier of the test execution status."),
  self: z
    .string()
    .url()
    .describe("API URL for this test execution status resource."),
});

export const IssueLinkSchema = z.object({
  self: z.string().url().describe("API URL for this issue link resource."),
  issueId: z
    .number()
    .describe("The unique identifier of the linked Jira issue."),
  id: z.number().describe("The unique identifier of the issue link."),
  target: z.string().url().describe("URL to the linked Jira issue."),
  type: z.string().describe("Type of the link, e.g., COVERAGE."),
});

export const LinksSchema = z.object({
  self: z.string().url().describe("API URL for this links resource."),
  issues: z.array(IssueLinkSchema).describe("List of linked Jira issues."),
});

export const CustomFieldsSchema = z
  .record(z.unknown())
  .describe(
    "Custom fields for the test execution, with dynamic keys and values.",
  );

export const ProjectReferenceSchema = z.object({
  id: z.number().describe("The unique identifier of the project."),
  self: z.string().url().describe("API URL for the project resource."),
});

export const TestCaseReferenceSchema = z.object({
  id: z.number().describe("The unique identifier of the test case."),
  self: z.string().url().describe("API URL for the test case resource."),
});

export const EnvironmentReferenceSchema = z.object({
  id: z.number().describe("The unique identifier of the environment."),
  self: z.string().url().describe("API URL for the environment resource."),
});

export const JiraProjectVersionReferenceSchema = z.object({
  id: z.number().describe("The unique identifier of the Jira project version."),
  self: z
    .string()
    .url()
    .describe("API URL for the Jira project version resource."),
});

export const TestCycleReferenceSchema = z.object({
  id: z.number().describe("The unique identifier of the test cycle."),
  self: z.string().url().describe("API URL for the test cycle resource."),
});

export const TestExecutionSchema = z.object({
  id: z.number().describe("The unique identifier of the test execution."),
  key: z.string().describe("The key of the test execution."),
  project: ProjectReferenceSchema.describe(
    "The project associated with this test execution.",
  ),
  testCase: TestCaseReferenceSchema.describe(
    "The test case associated with this test execution.",
  ),
  environment: EnvironmentReferenceSchema.describe(
    "The environment in which the test was executed.",
  )
    .nullable()
    .optional(),
  jiraProjectVersion: JiraProjectVersionReferenceSchema.describe(
    "The Jira project version associated with this test execution.",
  )
    .nullable()
    .optional(),
  testExecutionStatus: TestExecutionStatusSchema,
  actualEndDate: z
    .string()
    .describe(
      "The actual end date and time of the test execution in ISO 8601 format.",
    )
    .optional(),
  estimatedTime: z
    .number()
    .describe("The estimated time for the test execution in milliseconds.")
    .nullable()
    .optional(),
  executionTime: z
    .number()
    .describe("The actual execution time in milliseconds.")
    .nullable()
    .optional(),
  executedById: z
    .string()
    .describe("The user ID of the person who executed the test.")
    .nullable()
    .optional(),
  assignedToId: z
    .string()
    .describe("The user ID of the person assigned to the test execution.")
    .nullable()
    .optional(),
  comment: z
    .string()
    .describe("Comment about the test execution.")
    .nullable()
    .optional(),
  automated: z
    .boolean()
    .describe("Indicates if the test execution was automated.")
    .optional(),
  testCycle: TestCycleReferenceSchema.describe(
    "The test cycle associated with this test execution.",
  ).optional(),
  customFields: CustomFieldsSchema.nullable(),
  links: LinksSchema.optional(),
});

export const GetTestExecutionsResponseSchema = z.object({
  next: z
    .string()
    .nullable()
    .describe(
      "URL to the next page of results, or null if there are no more results.",
    ),
  nextStartAtId: z
    .number()
    .describe("The starting ID for the next page of results."),
  limit: z
    .number()
    .describe("The maximum number of results returned in this response."),
  values: z
    .array(TestExecutionSchema)
    .describe("List of test execution objects."),
});

export const TestExecutionsQueryValuesSchema = z.object({
  projectKey: z
    .string()
    .regex(/^[A-Z][A-Z_0-9]+$/)
    .describe("Jira project key filter (e.g., 'PROJ').")
    .optional(),
  testCycle: z
    .string()
    .regex(/^([0-9]+|.+-R[0-9]+)$/)
    .describe("Test cycle key filter (digits or key like 'PROJ-R1').")
    .optional(),
  testCase: z
    .string()
    .regex(/^([0-9]+|.+-T[0-9]+)$/)
    .describe("Test case key filter (digits or key like 'PROJ-T1').")
    .optional(),
  actualEndDateAfter: z
    .string()
    .datetime({ offset: true })
    .describe("Filter for 'Actual End Date' after the given time (ISO 8601).")
    .optional(),
  actualEndDateBefore: z
    .string()
    .datetime({ offset: true })
    .describe("Filter for 'Actual End Date' before the given time (ISO 8601).")
    .optional(),
  includeStepLinks: z
    .boolean()
    .describe(
      "If true, execution step issue links will be included in the response. Default: false.",
    )
    .optional(),
  jiraProjectVersionId: z
    .number()
    .int()
    .min(1)
    .describe("JiraProjectVersion ID filter (integer >= 1).")
    .optional(),
  onlyLastExecutions: z
    .boolean()
    .describe(
      "If true, includes only the last execution of each test cycle item and all ad-hoc test executions. Default: false.",
    )
    .optional(),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .describe("Maximum number of results to return (1-1000). Default: 10.")
    .optional(),
  startAtId: z
    .number()
    .int()
    .min(0)
    .describe(
      "Zero-indexed starting position for ID-based pagination. Default: 0.",
    )
    .optional(),
});
