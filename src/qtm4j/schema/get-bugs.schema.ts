/**
 * QTM4J Get Linked Bugs Schemas
 *
 * testCase level → POST /rest/api/latest/testcycles/{testCycleKey}/testcase-executions/{testCaseExecutionId}/defects
 * testStep level → POST /rest/api/latest/testcycles/{testCycleKey}/teststep-executions/{testStepExecutionId}/defects
 *
 * Returns the Jira bugs linked to a test case or test step execution, with optional priority
 * filtering and pagination. The test cycle key is used directly as the path parameter;
 * execution IDs are resolved from the cycle and test case keys (and, for steps, the step
 * sequence number) before the call. An empty page (total = 0) means no bugs are linked.
 */
import * as zod from "zod";
import { PAGINATION } from "../config/constants";

const testCycleKey = zod
  .string()
  .describe(
    "Test cycle key in the format '{PROJECT_KEY}-TR-{number}', e.g. 'SCRUM-TR-101'. " +
      "Used directly as the API path parameter.",
  );

const testCaseKey = zod
  .string()
  .describe(
    "Test case key in the format '{PROJECT_KEY}-TC-{number}', e.g. 'SCRUM-TC-145'.",
  );

const status = zod
  .array(zod.string())
  .optional()
  .describe(
    "Bug status names to filter by (e.g. ['To Do', 'In Progress']). Auto-resolved to numeric IDs; unresolvable names are skipped with a warning.",
  );

const priority = zod
  .array(zod.string())
  .optional()
  .describe(
    "Bug priority names to filter by (e.g. ['High', 'Medium']). Auto-resolved to numeric IDs from project context; unresolvable names are skipped with a warning.",
  );

const startAt = zod
  .number()
  .int()
  .min(PAGINATION.DEFAULT_START_AT)
  .default(PAGINATION.DEFAULT_START_AT)
  .describe(
    "Zero-based index of the first result to return (pagination offset).",
  );

const maxResults = zod
  .number()
  .int()
  .min(
    PAGINATION.MIN_ALLOWED_RESULTS,
    `maxResults must be between ${PAGINATION.MIN_ALLOWED_RESULTS} and ${PAGINATION.MAX_ALLOWED_RESULTS_LINKED_BUGS}.`,
  )
  .max(
    PAGINATION.MAX_ALLOWED_RESULTS_LINKED_BUGS,
    `maxResults must be between ${PAGINATION.MIN_ALLOWED_RESULTS} and ${PAGINATION.MAX_ALLOWED_RESULTS_LINKED_BUGS}.`,
  )
  .default(PAGINATION.DEFAULT_MAX_RESULTS_LINKED_BUGS)
  .describe(
    `Maximum number of bugs to return per page. Range ${PAGINATION.MIN_ALLOWED_RESULTS}–${PAGINATION.MAX_ALLOWED_RESULTS_LINKED_BUGS}; defaults to ${PAGINATION.DEFAULT_MAX_RESULTS_LINKED_BUGS}.`,
  );

const level = zod
  .string()
  .default("testcase_execution, teststep_execution")
  .describe(
    "Execution level filter. Default: 'testcase_execution, teststep_execution' (both levels). " +
      "Use 'testcase_execution' for test-case-level links only, 'teststep_execution' for step-level links only.",
  );

export const GetBugsFilter = zod
  .object({ priority, status })
  .describe(
    "Filter criteria for linked bugs. Omit to return all linked bugs. " +
      "priority and status names are resolved to numeric IDs; unresolvable names are skipped with a warning.",
  );

export const GetTestCaseBugsBody = zod.object({
  testCycleKey,
  testCaseKey,
  filter: GetBugsFilter.optional(),
  level,
  startAt,
  maxResults,
});

export const GetTestStepBugsBody = zod.object({
  testCycleKey,
  testCaseKey,
  testStepSeqNo: zod
    .number()
    .int()
    .positive("testStepSeqNo must be a positive integer.")
    .describe(
      "sequence number of the test step within the test case (e.g. 2 = the second step).",
    ),
  filter: GetBugsFilter.optional(),
  startAt,
  maxResults,
});

const BugStatusSchema = zod.looseObject({
  id: zod.number().describe("Numeric Jira status ID (e.g. 10000)."),
  name: zod.string().describe("Status display name (e.g. 'To Do', 'Done')."),
  color: zod
    .string()
    .nullable()
    .optional()
    .describe("Status colour for UI display."),
  description: zod
    .string()
    .nullable()
    .optional()
    .describe("Status description."),
  isDefault: zod
    .boolean()
    .nullable()
    .optional()
    .describe("Whether this is the workflow's default status."),
});

const BugPrioritySchema = zod.looseObject({
  id: zod.number().describe("Numeric Jira priority ID (e.g. 3)."),
  name: zod.string().describe("Priority display name (e.g. 'High', 'Medium')."),
  iconUrl: zod.string().optional().describe("URL of the priority icon."),
  description: zod
    .string()
    .nullable()
    .optional()
    .describe("Priority description."),
  priorityIconId: zod
    .number()
    .nullable()
    .optional()
    .describe("Internal priority icon ID."),
  isDefault: zod
    .boolean()
    .nullable()
    .optional()
    .describe("Whether this is the default priority."),
});

const BugIssueTypeSchema = zod.looseObject({
  id: zod.number().describe("Numeric Jira issue type ID (e.g. 10004)."),
  name: zod.string().describe("Issue type display name (e.g. 'Bug')."),
  url: zod.string().optional().describe("URL of the issue type icon."),
});

const LinkedBugItemSchema = zod.looseObject({
  id: zod.number().describe("Numeric Jira issue ID of the bug."),
  key: zod
    .string()
    .describe("Human-readable Jira issue key of the bug (e.g. 'PROJ-456')."),
  summary: zod.string().optional().describe("Bug summary (title)."),
  status: BugStatusSchema.optional().describe(
    "Current Jira workflow status of the bug.",
  ),
  priority: BugPrioritySchema.nullable()
    .optional()
    .describe("Bug priority. Null when no priority is set."),
  issueType: BugIssueTypeSchema.optional().describe("Bug issue type."),
  stepSeqNo: zod
    .number()
    .nullable()
    .optional()
    .describe(
      "step sequence number when the bug is linked at the test step level; null for test-case-level links.",
    ),
  level: zod
    .string()
    .optional()
    .describe("Link level: 'testcase_execution' or 'teststep_execution'."),
  parameterGroup: zod
    .number()
    .nullable()
    .optional()
    .describe(
      "Parameter set index for data-driven executions; null otherwise.",
    ),
});

export const GetBugsResponse = zod.object({
  startAt: zod
    .number()
    .describe("Zero-based index of the first item in this page."),
  maxResults: zod.number().describe("Page size applied to this response."),
  total: zod
    .number()
    .describe(
      "Total number of linked bugs matching the filter across all pages. 0 means none are linked.",
    ),
  data: zod
    .array(LinkedBugItemSchema)
    .describe("Linked bugs on the current page; empty when total is 0."),
});

export type GetTestCaseBugsBodyType = zod.infer<typeof GetTestCaseBugsBody>;
export type GetTestStepBugsBodyType = zod.infer<typeof GetTestStepBugsBody>;
export type GetBugsResponseType = zod.infer<typeof GetBugsResponse>;
