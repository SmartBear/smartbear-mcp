import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types";
import type { ExecutionContextEntry } from "../../resolver/resolvers/execution-context-resolver.ts";
import {
  UpdateTestCaseExecutionBody,
  UpdateTestCaseExecutionResponse,
  type UpdateTestCaseExecutionResponseType,
} from "../../schema/update-test-case-execution.schema";

// Maps each API body field to its resolver key. Keys match the API field names, so no renaming is needed.
const FIELD_CONFIG: Record<string, string> = {
  executionResultId: ResolverKeys.CommonAttribute.EXECUTION_RESULT,
  environmentId: ResolverKeys.SearchableField.ENVIRONMENT,
  buildId: ResolverKeys.SearchableField.BUILD,
};

/**
 * UpdateTestCaseExecution Tool
 *
 * Updates an existing test case execution.
 * PUT /testcycles/{cycleKey}/testcase-executions/{testCaseExecutionId}
 * The cycle key is used directly as the path parameter (no UID resolution).
 * testCaseExecutionId is resolved from testCycleKey + testCaseKey via ExecutionContextResolver.
 * Returns 204 No Content on success.
 */
export class UpdateTestCaseExecution extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.UPDATE_TEST_CASE_EXECUTION.TITLE,
    toolset: TOOLSETS.TEST_EXECUTIONS,
    summary: TOOL_NAMES.UPDATE_TEST_CASE_EXECUTION.SUMMARY,
    readOnly: false,
    idempotent: true,
    inputSchema: UpdateTestCaseExecutionBody,
    outputSchema: UpdateTestCaseExecutionResponse,
    purpose: "Update an existing test case execution.",
    useCases: [
      "Set a test case execution result (e.g. Pass, Fail, Blocked)",
      "Update comment, environment, build, assignee, planned date, or actual time on an execution",
    ],
    examples: [
      {
        description: "Mark test case as Pass",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          executionResultId: "Pass",
        },
        expectedOutput:
          "{ testCycleKey: 'PROJ-TR-101', testCaseKey: 'PROJ-TC-42', updated: true }",
      },
      {
        description: "Update with comment, environment, and actual time",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          executionResultId: "Pass",
          comment: "All smoke tests passed.",
          environmentId: "Production",
          actualTime: "01:30:00",
        },
        expectedOutput:
          "{ testCycleKey: 'PROJ-TR-101', testCaseKey: 'PROJ-TC-42', updated: true }",
      },
      {
        description: "Clear comment",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          comment: null,
        },
        expectedOutput:
          "{ testCycleKey: 'PROJ-TR-101', testCaseKey: 'PROJ-TC-42', updated: true }",
      },
    ],
    hints: [
      "Call set_project_context before this tool.",
      "At least one updatable field must be provided.",
      "environmentId and buildId accept environment/build name as strings that are resolved to numeric IDs; unresolved names are dropped and a warning is returned.",
      "actualTime must be in 'HH:mm:ss' format (e.g. '01:30:00'). Always include seconds",
    ],
    outputDescription:
      "Confirmation object with testCycleKey, testCaseKey, and updated: true. " +
      "Warnings are returned in content if any resolvable field (executionResultId, environmentId, buildId) could not be resolved and was dropped.",
  };

  handle = async (rawArgs: any) => {
    const { testCycleKey, testCaseKey, ...bodyArgs } =
      UpdateTestCaseExecutionBody.parse(rawArgs);

    if (!Object.values(bodyArgs).some((v) => v !== undefined)) {
      throw new ToolError("Provide at least one updatable field.");
    }

    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();
    const warnings: string[] = [];

    const testCaseExecutionId = await this.resolveTestCaseExecutionId(
      fieldResolver,
      context,
      testCycleKey,
      testCaseKey,
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

    await this.client
      .getApiClient()
      .put(
        ENDPOINTS.UPDATE_TEST_CASE_EXECUTION(testCycleKey, testCaseExecutionId),
        body,
      );

    const validated: UpdateTestCaseExecutionResponseType =
      UpdateTestCaseExecutionResponse.parse({
        testCycleKey,
        testCaseKey,
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

  private async resolveTestCaseExecutionId(
    fieldResolver: ReturnType<Qtm4jClient["getResolverRegistry"]>,
    context: ReturnType<
      ReturnType<Qtm4jClient["getResolverRegistry"]>["requireProjectContext"]
    >,
    testCycleKey: string,
    testCaseKey: string,
  ): Promise<number> {
    const result = (await fieldResolver
      .getResolver(ResolverKeys.SearchableField.EXECUTION_CONTEXT)
      .resolveAndReturn(context.projectKey, context.projectId, testCycleKey, [
        testCaseKey,
      ])) as Record<string, ExecutionContextEntry>;

    const entry = result[testCaseKey];
    if (!entry) {
      throw new ToolError(
        `Test case '${testCaseKey}' is not linked to test cycle '${testCycleKey}'. ` +
          "Verify the key and ensure it belongs to the cycle.",
      );
    }
    if (entry.testCaseExecutionId == null) {
      throw new ToolError(
        `No execution has been started for test case '${testCaseKey}' in cycle '${testCycleKey}'. ` +
          "Use start_new_execution first.",
      );
    }
    return entry.testCaseExecutionId;
  }
}
