import * as zod from "zod";
import { PAGINATION } from "../config/constants.ts";

export const SearchTestCaseFilter = zod
  .object({
    projectId: zod
      .string()
      .optional()
      .describe(
        "Project ID as a numeric string (e.g. '10000'). Auto-populated from active project context if omitted.",
      ),
    searchText: zod
      .string()
      .optional()
      .describe(
        "Free-text search across summary and description. Case-insensitive. Example: 'login functionality'",
      ),
    status: zod
      .array(zod.string())
      .optional()
      .describe(
        "Status names to include (OR logic within array). Examples: ['Done'], ['To Do', 'In Progress']. " +
          "Common values: 'Done', 'To Do', 'In Progress'.",
      ),
    priority: zod
      .array(zod.string())
      .optional()
      .describe(
        "Priority names to include (OR logic within array). Examples: ['High'], ['High', 'Medium']. " +
          "Common values: 'High', 'Medium', 'Low'.",
      ),
    labels: zod
      .array(zod.string())
      .optional()
      .describe(
        "Label names to include (OR logic within array). Example: ['Release_1', 'Sprint 1']. " +
          "Use exact label names as configured in the project.",
      ),
    components: zod
      .array(zod.string())
      .optional()
      .describe(
        "Component names to include (OR logic within array). Example: ['UI', 'Cloud', 'API']. " +
          "Use exact component names as configured in the project.",
      ),
    folders: zod
      .array(zod.number())
      .optional()
      .describe(
        "Folder IDs (numeric, OR logic within array). Example: [123, 456]. " +
          "Retrieve folder IDs from the project's folder structure.",
      ),
    assignee: zod
      .array(zod.string())
      .optional()
      .describe(
        "Jira account IDs of assignees (OR logic within array). " +
          "Example: ['712020:ddc8e24b-2de7-404b-b9ed-3d7b241e2ced']. " +
          "Multiple IDs match test cases assigned to any of them.",
      ),
    reporter: zod
      .array(zod.string())
      .optional()
      .describe(
        "Jira account IDs of reporters (OR logic within array). " +
          "Example: ['712020:b8479b55-6d23-478c-a2ad-4c8ce176e1fc'].",
      ),
    isAutomated: zod
      .boolean()
      .optional()
      .describe(
        "Automation status filter: true = automated tests only, false = manual tests only. Omit to include both.",
      ),
    createdOnFrom: zod
      .string()
      .optional()
      .describe(
        "Lower bound for creation date (inclusive). Format: 'dd/MMM/yyyy', e.g. '01/Jan/2026'.",
      ),
    createdOnTo: zod
      .string()
      .optional()
      .describe(
        "Upper bound for creation date (inclusive). Format: 'dd/MMM/yyyy', e.g. '31/Dec/2026'.",
      ),
    updatedOnFrom: zod
      .string()
      .optional()
      .describe(
        "Lower bound for last-updated date (inclusive). Format: 'dd/MMM/yyyy', e.g. '01/Apr/2026'.",
      ),
    updatedOnTo: zod
      .string()
      .optional()
      .describe(
        "Upper bound for last-updated date (inclusive). Format: 'dd/MMM/yyyy', e.g. '30/Apr/2026'.",
      ),
    executedOnFrom: zod
      .string()
      .optional()
      .describe(
        "Lower bound for last-execution date (inclusive). Format: 'dd/MMM/yyyy', e.g. '27/Apr/2026'.",
      ),
    executedOnTo: zod
      .string()
      .optional()
      .describe(
        "Upper bound for last-execution date (inclusive). Format: 'dd/MMM/yyyy', e.g. '03/May/2026'.",
      ),
    fixVersions: zod
      .array(zod.number())
      .optional()
      .describe(
        "Fix version IDs (numeric, OR logic within array). Example: [789]. " +
          "Retrieve IDs from the project's fix version list.",
      ),
    sprint: zod
      .array(zod.number())
      .optional()
      .describe(
        "Sprint IDs (numeric, OR logic within array). Example: [10, 11]. " +
          "Retrieve IDs from the project's sprint list.",
      ),
    aiGenerated: zod
      .boolean()
      .optional()
      .describe(
        "AI generation flag: true = AI-generated test cases only, false = human-authored only. Omit to include both.",
      ),
  })
  .describe(
    "Filter criteria — multiple fields are combined with AND; multiple values within one field use OR.",
  );

const FIELDS_DESCRIPTION =
  "Fields to include in each result object. If omitted, all fields are returned. " +
  "Available fields: key, summary, description, priority, status, assignee, isAutomated, reporter, " +
  "estimatedTime, labels, components, fixVersions, sprint, folders, updated, created, executed, " +
  "flakyScore, passRateScore, aiGenerated, precondition, orderNo, seqNo, version. " +
  "Example: ['key', 'summary', 'status', 'priority', 'assignee']";

