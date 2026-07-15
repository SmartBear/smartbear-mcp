import z from "zod";

/** Sprint filter item: board name + sprint name. */
const SprintFilter = z.object({
  boardName: z.string(),
  sprintName: z.string(),
});

/** Resolved test case reference sent to the API: internal UID + version number. */
export const TestCaseVersionRef = z.object({
  id: z.string(),
  versionNo: z.number().int(),
});

/**
 * Filter object for selecting test cases when linking to a requirement.
 * projectId is always auto-filled from the active project context.
 */
export const LinkTestCaseFilter = z.object({
  key: z.string().optional().describe("Test case key (e.g., 'SCRUM-TC-145')."),
  summary: z.string().optional().describe("Test case summary to filter by."),
  folderId: z.number().int().optional().describe("Folder ID to filter by."),
  description: z
    .string()
    .optional()
    .describe("Test case description to filter by."),
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
    .describe(
      "Creation date range as comma-separated start,end in dd/MMM/yyyy format (e.g., '01/Jan/2024,31/Jan/2024').",
    ),
  updatedOn: z
    .string()
    .optional()
    .describe(
      "Update date range as comma-separated start,end in dd/MMM/yyyy format.",
    ),
  labels: z.array(z.string()).optional().describe("Jira label names."),
  components: z.array(z.string()).optional().describe("Jira component names."),
  latestExecutionResult: z
    .array(z.string())
    .optional()
    .describe(
      "Latest execution results to filter by (e.g., ['passed', 'failed']).",
    ),
  fixVersions: z
    .array(z.string())
    .optional()
    .describe("Jira fix version names."),
  sprint: z
    .array(SprintFilter)
    .optional()
    .describe(
      "Sprint filters with boardName and sprintName (e.g., [{boardName:'board1', sprintName:'sprint1'}]).",
    ),
  status: z
    .array(z.string())
    .optional()
    .describe("Test case status names (e.g., ['To Do', 'In Progress'])."),
  priority: z
    .array(z.string())
    .optional()
    .describe("Priority names (e.g., ['High', 'Low'])."),
  estimatedTime: z
    .string()
    .optional()
    .describe("Estimated time filter in HH:MM:SS format."),
  requirementIds: z
    .array(z.number().int())
    .optional()
    .describe("Jira issue IDs of linked requirements."),
  excludeRequirementId: z
    .number()
    .int()
    .optional()
    .describe("Exclude test cases already linked to this requirement ID."),
  searchText: z
    .string()
    .optional()
    .describe("Free-text search across test case fields."),
  searchInFields: z
    .array(z.string())
    .optional()
    .describe("Fields to search in (e.g., ['summary', 'description'])."),
  filterId: z.number().int().optional().describe("Saved filter ID."),
  isAutomated: z.boolean().optional().describe("Filter automated test cases."),
  withChild: z
    .boolean()
    .optional()
    .describe("Include test cases in child folders."),
  aiGenerated: z
    .boolean()
    .optional()
    .describe("Filter AI-generated test cases."),
  excludeUids: z
    .array(z.string())
    .optional()
    .describe("Test case UIDs to exclude from the filter result."),
});

/**
 * Filter object for selecting test cases when unlinking from a requirement.
 * Subset of LinkTestCaseFilter — excludes link-only fields.
 */
export const UnlinkTestCaseFilter = z.object({
  key: z.string().optional().describe("Test case key."),
  summary: z.string().optional(),
  folderId: z.number().int().optional(),
  description: z.string().optional(),
  assignee: z.array(z.string()).optional(),
  reporter: z.array(z.string()).optional(),
  createdBy: z.array(z.string()).optional(),
  updatedBy: z.array(z.string()).optional(),
  createdOn: z.string().optional(),
  updatedOn: z.string().optional(),
  labels: z.array(z.string()).optional(),
  components: z.array(z.string()).optional(),
  latestExecutionResult: z.array(z.string()).optional(),
  fixVersions: z.array(z.string()).optional(),
  sprint: z.array(SprintFilter).optional(),
  status: z.array(z.string()).optional(),
  priority: z.array(z.string()).optional(),
  estimatedTime: z.string().optional(),
  requirementIds: z.array(z.number().int()).optional(),
  searchText: z.string().optional(),
  searchInFields: z.array(z.string()).optional(),
  filterId: z.number().int().optional(),
  isAutomated: z.boolean().optional(),
  excludeTestCases: z
    .array(z.object({ id: z.string(), versionNo: z.number().int() }))
    .optional()
    .describe("Test cases to exclude from the filter result."),
});

/** User-facing input for linking test cases to a requirement. */
export const LinkTestCasesToRequirementBody = z.object({
  requirementKey: z
    .string()
    .describe(
      "Jira requirement key (e.g., 'SCRUM-1'). Resolved to the internal Jira issue ID automatically.",
    ),
  testCaseKeys: z
    .array(z.string())
    .optional()
    .describe(
      "Test case keys to link (e.g., ['SCRUM-TC-1', 'SCRUM-TC-2']). Resolved to internal IDs and latest versions automatically. Provide this OR filter — not both.",
    ),
  filter: LinkTestCaseFilter.optional().describe(
    "Filter criteria to select test cases to link. Use instead of testCaseKeys when selecting by criteria. projectId is auto-filled from the active project context.",
  ),
  sort: z
    .string()
    .optional()
    .describe(
      "Sort order for filter results in 'field:asc|desc' format (e.g., 'key:asc'). Allowable fields: key, summary, created, updated, estimatedTime, status, priority, latestVersionNo, flakyScore, passRateScore.",
    ),
});

/** User-facing input for unlinking test cases from a requirement. */
export const UnlinkTestCasesFromRequirementBody = z.object({
  requirementKey: z
    .string()
    .describe(
      "Jira requirement key (e.g., 'SCRUM-1'). Resolved to the internal Jira issue ID automatically.",
    ),
  testCaseKeys: z
    .array(z.string())
    .optional()
    .describe(
      "Test case keys to unlink (e.g., ['SCRUM-TC-1', 'SCRUM-TC-2']). Resolved to internal IDs and latest versions automatically. Provide this OR filter — not both.",
    ),
  filter: UnlinkTestCaseFilter.optional().describe(
    "Filter criteria to select test cases to unlink. Use instead of testCaseKeys when selecting by criteria. projectId is auto-filled from the active project context.",
  ),
});

/** Response for link/unlink test cases ↔ requirement operations. */
export const RequirementTestCaseLinkResponse = z.object({
  requirementKey: z.string(),
  linked: z.literal(true).optional(),
  unlinked: z.literal(true).optional(),
});
