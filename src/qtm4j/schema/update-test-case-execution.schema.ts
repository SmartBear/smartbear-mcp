/**
 * QTM4J Update Test Case Execution Schema
 *
 * PUT /rest/api/latest/testcycles/{testCycleKey}/testcase-executions/{testCaseExecutionId}
 *
 * Updates an existing test case execution. The test cycle key is used directly as the
 * path parameter; testCaseExecutionId is resolved from testCycleKey + testCaseKey via
 * the execution-context resolver before the call.
 * At least one updatable field must be supplied.
 */
import * as zod from "zod";

/** dd/MMM/yyyy — e.g. "15/Oct/2025" (case-sensitive 3-letter month) */
const DATE_REGEX = /^\d{2}\/[A-Z][a-z]{2}\/\d{4}$/;
/** HH:mm:ss — matches backend regex ^\d+:[0-5]\d:[0-5]\d$ (e.g. "01:30:00") */
const ACTUAL_TIME_REGEX = /^\d+:[0-5]\d:[0-5]\d$/;

export const UpdateTestCaseExecutionBody = zod.object({
  testCycleKey: zod
    .string()
    .describe(
      "Test cycle key in the format '{PROJECT_KEY}-TR-{number}', e.g. 'SCRUM-TR-101'. " +
        "Used directly as the API path parameter.",
    ),
  testCaseKey: zod
    .string()
    .describe(
      "Test case key in the format '{PROJECT_KEY}-TC-{number}', e.g. 'SCRUM-TC-145'.",
    ),
  executionResultId: zod
    .string()
    .optional()
    .describe(
      "Execution result name, e.g. 'Pass', 'Fail', 'Blocked', 'In Progress', 'Not Executed'. Project-specific (custom results allowed); resolved case-insensitively to a numeric executionResultId.",
    ),
  comment: zod
    .string()
    .nullable()
    .optional()
    .describe("Execution comment. Pass null to clear the existing comment."),
  actualTime: zod
    .string()
    .regex(ACTUAL_TIME_REGEX)
    .nullable()
    .optional()
    .describe(
      "Time already spent on the execution. Format: 'HH:mm:ss' e.g. '02:30:00' (2 hours 30 minutes 0 seconds). Pass null to clear.",
    ),
  executionAssignee: zod
    .string()
    .nullable()
    .optional()
    .describe(
      "Jira account ID of the assignee (not a display name). Pass null to unassign.",
    ),
  environmentId: zod
    .string()
    .optional()
    .describe(
      "Environment name (e.g. 'Production', 'Staging', 'Google Chrome', 'Firefox'). Auto-resolved to its numeric ID; an unresolved name is dropped and a warning is returned.",
    ),
  executionPlannedDate: zod
    .string()
    .regex(DATE_REGEX)
    .nullable()
    .optional()
    .describe(
      "Planned execution date. Format: 'dd/MMM/yyyy' e.g. '15/Oct/2025'. Month must be capitalised (Oct, not oct or OCT). Pass null to clear.",
    ),
  buildId: zod
    .string()
    .nullable()
    .optional()
    .describe(
      "Build name (e.g. 'Build 2.0', '1.0.0'). Auto-resolved to its numeric ID; an unresolved name is dropped and a warning is returned. Pass null to clear.",
    ),
});

export const UpdateTestCaseExecutionResponse = zod.object({
  testCycleKey: zod
    .string()
    .describe("Test cycle key of the updated execution."),
  testCaseKey: zod.string().describe("Test case key of the updated execution."),
  updated: zod
    .literal(true)
    .describe(
      "True when the server returned 204 No Content, confirming the execution was updated successfully.",
    ),
});
export type UpdateTestCaseExecutionResponseType = zod.infer<
  typeof UpdateTestCaseExecutionResponse
>;
