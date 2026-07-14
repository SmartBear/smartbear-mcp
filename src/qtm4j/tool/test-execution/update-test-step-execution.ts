import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types";
import {
  UpdateTestStepExecutionBody,
  UpdateTestStepExecutionResponse,
  type UpdateTestStepExecutionResponseType,
} from "../../schema/update-test-step-execution.schema";

// Maps each API body field to its resolver key. Keys match the API field names so no renaming is needed.
const FIELD_CONFIG: Record<string, string> = {
  executionResultId: ResolverKeys.CommonAttribute.EXECUTION_RESULT,
};

/**
 * UpdateTestStepExecution Tool
 *
 * Updates an existing test step execution.
 * PUT /testcycles/{cycleKey}/teststep-executions/{testStepExecutionId}
 * The cycle key is used directly as the path parameter (no UID resolution).
 * testStepExecutionId is resolved from testCycleKey + testCaseKey + testStepSeqNo
 * via StepExecutionContextResolver.
 * Returns 200 OK on success.
 */
export class UpdateTestStepExecution extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.UPDATE_TEST_STEP_EXECUTION.TITLE,
    toolset: TOOLSETS.TEST_EXECUTIONS,
    summary: TOOL_NAMES.UPDATE_TEST_STEP_EXECUTION.SUMMARY,
    readOnly: false,
    idempotent: true,
    inputSchema: UpdateTestStepExecutionBody,
    outputSchema: UpdateTestStepExecutionResponse,
    purpose: "Update an existing test step execution.",
    useCases: [
      "Set a test step execution result (e.g. Pass, Fail, Blocked)",
      "Update actual result text or comment on a test step execution",
    ],
    examples: [
      {
        description: "Mark step 2 as Pass",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 2,
          executionResultId: "Pass",
        },
        expectedOutput:
          "{ testCycleKey: 'PROJ-TR-101', testCaseKey: 'PROJ-TC-42', testStepSeqNo: 2, executionResultName: 'Pass', updated: true }",
      },
      {
        description: "Update step 3 with result text and comment",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 3,
          executionResultId: "Fail",
          actualResult: "Button not found on page.",
          comment: "Reproduced consistently in Chrome.",
        },
        expectedOutput:
          "{ testCycleKey: 'PROJ-TR-101', testCaseKey: 'PROJ-TC-42', testStepSeqNo: 3, executionResultName: 'Fail', updated: true }",
      },
      {
        description: "Clear actual result on step 1",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 1,
          actualResult: null,
        },
        expectedOutput:
          "{ testCycleKey: 'PROJ-TR-101', testCaseKey: 'PROJ-TC-42', testStepSeqNo: 1, updated: true }",
      },
    ],
    hints: [
      "Call set_project_context before this tool.",
      "At least one updatable field must be provided.",
      "An execution must already be started for the test case before steps can be updated.",
    ],
    outputDescription:
      "Confirmation object with testCycleKey, testCaseKey, testStepSeqNo, and updated: true. " +
      "executionResultName is included when the server returns it. " +
      "Warnings are returned in content if executionResultId name could not be resolved.",
  };

  handle = async (rawArgs: any) => {
    const { testCycleKey, testCaseKey, testStepSeqNo, ...bodyArgs } =
      UpdateTestStepExecutionBody.parse(rawArgs);

    if (!Object.values(bodyArgs).some((v) => v !== undefined)) {
      throw new ToolError("Provide at least one updatable field.");
    }

    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();
    const warnings: string[] = [];

    const testStepExecutionId = await this.resolveTestStepExecutionId(
      fieldResolver,
      context,
      testCycleKey,
      testCaseKey,
      testStepSeqNo,
    );

    const body: Record<string, unknown> = { ...bodyArgs };

    await Promise.all(
      Object.entries(FIELD_CONFIG).map(([inputField, resolverKey]) =>
        fieldResolver
          .getResolver(resolverKey)
          .resolve(inputField, resolverKey, body, context, warnings),
      ),
    );

    if (Object.keys(body).length === 0) {
      throw new ToolError(
        `No updatable fields remain after resolution. ${warnings.join(" | ")}`,
      );
    }

    const apiResponse = (await this.client
      .getApiClient()
      .put(
        ENDPOINTS.UPDATE_TEST_STEP_EXECUTION(testCycleKey, testStepExecutionId),
        body,
      )) as Record<string, unknown> | undefined;

    const validated: UpdateTestStepExecutionResponseType =
      UpdateTestStepExecutionResponse.parse({
        testCycleKey,
        testCaseKey,
        testStepSeqNo,
        ...(apiResponse?.executionResultName !== undefined && {
          executionResultName: apiResponse.executionResultName,
        }),
        updated: true,
      });

    return {
      structuredContent: validated,
      content:
        warnings.length > 0
          ? [{ type: "text" as const, text: `Note: ${warnings.join(" | ")}` }]
          : [],
    };
  };

  private async resolveTestStepExecutionId(
    fieldResolver: ReturnType<Qtm4jClient["getResolverRegistry"]>,
    context: ReturnType<
      ReturnType<Qtm4jClient["getResolverRegistry"]>["requireProjectContext"]
    >,
    testCycleKey: string,
    testCaseKey: string,
    testStepSeqNo: number,
  ): Promise<number> {
    const stepCtxResult = (await fieldResolver
      .getResolver(ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT)
      .resolveAndReturn(
        context.projectKey,
        context.projectId,
        testCycleKey,
        testCaseKey,
        [testStepSeqNo],
      )) as Record<string, Record<number, number>>;

    const stepMap = stepCtxResult[testCaseKey] ?? {};
    const testStepExecutionId = stepMap[testStepSeqNo];
    if (testStepExecutionId == null) {
      throw new ToolError(
        `Step ${testStepSeqNo} was not found in this execution.`,
      );
    }
    return testStepExecutionId;
  }
}
