/**
 * QTM4J Start Execution Schemas
 *
 * POST /rest/api/latest/testcycles/{testCycleKey}/testcases/{testCycleTestCaseMapId}/executions
 *
 * Starts a new test case execution within a test cycle. The test cycle key is used
 * directly as the path parameter (no UID resolution). testCycleTestCaseMapId is resolved
 * from testCycleKey + testCaseKey via the execution-context resolver before the call.
 * Only the "testCase" level is supported — test step executions are created automatically.
 */
import * as zod from "zod";

/** dd/MMM/yyyy — e.g. "15/Oct/2025" (case-sensitive 3-letter month) */
const DATE_REGEX = /^\d{2}\/[A-Z][a-z]{2}\/\d{4}$/;
/** HH:mm:ss — matches backend regex ^\d+:[0-5]\d:[0-5]\d$ (e.g. "02:30:00") */
const ACTUAL_TIME_REGEX = /^\d+:[0-5]\d:[0-5]\d$/;

export const StartExecutionBody = zod.object({
  testCycleKey: zod
    .string()
    .min(1)
    .describe(
      "Test cycle key in the format '{PROJECT_KEY}-TR-{number}', e.g. 'SCRUM-TR-101'. " +
        "Used directly as the API path parameter.",
    ),
  testCaseKey: zod
    .string()
    .min(1)
    .describe(
      "Test case key in the format '{PROJECT_KEY}-TC-{number}', e.g. 'SCRUM-TC-145'.",
    ),
  assignee: zod
    .string()
    .optional()
    .describe(
      "Jira account ID of the user to assign this execution to (e.g. '5e4a642c1c9d440008f2a2b4'). This is the account ID, not a display name.",
    ),
  executionPlannedDate: zod
    .string()
    .regex(DATE_REGEX)
    .optional()
    .describe(
      "Planned execution date. Format: 'dd/MMM/yyyy' e.g. '15/Oct/2025'. Month must be capitalised (Oct, not oct or OCT).",
    ),
  environmentId: zod
    .string()
    .optional()
    .describe(
      "Environment name (e.g. 'Production', 'Staging', 'Google Chrome', 'Firefox'). Auto-resolved to its numeric ID; an unresolved name is dropped and a warning is returned.",
    ),
  buildId: zod
    .string()
    .optional()
    .describe(
      "Build name (e.g. 'Build 2.0', '1.0.0'). Auto-resolved to its numeric ID; an unresolved name is dropped and a warning is returned.",
    ),
  actualTime: zod
    .string()
    .regex(ACTUAL_TIME_REGEX, "Use 'HH:mm:ss' e.g. '02:30:00'.")
    .optional()
    .describe(
      "Time already spent on the execution. Format: 'HH:mm:ss' e.g. '02:30:00' (2 hours 30 minutes 0 seconds).",
    ),
  cloneFrom: zod
    .number()
    .int()
    .nonnegative("cloneFrom must be a non-negative integer.")
    .optional()
    .describe(
      "Source testCaseExecutionId to clone. When set, the new execution copies the source's execution and all other body fields are ignored by the server.",
    ),
  cloneExecutionCustomFields: zod
    .boolean()
    .optional()
    .describe(
      "When true, custom field values from the previous execution of this test case are copied into the new execution.",
    ),
});

export const StartExecutionResponse = zod.object({
  testCycleKey: zod
    .string()
    .describe(
      "Key of the test cycle in which the execution was created (e.g. 'SCRUM-TR-101').",
    ),
  testCaseKey: zod
    .string()
    .describe("Test case key of the created execution (e.g. 'SCRUM-TC-145')."),
  created: zod
    .literal(true)
    .describe(
      "True when the server returned 204 No Content, confirming the execution was created successfully.",
    ),
});

export type StartExecutionBodyType = zod.infer<typeof StartExecutionBody>;
export type StartExecutionResponseType = zod.infer<
  typeof StartExecutionResponse
>;
