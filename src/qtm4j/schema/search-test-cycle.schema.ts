/**
 * QTM4J Search Test Cycles Schemas
 *
 * POST /rest/api/latest/testcycles/search
 *
 * Filter fields are sent in the POST body; pagination (startAt, maxResults),
 * field selection, and sort are URL query parameters.
 * projectId is auto-injected by the tool — never passed by the LLM.
 */
import { z } from "zod";
import { PAGINATION, SORT_DEFAULTS } from "../config/constants.ts";

// Date range format: "dd/MMM/yyyy,dd/MMM/yyyy" (case-sensitive month, e.g. "02/Apr/2026,15/May/2026")
const DATE_RANGE_REGEX =
  /^\d{2}\/[A-Z][a-z]{2}\/\d{4},\d{2}\/[A-Z][a-z]{2}\/\d{4}$/;
const DATE_RANGE_DESCRIPTION =
  "Inclusive date range. Format: 'dd/MMM/yyyy,dd/MMM/yyyy' e.g. '02/Apr/2026,15/May/2026'. " +
  "Month abbreviation is case-sensitive (Apr not apr or APR). Always provide two dates separated by a comma.";

const FIELDS_DESCRIPTION =
  "Fields to include in each result object. If omitted, server returns its default set " +
  "(NOTE: plannedStartDate and plannedEndDate are NOT in the default response — include them explicitly when needed). " +
  "Available fields: key, summary, description, status, priority, assignee, reporter, isAutomated, " +
  "plannedStartDate, plannedEndDate, labels, components, fixVersions, sprint, defectCount, " +
  "estimatedTime, actualTime, created, updated. " +
  "Example: ['key', 'summary', 'status', 'assignee', 'plannedStartDate', 'plannedEndDate']";

const TestCycleStatusSchema = z.looseObject({
  id: z.number().optional().describe("Numeric status ID"),
  name: z
    .string()
    .optional()
    .describe("Status display name e.g. 'In Progress'"),
  color: z.string().nullable().optional().describe("Hex color e.g. '#ffd351'"),
});

const TestCyclePrioritySchema = z.looseObject({
  id: z.number().optional().describe("Numeric priority ID"),
  name: z.string().optional().describe("Priority display name e.g. 'High'"),
  color: z.string().nullable().optional().describe("Hex color"),
});

const TestCycleLabelSchema = z.looseObject({
  id: z.number().optional(),
  name: z.string().optional(),
});

const TestCycleComponentSchema = z.looseObject({
  id: z.number().optional(),
  name: z.string().optional(),
});

export const SearchTestCycleFilter = z
  .object({
    projectId: z
      .number()
      .optional()
      .describe(
        "Numeric project ID. Auto-injected from active project context — do not provide.",
      ),
    status: z
      .array(z.string())
      .optional()
      .describe(
        "Status names to include (OR logic within array). Examples: ['In Progress', 'To Do']. " +
          "Common values: 'To Do', 'In Progress', 'Done'.",
      ),
    priority: z
      .array(z.string())
      .optional()
      .describe(
        "Priority names to include (OR logic within array). Examples: ['High'], ['High', 'Medium']. " +
          "Common values: 'High', 'Medium', 'Low'.",
      ),
    assignee: z
      .array(z.string())
      .optional()
      .describe(
        "Jira account IDs of assignees (OR logic within array). " +
          // biome-ignore lint/security/noSecrets: sample Jira account ID in docs, not a secret
          "Example: ['5b10a2844c20165700ede21f']. " +
          "Multiple IDs match test cycles assigned to any of them.",
      ),
    reporter: z
      .array(z.string())
      .optional()
      .describe(
        "Jira account IDs of reporters (OR logic within array). " +
          // biome-ignore lint/security/noSecrets: sample Jira account ID in docs, not a secret
          "Example: ['5b10a2844c20165700ede21f'].",
      ),
    folderId: z
      .number()
      .optional()
      .describe(
        "Folder ID to restrict results to (numeric). " +
          "Right-click a folder in QTM4J and select 'Copy Folder Id'.",
      ),
    labels: z
      .array(z.string())
      .optional()
      .describe(
        "Label names to include (OR logic within array). Example: ['Release_1', 'Sprint 1']. " +
          "Use exact label names as configured in the project.",
      ),
    components: z
      .array(z.string())
      .optional()
      .describe(
        "Component names to include (OR logic within array). Example: ['UI', 'Cloud']. " +
          "Use exact component names as configured in the project.",
      ),
    plannedStartDate: z
      .string()
      .regex(
        DATE_RANGE_REGEX,
        "Invalid format. Use dd/MMM/yyyy,dd/MMM/yyyy e.g. 02/Apr/2026,15/May/2026",
      )
      .optional()
      .describe(DATE_RANGE_DESCRIPTION),
    plannedEndDate: z
      .string()
      .regex(
        DATE_RANGE_REGEX,
        "Invalid format. Use dd/MMM/yyyy,dd/MMM/yyyy e.g. 02/Apr/2026,15/May/2026",
      )
      .optional()
      .describe(DATE_RANGE_DESCRIPTION),
    searchText: z
      .string()
      .optional()
      .describe(
        "Free-text search across key, summary, and description. Case-insensitive. Example: 'regression sprint'",
      ),
    createdOn: z
      .string()
      .regex(
        DATE_RANGE_REGEX,
        "Invalid format. Use dd/MMM/yyyy,dd/MMM/yyyy e.g. 01/May/2026,20/May/2026",
      )
      .optional()
      .describe(
        `Filter by creation date range (inclusive). ${DATE_RANGE_DESCRIPTION}`,
      ),
    updatedOn: z
      .string()
      .regex(
        DATE_RANGE_REGEX,
        "Invalid format. Use dd/MMM/yyyy,dd/MMM/yyyy e.g. 01/May/2026,21/May/2026",
      )
      .optional()
      .describe(
        "Filter by last-updated date range (inclusive). " +
          DATE_RANGE_DESCRIPTION,
      ),
    isAutomated: z
      .boolean()
      .optional()
      .describe(
        "Automation status filter: true = automated tests only, false = manual tests only. Omit to include both.",
      ),
    aiGenerated: z
      .boolean()
      .optional()
      .describe(
        "AI generation flag: true = AI-generated test cycles only, false = human-authored only. Omit to include both.",
      ),
  })
  .describe(
    "Filter criteria — multiple fields are combined with AND; multiple values within one field use OR.",
  );

