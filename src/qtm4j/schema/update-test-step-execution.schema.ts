/**
 * QTM4J Update Test Step Execution Schema
 *
 * PUT /rest/api/latest/testcycles/{testCycleKey}/teststep-executions/{testStepExecutionId}
 *
 * Updates an existing test step execution. The test cycle key is used directly as the
 * path parameter; testStepExecutionId is resolved from testCycleKey + testCaseKey +
 * testStepSeqNo via the execution-context and step-execution-context resolvers.
 * At least one updatable field must be supplied.
 */
import * as zod from "zod";

export const UpdateTestStepExecutionBody = zod.object({
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
  testStepSeqNo: zod
    .number()
    .int()
    .positive("testStepSeqNo must be a positive integer.")
    .describe(
      "sequence number of the step to update (e.g. 2 = the second step).",
    ),
  // Updatable fields — supply at least one.
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
    .describe(
      "Step execution comment. Pass null to clear the existing comment.",
    ),
  actualResult: zod
    .string()
    .nullable()
    .optional()
    .describe(
      "Actual result for this test step. Set to null to clear the existing value.",
    ),
});

export const UpdateTestStepExecutionResponse = zod.object({
  testCycleKey: zod
    .string()
    .describe(
      "Key of the test cycle containing the updated step execution (e.g. 'SCRUM-TR-101').",
    ),
  testCaseKey: zod
    .string()
    .describe(
      "Key of the test case whose step execution was updated (e.g. 'SCRUM-TC-145').",
    ),
  testStepSeqNo: zod
    .number()
    .describe("sequence number of the test step whose execution was updated."),
  executionResultName: zod
    .string()
    .optional()
    .describe(
      "Name of the execution result applied to the step (e.g. 'Pass', 'Fail'). Present only when the server returns it.",
    ),
  updated: zod
    .literal(true)
    .describe(
      "True when the server confirms the update (HTTP 200 OK) and the test step execution is successfully updated.",
    ),
});

export type UpdateTestStepExecutionBodyType = zod.infer<
  typeof UpdateTestStepExecutionBody
>;
export type UpdateTestStepExecutionResponseType = zod.infer<
  typeof UpdateTestStepExecutionResponse
>;
