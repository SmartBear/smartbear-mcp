import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types";
import {
  GetBugsResponse,
  type GetBugsResponseType,
  GetTestStepBugsBody,
} from "../../schema/get-bugs.schema";

const FILTER_FIELD_CONFIG: Record<string, string> = {
  priority: ResolverKeys.SearchableField.DEFECT_PRIORITY,
  status: ResolverKeys.SearchableField.DEFECT_STATUS,
};

/**
 * GetTestStepBugs Tool
 *
 * Retrieves Jira bugs linked to a test step execution, with optional priority/status filtering and pagination.
 * POST /testcycles/{testCycleKey}/teststep-executions/{testStepExecutionId}/defects
 * testStepExecutionId is resolved from testCycleKey + testCaseKey + testStepSeqNo via StepExecutionContextResolver.
 * priority and status filter values are resolved to numeric IDs before the call.
 */
export class GetTestStepBugs extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.GET_LINKED_BUGS_OF_TEST_STEP_EXECUTION.TITLE,
    toolset: TOOLSETS.TEST_EXECUTIONS,
    summary: TOOL_NAMES.GET_LINKED_BUGS_OF_TEST_STEP_EXECUTION.SUMMARY,
    readOnly: true,
    idempotent: true,
    inputSchema: GetTestStepBugsBody,
    outputSchema: GetBugsResponse,
    purpose: "Retrieve Jira bugs linked to a specific test step execution.",
    useCases: [
      "List all Jira bugs linked to a specific test step execution",
      "Filter step-level linked bugs by priority or status",
    ],
    examples: [
      {
        description: "Get linked bugs for step 2",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 2,
        },
        expectedOutput: "Bugs linked to step 2 of the execution",
      },
      {
        description: "Filter by priority",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 1,
          filter: { priority: ["High"] },
        },
        expectedOutput: "High-priority bugs linked to step 1",
      },
      {
        description: "Filter by status",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 1,
          filter: { status: ["In Progress"] },
        },
        expectedOutput: "In Progress bugs linked to step 1",
      },
    ],
    hints: [
      "Call set_project_context before this tool.",
      "An empty result (total = 0) means no bugs are linked — it is not an error.",
      "priority and status names are resolved to numeric IDs; unresolved names are skipped with a warning.",
      "Use get_linked_bugs_of_test_case_execution to retrieve all bugs on the test case execution across all steps.",
    ],
    outputDescription:
      "JSON object with startAt, maxResults, total, and data array of linked bug objects. " +
      "Each bug has: id, key, summary, status, priority, issueType, level, stepSeqNo, parameterGroup.",
  };

  handle = async (rawArgs: any) => {
    const args = GetTestStepBugsBody.parse(rawArgs);
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();
    const warnings: string[] = [];

    const testStepExecutionId = await this.resolveTestStepExecutionId(
      fieldResolver,
      context,
      args.testCycleKey,
      args.testCaseKey,
      args.testStepSeqNo,
    );

    if (args.filter) {
      await Promise.all(
        Object.entries(FILTER_FIELD_CONFIG).map(([inputField, resolverKey]) =>
          fieldResolver
            .getResolver(resolverKey)
            .resolve(
              inputField,
              resolverKey,
              args.filter as Record<string, unknown>,
              context,
              warnings,
            ),
        ),
      );
    }
    const requestBody = args.filter ? { filter: args.filter } : {};

    const params = new URLSearchParams();
    params.set("startAt", String(args.startAt));
    params.set("maxResults", String(args.maxResults));

    const endpoint = `${ENDPOINTS.GET_LINKED_BUGS_TEST_STEP_EXECUTION(
      args.testCycleKey,
      testStepExecutionId,
    )}?${params.toString()}`;

    const response = await this.client
      .getApiClient()
      .post(endpoint, requestBody);
    const validated: GetBugsResponseType = GetBugsResponse.parse(response);

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
