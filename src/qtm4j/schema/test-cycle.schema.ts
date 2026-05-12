import z from "zod";

/** Sprint filter item: board name + sprint name. */
const SprintFilter = z.object({
  boardName: z.string(),
  sprintName: z.string(),
});

/** Test case version reference for skip/exclude lists. */
const TestCaseVersionSkip = z.object({
  testCaseId: z.string(),
  version: z.number().int(),
});

/**
 * Filter object for selecting test cases when linking to a test cycle.
 * projectId is always auto-filled from the active project context.
 */
export const LinkToCycleTestCaseFilter = z.object({
  key: z.string().optional().describe("Test case key (e.g., 'SCRUM-TC-145')."),
  summary: z.string().optional().describe("Test case summary."),
  folderId: z.number().int().optional().describe("Folder ID."),
  description: z.string().optional().describe("Test case description."),
  assignee: z
    .array(z.string())
    .optional()
    .describe("Jira account IDs of assignees."),
  reporter: z
    .array(z.string())
    .optional()
    .describe("Jira account IDs of reporters."),
  createdBy: z
    .array(z.string())
    .optional()
    .describe("Jira account IDs of creators."),
  updatedBy: z
    .array(z.string())
    .optional()
    .describe("Jira account IDs of last updaters."),
  createdOn: z
    .string()
    .optional()
    .describe("Creation date range as 'dd/MMM/yyyy,dd/MMM/yyyy'."),
  updatedOn: z
    .string()
    .optional()
    .describe("Update date range as 'dd/MMM/yyyy,dd/MMM/yyyy'."),
  labels: z.array(z.string()).optional().describe("Jira label names."),
  components: z.array(z.string()).optional().describe("Jira component names."),
  latestExecutionResult: z
    .array(z.string())
    .optional()
    .describe("Latest execution results (e.g., ['passed', 'failed'])."),
  fixVersions: z
    .array(z.string())
    .optional()
    .describe("Jira fix version names."),
  sprint: z
    .array(SprintFilter)
    .optional()
    .describe("Sprint filters with boardName and sprintName."),
  status: z.array(z.string()).optional().describe("Test case status names."),
  priority: z
    .array(z.string())
    .optional()
    .describe("Priority names (e.g., ['High', 'Low'])."),
  isAutomated: z.boolean().optional().describe("Filter automated test cases."),
  archived: z.boolean().optional().describe("Filter archived test cases."),
  shareable: z.boolean().optional().describe("Filter shareable test cases."),
  estimatedTime: z
    .string()
    .optional()
    .describe("Estimated time in HH:MM:SS format."),
  requirementIds: z
    .array(z.number().int())
    .optional()
    .describe("Jira issue IDs of linked requirements."),
  requirementJQL: z
    .string()
    .optional()
    .describe("JQL to filter by linked requirements."),
  excludeRequirementId: z
    .number()
    .int()
    .optional()
    .describe("Exclude test cases linked to this requirement ID."),
  excludeCycleId: z
    .string()
    .optional()
    .describe("Exclude test cases already in this test cycle ID."),
  searchText: z
    .string()
    .optional()
    .describe("Free-text search across test case fields."),
  searchInFields: z
    .array(z.string())
    .optional()
    .describe("Fields to search in (e.g., ['summary', 'description'])."),
  filterId: z.number().int().optional().describe("Saved filter ID."),
  issueKeys: z
    .array(z.string())
    .optional()
    .describe("Jira issue keys to filter by."),
  withChild: z
    .boolean()
    .optional()
    .describe("Include test cases in child folders."),
  aiGenerated: z
    .boolean()
    .optional()
    .describe("Filter AI-generated test cases."),
  skipTestcase: z
    .array(z.number().int())
    .optional()
    .describe("Test case IDs to skip."),
  testCaseVersionIds: z
    .array(z.number().int())
    .optional()
    .describe("Specific test case version IDs to include."),
  excludeUids: z
    .array(z.string())
    .optional()
    .describe("Test case UIDs to exclude."),
  skipTestCaseVersions: z
    .array(TestCaseVersionSkip)
    .optional()
    .describe("Test case versions to skip (each with testCaseId and version)."),
  excludeTestCases: z
    .array(TestCaseVersionSkip)
    .optional()
    .describe(
      "Test case versions to exclude (each with testCaseId and version).",
    ),
});

/**
 * Filter object for selecting test cases when unlinking from a test cycle.
 */
