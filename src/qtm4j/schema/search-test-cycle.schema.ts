/**
 * QTM4J Search Test Cycles Schemas
 *
 * POST /rest/api/latest/testcycles/search
 *
 * Filter fields are sent in the POST body; pagination (startAt, maxResults),
 * field selection, and sort are URL query parameters.
 * projectId is auto-injected by the tool — never passed by the LLM.
 */
import * as zod from "zod";
import { PAGINATION, SORT_DEFAULTS } from "../config/constants";

// Date range format: "dd/MMM/yyyy,dd/MMM/yyyy" (case-sensitive month, e.g. "02/Apr/2026,15/May/2026")
const DATE_RANGE_REGEX =
  /^\d{2}\/[A-Z][a-z]{2}\/\d{4},\d{2}\/[A-Z][a-z]{2}\/\d{4}$/;
const DATE_RANGE_DESCRIPTION =
  "Inclusive date range. Format: 'dd/MMM/yyyy,dd/MMM/yyyy' e.g. '02/Apr/2026,15/May/2026'. " +
  "Month abbreviation is case-sensitive (Apr not apr or APR). Always provide two dates separated by a comma.";

export const SearchTestCycleFilter = zod
  .object({
    projectId: zod
      .number()
      .optional()
      .describe(
        "Numeric project ID. Auto-injected from active project context — do not provide.",
      ),
    status: zod
      .array(zod.string())
      .optional()
      .describe(
        "Status names to include (OR logic). Example: ['In Progress', 'To Do']",
      ),
    priority: zod
      .array(zod.string())
      .optional()
      .describe(
        "Priority names to include (OR logic). Example: ['High', 'Medium']",
      ),
    assignee: zod
      .array(zod.string())
      .optional()
      .describe(
        "Jira account IDs of assignees (OR logic). Example: ['5b10a2844c20165700ede21f']",
      ),
    reporter: zod
      .array(zod.string())
      .optional()
      .describe(
        "Jira account IDs of reporters (OR logic). Example: ['5b10a2844c20165700ede21f']",
      ),
    folderId: zod
      .number()
      .optional()
      .describe(
        "Folder ID to restrict results to. Obtain from GET /testcycles/folders?projectId=<id>.",
      ),
    labels: zod
      .array(zod.string())
      .optional()
      .describe(
        "Label names to include (OR logic). Example: ['Release_1', 'Sprint 1']. Use exact label names.",
      ),
    components: zod
      .array(zod.string())
      .optional()
      .describe(
        "Component names to include (OR logic). Example: ['UI', 'Cloud']. Use exact component names.",
      ),
    plannedStartDate: zod
      .string()
      .regex(
        DATE_RANGE_REGEX,
        "Invalid format. Use dd/MMM/yyyy,dd/MMM/yyyy e.g. 02/Apr/2026,15/May/2026",
      )
      .optional()
      .describe(DATE_RANGE_DESCRIPTION),
    plannedEndDate: zod
      .string()
      .regex(
        DATE_RANGE_REGEX,
        "Invalid format. Use dd/MMM/yyyy,dd/MMM/yyyy e.g. 02/Apr/2026,15/May/2026",
      )
      .optional()
      .describe(DATE_RANGE_DESCRIPTION),
    searchText: zod
      .string()
      .optional()
      .describe(
        "Free-text keyword search across key, summary, and description. Case-insensitive.",
      ),
    createdOn: zod
      .string()
      .regex(
        DATE_RANGE_REGEX,
        "Invalid format. Use dd/MMM/yyyy,dd/MMM/yyyy e.g. 01/May/2026,20/May/2026",
      )
      .optional()
      .describe(
        `Filter by creation date range (inclusive). ${DATE_RANGE_DESCRIPTION}`,
      ),
    updatedOn: zod
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
    isAutomated: zod
      .boolean()
      .optional()
      .describe(
        "Automation status filter: true = automated only, false = manual only. Omit to include both.",
      ),
    aiGenerated: zod
      .boolean()
      .optional()
      .describe(
        "AI generation flag: true = AI-generated only, false = human-authored only. Omit to include both.",
      ),
  })
  .describe(
    "Filter criteria — fields are combined with AND; multiple values within one field use OR.",
  );