export const SearchTestCycleBody = z.object({
  filter: SearchTestCycleFilter.optional(),
  fields: z.array(z.string()).optional().describe(FIELDS_DESCRIPTION),
  startAt: z
    .number()
    .min(0)
    .optional()
    .default(PAGINATION.DEFAULT_START_AT)
    .describe(
      "Zero-indexed offset for pagination (URL query param). Default: 0.",
    ),
  maxResults: z
    .number()
    .min(PAGINATION.MIN_ALLOWED_RESULTS)
    .max(PAGINATION.MAX_ALLOWED_RESULTS_TEST_CYCLES)
    .optional()
    .default(PAGINATION.DEFAULT_MAX_RESULTS_TEST_CYCLES)
    .describe(
      `Number of results per page (URL query param). Default: ${PAGINATION.DEFAULT_MAX_RESULTS_TEST_CYCLES}. Maximum: ${PAGINATION.MAX_ALLOWED_RESULTS_TEST_CYCLES}. ` +
        `To page through results, increment startAt by ${PAGINATION.DEFAULT_MAX_RESULTS_TEST_CYCLES} until startAt >= total.`,
    ),
  sort: z
    .string()
    .optional()
    .default(SORT_DEFAULTS.TEST_CYCLES)
    .describe(
      `Sort pattern sent as a URL query param. Format: 'fieldName:order'. Default: '${SORT_DEFAULTS.TEST_CYCLES}'. ` +
        "Order values: 'asc' (lowest/oldest first) or 'desc' (highest/newest first). " +
        "Sortable fields: key, summary, status, plannedStartDate, plannedEndDate, defectCount. " +
        "Examples: 'key:asc', 'plannedStartDate:desc'",
    ),
});

export const TestCycleSearchItemSchema = z.looseObject({
  id: z.string().describe("Internal UID of the test cycle"),
  key: z.string().describe("Human-readable key e.g. 'PROJ-TR-212'"),
  projectId: z.number().optional().describe("Numeric project ID"),
  summary: z.string().optional().describe("Test cycle name / title"),
  description: z.string().nullable().optional(),
  status: TestCycleStatusSchema.optional().describe(
    "Status object (empty {} when not requested)",
  ),
  priority: TestCyclePrioritySchema.optional().describe(
    "Priority object (empty {} when not requested)",
  ),
  assignee: z
    .string()
    .nullable()
    .optional()
    .describe("Assignee Jira account ID, or null if unassigned"),
  reporter: z.string().nullable().optional(),
  isAutomated: z.boolean().optional(),
  plannedStartDate: z.string().nullable().optional(),
  plannedEndDate: z.string().nullable().optional(),
  labels: z.array(TestCycleLabelSchema).nullable().optional(),
  components: z.array(TestCycleComponentSchema).nullable().optional(),
  fixVersions: z.array(z.any()).nullable().optional(),
  sprint: z.any().nullable().optional(),
  defectCount: z.number().nullable().optional(),
  estimatedTime: z.any().nullable().optional(),
  actualTime: z.any().nullable().optional(),
  created: z.any().optional(),
  updated: z.any().optional(),
  archived: z.boolean().optional(),
});

export const SearchTestCycleResponse = z.object({
  startAt: z.number().describe("Offset of this page"),
  maxResults: z.number().describe("Page size used for this response"),
  total: z.number().describe("Total matching test cycles across all pages"),
  data: z.array(TestCycleSearchItemSchema).describe("Test cycles on this page"),
});

export type SearchTestCycleResponseType = z.infer<
  typeof SearchTestCycleResponse
>;