export const UnlinkFromCycleTestCaseFilter = z.object({
  key: z.string().optional().describe("Test case key (e.g., 'SCRUM-TC-145')."),
  summary: z.string().optional(),
  searchText: z.string().optional(),
  description: z.string().optional(),
  assignee: z.array(z.string()).optional(),
  reporter: z.array(z.string()).optional(),
  labels: z.array(z.string()).optional(),
  components: z.array(z.string()).optional(),
  fixVersions: z.array(z.string()).optional(),
  sprint: z.array(SprintFilter).optional(),
  build: z.array(z.string()).optional().describe("Build names."),
  status: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  executionResult: z
    .array(z.string())
    .optional()
    .describe("Execution results (e.g., ['Pass', 'Fail', 'Blocked'])."),
  environment: z.array(z.string()).optional().describe("Environment names."),
  tcWithDefects: z
    .boolean()
    .optional()
    .describe("Filter test cases with defects."),
  estimatedTime: z.string().optional(),
  actualTime: z.string().optional(),
  testCaseStatus: z.string().optional().describe("Test case approval status."),
  executionAssignee: z
    .array(z.string())
    .optional()
    .describe("Jira account IDs of execution assignees."),
  requirementId: z
    .array(z.number().int())
    .optional()
    .describe("Requirement IDs linked to test cases."),
  isAutomated: z.boolean().optional(),
  searchInFields: z
    .array(z.string())
    .optional()
    .describe("Fields to search in (e.g., ['summary', 'description'])."),
  createdBy: z.array(z.string()).optional(),
  createdOn: z.string().optional(),
  updatedBy: z.array(z.string()).optional(),
  updatedOn: z.string().optional(),
  filterId: z.number().int().optional(),
  folderId: z.number().int().optional(),
  executedBy: z
    .string()
    .optional()
    .describe("Jira account ID of the user who executed the test case."),
  executionPlannedDate: z
    .string()
    .optional()
    .describe("Planned execution date."),
  aiGenerated: z.boolean().optional(),
  excludeTestCases: z
    .array(TestCaseVersionSkip)
    .optional()
    .describe("Test case versions to exclude from results."),
  skipTestCaseVersions: z
    .array(TestCaseVersionSkip)
    .optional()
    .describe("Test case versions to skip."),
});

/** User-facing input for linking test cases to a test cycle. */
export const LinkTestCasesToCycleBody = z.object({
  cycleKey: z
    .string()
    .describe(
      "Test Cycle key (e.g., 'SCRUM-CY-1'). Resolved to the internal cycle UID automatically.",
    ),
  testCaseKeys: z
    .array(z.string())
    .optional()
    .describe(
      "Test case keys to link (e.g., ['SCRUM-TC-1', 'SCRUM-TC-2']). Resolved to internal IDs and latest versions automatically. Provide this OR filter — not both.",
    ),
  filter: LinkToCycleTestCaseFilter.optional().describe(
    "Filter criteria to select test cases to link. projectId is auto-filled from the active project context.",
  ),
  sort: z
    .string()
    .optional()
    .describe(
      "Sort order in 'field:asc|desc' format (e.g., 'createdOn:desc'). Default is 'createdOn:desc'.",
    ),
  assignee: z
    .string()
    .optional()
    .describe("Jira account ID of the assignee for the linked executions."),
  environmentId: z
    .number()
    .int()
    .optional()
    .describe("Environment ID from 'Get all environments in a project'."),
  buildId: z
    .number()
    .int()
    .optional()
    .describe("Build ID from 'Get all builds in a project'."),
  actualTime: z
    .string()
    .optional()
    .describe("Actual time spent in HH:mm format (e.g., '02:30')."),
  startNewExecution: z
    .boolean()
    .optional()
    .describe("Start a new execution for linked test cases. Default is false."),
  executionPlannedDate: z
    .string()
    .optional()
    .describe(
      "Planned execution date in yyyy-MM-dd format (e.g., '2023-12-31').",
    ),
  qiGenerated: z
    .boolean()
    .optional()
    .describe("Flag indicating AI-generated test cases. Default is false."),
});

/** User-facing input for unlinking test cases from a test cycle. */
export const UnlinkTestCasesFromCycleBody = z.object({
  cycleKey: z
    .string()
    .describe(
      "Test Cycle key (e.g., 'SCRUM-CY-1'). Resolved to the internal cycle UID automatically.",
    ),
  testCaseKeys: z
    .array(z.string())
    .optional()
    .describe(
      "Test case keys to unlink (e.g., ['SCRUM-TC-1', 'SCRUM-TC-2']). Resolved to internal IDs and latest versions automatically. Provide this OR filter or unlinkAll — not combined.",
    ),
  unlinkAll: z
    .boolean()
    .optional()
    .describe(
      "If true, all test cases are unlinked from the cycle. Ignores testCaseKeys and filter.",
    ),
  filter: UnlinkFromCycleTestCaseFilter.optional().describe(
    "Filter criteria to select test cases to unlink. projectId is auto-filled from the active project context.",
  ),
});

/** Response for link/unlink test cases ↔ test cycle operations. */
export const TestCycleLinkResponse = z.object({
  cycleKey: z.string(),
  linked: z.literal(true).optional(),
  unlinked: z.literal(true).optional(),
});