export const SearchTestCaseBody = zod.object({
  filter: SearchTestCaseFilter.optional(),
  fields: zod.array(zod.string()).optional().describe(FIELDS_DESCRIPTION),
  startAt: zod
    .number()
    .min(0)
    .optional()
    .default(PAGINATION.DEFAULT_START_AT)
    .describe(
      "Zero-indexed offset for pagination (URL query param). First page: 0. Second page: 50 (when maxResults=50). Default: 0.",
    ),
  maxResults: zod
    .number()
    .min(PAGINATION.MIN_ALLOWED_RESULTS)
    .max(PAGINATION.MAX_ALLOWED_RESULTS_TEST_CASES)
    .optional()
    .default(PAGINATION.DEFAULT_MAX_RESULTS_TEST_CASES)
    .describe(
      "Number of results per page (URL query param). Default: 50. Maximum: 50 (backend enforced). " +
        "To page through results, increment startAt by 50 until startAt >= total.",
    ),
  sort: zod
    .string()
    .optional()
    .describe(
      "Sort pattern sent as a URL query param. Format: 'fieldName:order'. " +
        "For multiple fields, comma-separate: 'priority:asc,created:desc'. " +
        "Order values: 'asc' (oldest/lowest first) or 'desc' (newest/highest first). " +
        "Sortable fields: key, summary, created, updated, status, priority, executed. " +
        "Examples: 'created:desc', 'key:asc', 'priority:desc,created:asc'",
    ),
});

export const UserInfoSchema = zod.object({
  createdBy: zod.string().optional(),
  createdOn: zod.string().optional(),
  updatedBy: zod.string().optional(),
  updatedOn: zod.string().optional(),
});

export const VersionSchema = zod.object({
  isLatestVersion: zod.boolean().optional(),
  versionNo: zod.number().optional(),
});

export const StatusSchema = zod.object({
  isArchive: zod.boolean().optional(),
  color: zod.string().optional(),
  name: zod.string().optional(),
  id: zod.number().optional(),
});

export const PrioritySchema = zod.object({
  name: zod.string().optional(),
  id: zod.number().optional(),
});

export const LabelSchema = zod.object({
  name: zod.string().optional(),
  id: zod.number().optional(),
});

export const ComponentSchema = zod.object({
  name: zod.string().optional(),
  id: zod.number().optional(),
});

export const TestCaseSchema = zod
  .object({
    id: zod.string().describe("Internal test case ID"),
    key: zod.string().describe("Test case key, e.g. 'SCRUM-TC-145'"),
    summary: zod.string().describe("Test case title"),
    description: zod.string().nullable().optional(),
    priority: PrioritySchema.optional(),
    status: StatusSchema.optional(),
    assignee: zod.string().nullable().optional(),
    reporter: zod.string().optional(),
    isAutomated: zod.boolean().optional(),
    automated: zod.boolean().optional(),
    estimatedTime: zod.string().nullable().optional(),
    labels: zod.array(LabelSchema).nullable().optional(),
    components: zod.array(ComponentSchema).nullable().optional(),
    fixVersions: zod.array(zod.any()).nullable().optional(),
    sprint: zod.any().nullable().optional(),
    folders: zod.array(zod.any()).nullable().optional(),
    created: zod.any().optional(),
    updated: zod.any().optional(),
    executed: zod.string().nullable().optional(),
    flakyScore: zod.number().nullable().optional(),
    passRateScore: zod.number().nullable().optional(),
    aiGenerated: zod.boolean().optional(),
    precondition: zod.string().nullable().optional(),
    orderNo: zod.number().nullable().optional(),
    seqNo: zod.number().nullable().optional(),
    version: VersionSchema.optional(),
    projectId: zod.number().optional(),
    shareable: zod.boolean().optional(),
    archived: zod.boolean().optional(),
  })
  .passthrough();

export const SearchTestCaseResponse = zod.object({
  total: zod
    .number()
    .describe("Total test cases matching the filter (across all pages)"),
  startAt: zod.number().describe("Offset of this page"),
  maxResults: zod.number().describe("Page size used for this response"),
  data: zod.array(TestCaseSchema).describe("Test cases on this page"),
});

export type SearchTestCaseBodyType = zod.infer<typeof SearchTestCaseBody>;
export type SearchTestCaseFilterType = zod.infer<typeof SearchTestCaseFilter>;
export type SearchTestCaseResponseType = zod.infer<
  typeof SearchTestCaseResponse
>;
export type TestCaseType = zod.infer<typeof TestCaseSchema>;
