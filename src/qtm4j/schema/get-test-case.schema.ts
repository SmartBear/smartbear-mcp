import { z } from "zod";
import { PAGINATION } from "../config/constants.ts";

const FIELDS_DESCRIPTION =
  "Fields to include in each result object. If omitted, all fields are returned. " +
  "Available fields: key, summary, description, priority, status, assignee, isAutomated, reporter, " +
  "estimatedTime, labels, components, fixVersions, sprint, folders, updated, created, executed, " +
  "flakyScore, passRateScore, aiGenerated, precondition, orderNo, seqNo, version. " +
  "Example: ['key', 'summary', 'status', 'priority', 'assignee']";

export const SearchTestCaseFilter = z
  .object({
    projectId: z
      .string()
      .optional()
      .describe(
        "Project ID as a numeric string (e.g. '10000'). Auto-populated from active project context if omitted.",
      ),
    searchText: z
      .string()
      .optional()
      .describe(
        "Free-text search across summary and description. Case-insensitive. Example: 'login functionality'",
      ),
    status: z
      .array(z.string())
      .optional()
      .describe(
        "Status names to include (OR logic within array). Examples: ['Done'], ['To Do', 'In Progress']. " +
          "Common values: 'Done', 'To Do', 'In Progress'.",
      ),
    priority: z
      .array(z.string())
      .optional()
      .describe(
        "Priority names to include (OR logic within array). Examples: ['High'], ['High', 'Medium']. " +
          "Common values: 'High', 'Medium', 'Low'.",
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
        "Component names to include (OR logic within array). Example: ['UI', 'Cloud', 'API']. " +
          "Use exact component names as configured in the project.",
      ),
    folders: z
      .array(z.number())
      .optional()
      .describe(
        "Folder IDs (numeric, OR logic within array). Example: [123, 456]. " +
          "Retrieve folder IDs from the project's folder structure.",
      ),
    assignee: z
      .array(z.string())
      .optional()
      .describe(
        "Jira account IDs of assignees (OR logic within array). " +
          "Example: ['712020:ddc8e24b-2de7-404b-b9ed-3d7b241e2ced']. " +
          "Multiple IDs match test cases assigned to any of them.",
      ),
    reporter: z
      .array(z.string())
      .optional()
      .describe(
        "Jira account IDs of reporters (OR logic within array). " +
          "Example: ['712020:b8479b55-6d23-478c-a2ad-4c8ce176e1fc'].",
      ),
    isAutomated: z
      .boolean()
      .optional()
      .describe(
        "Automation status filter: true = automated tests only, false = manual tests only. Omit to include both.",
      ),
    createdOnFrom: z
      .string()
      .optional()
      .describe(
        "Lower bound for creation date (inclusive). Format: 'dd/MMM/yyyy', e.g. '01/Jan/2026'.",
      ),
    createdOnTo: z
      .string()
      .optional()
      .describe(
        "Upper bound for creation date (inclusive). Format: 'dd/MMM/yyyy', e.g. '31/Dec/2026'.",
      ),
    updatedOnFrom: z
      .string()
      .optional()
      .describe(
        "Lower bound for last-updated date (inclusive). Format: 'dd/MMM/yyyy', e.g. '01/Apr/2026'.",
      ),
    updatedOnTo: z
      .string()
      .optional()
      .describe(
        "Upper bound for last-updated date (inclusive). Format: 'dd/MMM/yyyy', e.g. '30/Apr/2026'.",
      ),
    executedOnFrom: z
      .string()
      .optional()
      .describe(
        "Lower bound for last-execution date (inclusive). Format: 'dd/MMM/yyyy', e.g. '27/Apr/2026'.",
      ),
    executedOnTo: z
      .string()
      .optional()
      .describe(
        "Upper bound for last-execution date (inclusive). Format: 'dd/MMM/yyyy', e.g. '03/May/2026'.",
      ),
    fixVersions: z
      .array(z.number())
      .optional()
      .describe(
        "Fix version IDs (numeric, OR logic within array). Example: [789]. " +
          "Retrieve IDs from the project's fix version list.",
      ),
    sprint: z
      .array(z.number())
      .optional()
      .describe(
        "Sprint IDs (numeric, OR logic within array). Example: [10, 11]. " +
          "Retrieve IDs from the project's sprint list.",
      ),
    aiGenerated: z
      .boolean()
      .optional()
      .describe(
        "AI generation flag: true = AI-generated test cases only, false = human-authored only. Omit to include both.",
      ),
  })
  .describe(
    "Filter criteria — multiple fields are combined with AND; multiple values within one field use OR.",
  );