const FIELDS_DESCRIPTION =
  "Fields to include in each result object. If omitted, server returns its default set " +
  "(NOTE: plannedStartDate and plannedEndDate are NOT in the default response — include them explicitly when needed). " +
  "Available fields: key, summary, description, status, priority, assignee, reporter, isAutomated, " +
  "plannedStartDate, plannedEndDate, labels, components, fixVersions, sprint, defectCount, " +
  "estimatedTime, actualTime, created, updated. " +
  "Example: ['key', 'summary', 'status', 'assignee', 'plannedStartDate', 'plannedEndDate']";

export const SearchTestCycleBody = zod.object({
  filter: SearchTestCycleFilter.optional(),
  fields: zod.array(zod.string()).optional().describe(FIELDS_DESCRIPTION),
  startAt: zod
    .number()
    .min(0)
    .optional()
    .default(PAGINATION.DEFAULT_START_AT)
    .describe("Zero-based page offset. Default: 0."),
  maxResults: zod
    .number()
    .min(PAGINATION.MIN_ALLOWED_RESULTS)
    .max(PAGINATION.MAX_ALLOWED_RESULTS_TEST_CYCLES)
    .optional()
    .default(PAGINATION.DEFAULT_MAX_RESULTS_TEST_CYCLES)
    .describe(
      `Results per page. Default: ${PAGINATION.DEFAULT_MAX_RESULTS_TEST_CYCLES}. Maximum: ${PAGINATION.MAX_ALLOWED_RESULTS_TEST_CYCLES}.`,
    ),
  sort: zod
    .string()
    .optional()
    .default(SORT_DEFAULTS.TEST_CYCLES)
    .describe(
      `Sort expression. Format: '<fieldName>:<asc|desc>'. Default: '${SORT_DEFAULTS.TEST_CYCLES}'. ` +
        "Allowed fields: key, summary, status, plannedStartDate, plannedEndDate, defectCount. " +
        "Example: 'plannedStartDate:asc'",
    ),
});

const TestCycleStatusSchema = zod.looseObject({
  id: zod.number().optional().describe("Numeric status ID"),
  name: zod
    .string()
    .optional()
    .describe("Status display name e.g. 'In Progress'"),
  color: zod
    .string()
    .nullable()
    .optional()
    .describe("Hex color e.g. '#ffd351'"),
});

const TestCyclePrioritySchema = zod.looseObject({
  id: zod.number().optional().describe("Numeric priority ID"),
  name: zod.string().optional().describe("Priority display name e.g. 'High'"),
  color: zod.string().nullable().optional().describe("Hex color"),
});

const TestCycleLabelSchema = zod.looseObject({
  id: zod.number().optional(),
  name: zod.string().optional(),
});

const TestCycleComponentSchema = zod.looseObject({
  id: zod.number().optional(),
  name: zod.string().optional(),
});

export const TestCycleSearchItemSchema = zod.looseObject({
  id: zod.string().describe("Internal UID of the test cycle"),
  key: zod.string().describe("Human-readable key e.g. 'PROJ-TR-212'"),
  projectId: zod.number().optional().describe("Numeric project ID"),
  summary: zod.string().optional().describe("Test cycle name / title"),
  description: zod.string().nullable().optional(),
  status: TestCycleStatusSchema.optional().describe(
    "Status object (empty {} when not requested)",
  ),
  priority: TestCyclePrioritySchema.optional().describe(
    "Priority object (empty {} when not requested)",
  ),
  assignee: zod
    .string()
    .nullable()
    .optional()
    .describe("Assignee Jira account ID, or null if unassigned"),
  reporter: zod.string().nullable().optional(),
  isAutomated: zod.boolean().optional(),
  plannedStartDate: zod.string().nullable().optional(),
  plannedEndDate: zod.string().nullable().optional(),
  labels: zod.array(TestCycleLabelSchema).nullable().optional(),
  components: zod.array(TestCycleComponentSchema).nullable().optional(),
  fixVersions: zod.array(zod.any()).nullable().optional(),
  sprint: zod.any().nullable().optional(),
  defectCount: zod.number().nullable().optional(),
  estimatedTime: zod.any().nullable().optional(),
  actualTime: zod.any().nullable().optional(),
  created: zod.any().optional(),
  updated: zod.any().optional(),
  archived: zod.boolean().optional(),
});

export const SearchTestCycleResponse = zod.object({
  startAt: zod.number().describe("Offset of this page"),
  maxResults: zod.number().describe("Page size used for this response"),
  total: zod.number().describe("Total matching test cycles across all pages"),
  data: zod
    .array(TestCycleSearchItemSchema)
    .describe("Test cycles on this page"),
});

export type SearchTestCycleResponseType = zod.infer<
  typeof SearchTestCycleResponse
>;
