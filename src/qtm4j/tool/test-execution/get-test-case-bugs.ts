import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types";
import type { ExecutionContextEntry } from "../../resolver/resolvers/execution-context-resolver.ts";
import {
  GetBugsResponse,
  type GetBugsResponseType,
  GetTestCaseBugsBody,
} from "../../schema/get-bugs.schema";

const FILTER_FIELD_CONFIG: Record<string, string> = {
  priority: ResolverKeys.SearchableField.DEFECT_PRIORITY,
  status: ResolverKeys.SearchableField.DEFECT_STATUS,
};

/**
 * GetTestCaseBugs Tool
 *
 * Retrieves Jira bugs linked to a test case execution, with optional priority/status filtering and pagination.
 * POST /testcycles/{testCycleKey}/testcase-executions/{testCaseExecutionId}/defects
 * testCaseExecutionId is resolved from testCycleKey + testCaseKey via ExecutionContextResolver.
 * priority and status filter values are resolved to numeric IDs before the call.
 */
export class GetTestCaseBugs extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.GET_LINKED_BUGS_OF_TEST_CASE_EXECUTION.TITLE,
    toolset: TOOLSETS.TEST_EXECUTIONS,
    summary: TOOL_NAMES.GET_LINKED_BUGS_OF_TEST_CASE_EXECUTION.SUMMARY,
    readOnly: true,
    idempotent: true,
    inputSchema: GetTestCaseBugsBody,
    outputSchema: GetBugsResponse,
    purpose: "Retrieve Jira bugs linked to a test case execution.",
    useCases: [
      "List all Jira bugs linked to a test case execution",
      "Filter linked bugs by priority or status",
    ],
    examples: [
      {
        description: "Get all linked bugs for a test case execution",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
        },
        expectedOutput:
          "Paginated list of all bugs linked to the test case execution",
      },
      {
        description: "Filter by priority",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          filter: { priority: ["High"] },
        },
        expectedOutput: "Linked bugs with High priority",
      },
      {
        description: "Filter by status",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          filter: { status: ["To Do", "In Progress"] },
        },
        expectedOutput: "Linked bugs in To Do or In Progress status",
      },
    ],
    hints: [
      "Call set_project_context before this tool.",
      "An empty result (total = 0) means no bugs are linked — it is not an error.",
      "priority and status names are resolved to numeric IDs; unresolved names are skipped with a warning.",
      "Use get_linked_bugs_of_test_step_execution to retrieve bugs linked at a specific step level.",
    ],
    outputDescription:
      "JSON object with startAt, maxResults, total, and data array of linked bug objects. " +
      "Each bug has: id, key, summary, status, priority, issueType, level, stepSeqNo, parameterGroup.",
  };

  handle = async (rawArgs: any) => {
    const args = GetTestCaseBugsBody.parse(rawArgs);
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();
    const warnings: string[] = [];

    const testCaseExecutionId = await this.resolveTestCaseExecutionId(
      fieldResolver,
      context,
      args.testCycleKey,
      args.testCaseKey,
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
    params.set("level", args.level);

    const endpoint = `${ENDPOINTS.GET_LINKED_BUGS_TEST_CASE_EXECUTION(
      args.testCycleKey,
      testCaseExecutionId,
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