export const SearchTestCaseBody = z.object({
  filter: SearchTestCaseFilter.optional(),
  fields: z.array(z.string()).optional().describe(FIELDS_DESCRIPTION),
  startAt: z
    .number()
    .min(0)
    .optional()
    .default(PAGINATION.DEFAULT_START_AT)
    .describe(
      "Zero-indexed offset for pagination (URL query param). First page: 0. Second page: 50 (when maxResults=50). Default: 0.",
    ),
  maxResults: z
    .number()
    .min(PAGINATION.MIN_ALLOWED_RESULTS)
    .max(PAGINATION.MAX_ALLOWED_RESULTS_TEST_CASES)
    .optional()
    .default(PAGINATION.DEFAULT_MAX_RESULTS_TEST_CASES)
    .describe(
      "Number of results per page (URL query param). Default: 50. Maximum: 50 (backend enforced). " +
        "To page through results, increment startAt by 50 until startAt >= total.",
    ),
  sort: z
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

export const UserInfoSchema = z.object({
  createdBy: z.string().optional(),
  createdOn: z.string().optional(),
  updatedBy: z.string().optional(),
  updatedOn: z.string().optional(),
});

export const VersionSchema = z.object({
  isLatestVersion: z.boolean().optional(),
  versionNo: z.number().optional(),
});

export const StatusSchema = z.object({
  isArchive: z.boolean().optional(),
  color: z.string().optional(),
  name: z.string().optional(),
  id: z.number().optional(),
});

export const PrioritySchema = z.object({
  name: z.string().optional(),
  id: z.number().optional(),
});

export const LabelSchema = z.object({
  name: z.string().optional(),
  id: z.number().optional(),
});

export const ComponentSchema = z.object({
  name: z.string().optional(),
  id: z.number().optional(),
});

export const TestCaseSchema = z
  .object({
    id: z.string().describe("Internal test case ID"),
    key: z.string().describe("Test case key, e.g. 'SCRUM-TC-145'"),
    summary: z.string().describe("Test case title"),
    description: z.string().nullable().optional(),
    priority: PrioritySchema.optional(),
    status: StatusSchema.optional(),
    assignee: z.string().nullable().optional(),
    reporter: z.string().optional(),
    isAutomated: z.boolean().optional(),
    automated: z.boolean().optional(),
    estimatedTime: z.string().nullable().optional(),
    labels: z.array(LabelSchema).nullable().optional(),
    components: z.array(ComponentSchema).nullable().optional(),
    fixVersions: z.array(z.any()).nullable().optional(),
    sprint: z.any().nullable().optional(),
    folders: z.array(z.any()).nullable().optional(),
    created: z.any().optional(),
    updated: z.any().optional(),
    executed: z.string().nullable().optional(),
    flakyScore: z.number().nullable().optional(),
    passRateScore: z.number().nullable().optional(),
    aiGenerated: z.boolean().optional(),
    precondition: z.string().nullable().optional(),
    orderNo: z.number().nullable().optional(),
    seqNo: z.number().nullable().optional(),
    version: VersionSchema.optional(),
    projectId: z.number().optional(),
    shareable: z.boolean().optional(),
    archived: z.boolean().optional(),
  })
  .passthrough();

export const SearchTestCaseResponse = z.object({
  total: z
    .number()
    .describe("Total test cases matching the filter (across all pages)"),
  startAt: z.number().describe("Offset of this page"),
  maxResults: z.number().describe("Page size used for this response"),
  data: z.array(TestCaseSchema).describe("Test cases on this page"),
});

export type SearchTestCaseBodyType = z.infer<typeof SearchTestCaseBody>;
export type SearchTestCaseFilterType = z.infer<typeof SearchTestCaseFilter>;
export type SearchTestCaseResponseType = z.infer<typeof SearchTestCaseResponse>;
export type TestCaseType = z.infer<typeof TestCaseSchema>;
