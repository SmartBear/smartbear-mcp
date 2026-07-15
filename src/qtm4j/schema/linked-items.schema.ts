import z from "zod";
import { PAGINATION } from "../config/constants.ts";
import { SearchTestCaseResponse } from "./get-test-case.schema.ts";

// ─── Get Linked Requirements ──────────────────────────────────────────────────

/** A single Jira requirement linked to a test case. */
const LinkedRequirementSchema = z
  .object({
    id: z.number().int().describe("Jira issue ID."),
    key: z.string().describe("Jira issue key (e.g., 'SCRUM-1')."),
    summary: z.string().optional().describe("Requirement summary."),
    status: z
      .object({
        id: z.number().optional(),
        name: z.string().optional(),
        iconUrl: z.string().optional(),
        color: z.string().optional(),
      })
      .optional(),
    priority: z
      .object({
        id: z.number().optional(),
        name: z.string().optional(),
        iconUrl: z.string().optional(),
      })
      .optional(),
    issueType: z
      .object({
        id: z.number().optional(),
        name: z.string().optional(),
        iconUrl: z.string().optional(),
      })
      .optional(),
    tcVersionNo: z
      .number()
      .int()
      .optional()
      .describe("Test case version this requirement is linked to."),
  })
  .passthrough();

/** Sprint filter item shared across requirement-linked test case queries. */
const SprintFilter = z.object({
  boardName: z.string(),
  sprintName: z.string(),
});

/** User-facing input for retrieving requirements linked to a test case. */
export const GetLinkedRequirementsBody = z.object({
  key: z
    .string()
    .describe(
      "Test case key in '{PROJECT_KEY}-TC-{number}' format (e.g., 'SCRUM-TC-145'). Required.",
    ),
  versionNo: z
    .number()
    .int()
    .optional()
    .describe(
      "Test case version number to retrieve linked requirements for. Defaults to the latest version.",
    ),
  maxResults: z
    .number()
    .int()
    .min(PAGINATION.MIN_ALLOWED_RESULTS)
    .max(PAGINATION.MAX_ALLOWED_RESULTS)
    .optional()
    .describe("Maximum results per page (1-100). Default: 50."),
  startAt: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Zero-indexed offset for pagination. Default: 0."),
  sort: z
    .string()
    .optional()
    .describe("Sort pattern in 'field:asc|desc' format. Default: 'key:desc'."),
});

/** Paginated response for linked requirements. */
export const GetLinkedRequirementsResponse = z.object({
  startAt: z.number().int(),
  maxResults: z.number().int(),
  total: z
    .number()
    .int()
    .describe("Total linked requirements (across all pages)."),
  data: z
    .array(LinkedRequirementSchema)
    .describe("Linked requirements on this page."),
});

// ─── Get Linked Test Cases for Requirement ────────────────────────────────────

/**
 * Filter object for retrieving test cases linked to a requirement.
 * projectId is always auto-filled from the active project context.
 */
export const GetLinkedTestCasesFilter = z.object({
  key: z.string().optional().describe("Test case key (e.g., 'SCRUM-TC-145')."),
  summary: z.string().optional(),
  folderId: z.number().int().optional().describe("Folder ID."),
  description: z.string().optional(),
  assignee: z
    .array(z.string())
    .optional()
    .describe("Jira account IDs of assignees."),
  reporter: z
    .array(z.string())
    .optional()
    .describe("Jira account IDs of reporters."),
  createdBy: z.array(z.string()).optional(),
  updatedBy: z.array(z.string()).optional(),
  createdOn: z
    .string()
    .optional()
    .describe("Date range 'dd/MMM/yyyy,dd/MMM/yyyy' for creation date."),
  updatedOn: z
    .string()
    .optional()
    .describe("Date range 'dd/MMM/yyyy,dd/MMM/yyyy' for last update date."),
  labels: z.array(z.string()).optional().describe("Jira label names."),
  components: z.array(z.string()).optional().describe("Jira component names."),
  testCaseStatus: z
    .string()
    .optional()
    .describe("Test case archive status: 'active', 'archived', or 'deleted'."),
  latestExecutionResult: z
    .array(z.string())
    .optional()
    .describe("Latest execution results (e.g., ['passed', 'failed'])."),
  fixVersions: z.array(z.string()).optional().describe("Fix version names."),
  sprint: z.array(SprintFilter).optional(),
  status: z.array(z.string()).optional().describe("Test case status names."),
  priority: z
    .array(z.string())
    .optional()
    .describe("Priority names (e.g., ['High', 'Low'])."),
  estimatedTime: z.string().optional(),
  requirementIds: z
    .array(z.number().int())
    .optional()
    .describe("Requirement IDs."),
  searchText: z.string().optional().describe("Free-text search."),
  searchInFields: z
    .array(z.string())
    .optional()
    .describe("Fields to search in (e.g., ['summary', 'description'])."),
  filterId: z.number().int().optional().describe("Saved filter ID."),
  isAutomated: z.boolean().optional(),
  aiGenerated: z.boolean().optional(),
});

/** User-facing input for retrieving test cases linked to a requirement. */
export const GetLinkedTestCasesForRequirementBody = z.object({
  requirementKey: z
    .string()
    .describe(
      "Jira requirement key (e.g., 'SCRUM-1'). Resolved to the internal Jira issue ID automatically.",
    ),
  filter: GetLinkedTestCasesFilter.optional().describe(
    "Optional filter to narrow down the linked test cases. projectId is auto-filled from the active project context.",
  ),
  fields: z
    .string()
    .optional()
    .describe(
      "Comma-separated field names to include in each result. Allowed: summary, priority, status, estimatedTime, executed, description, assignee, reporter, labels, components, fixVersions, sprint, isAutomated, folder, updated, created, seqNo, flakyScore, passRateScore.",
    ),
  maxResults: z
    .number()
    .int()
    .min(PAGINATION.MIN_ALLOWED_RESULTS)
    .max(PAGINATION.MAX_ALLOWED_RESULTS)
    .optional()
    .describe("Maximum results per page (1-100). Default: 50."),
  startAt: z
    .number()
    .int()
    .min(0)
    .optional()
    .describe("Zero-indexed offset for pagination. Default: 0."),
  sort: z
    .string()
    .optional()
    .describe(
      "Sort in 'field:asc|desc' format. Allowed fields: key, summary, created, updated, estimatedTime, status, priority, latestVersionNo, seqNo, flakyScore, passRateScore.",
    ),
});

/** SearchTestCaseResponse doubles as the linked test cases response shape. */
export const GetLinkedTestCasesResponse = SearchTestCaseResponse;
