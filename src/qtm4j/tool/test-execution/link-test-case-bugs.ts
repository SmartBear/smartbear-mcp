import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types";
import type { ExecutionContextEntry } from "../../resolver/resolvers/execution-context-resolver.ts";
import {
  LinkBugsResponse,
  type LinkBugsResponseType,
  LinkTestCaseBugsBody,
} from "../../schema/link-bugs.schema";

const FIELD_CONFIG: Record<string, string> = {
  defectIDs: ResolverKeys.SearchableField.DEFECT_KEY_TO_ID,
};

/** Response shape from PUT .../defects */
interface LinkDefectsApiResponse {
  linkedDefectCount?: number;
  warningMessages?: string[];
  [key: string]: unknown;
}

/**
 * LinkTestCaseBugs Tool
 *
 * Links one or more Jira bug keys to a test case execution.
 * PUT /testcycles/{cycleKey}/testcase-executions/{testCaseExecutionId}/defects
 * Bug keys are resolved to numeric defect IDs via DefectIdResolver and sent as defectIDs.
 */
export class LinkTestCaseBugs extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.LINK_BUGS_TO_TEST_CASE_EXECUTION.TITLE,
    toolset: TOOLSETS.TEST_EXECUTIONS,
    summary: TOOL_NAMES.LINK_BUGS_TO_TEST_CASE_EXECUTION.SUMMARY,
    readOnly: false,
    idempotent: false,
    inputSchema: LinkTestCaseBugsBody,
    outputSchema: LinkBugsResponse,
    purpose: "Link Jira bugs to a test case execution.",
    useCases: [
      "Link a Jira bug to a test case execution",
      "Link multiple Jira bug to a test case execution in a single bulk operation.",
    ],
    examples: [
      {
        description: "Link two bugs to a test case execution",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          defectIDs: ["PROJ-456", "PROJ-789"],
        },
        expectedOutput:
          "{ testCycleKey: 'PROJ-TR-101', testCaseKey: 'PROJ-TC-42', linked: true, linkedDefectCount: 2 }",
      },
      {
        description: "Link a bug and suppress defect count in response",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          defectIDs: ["PROJ-456"],
          returnLinkedDefectCount: false,
        },
        expectedOutput:
          "{ testCycleKey: 'PROJ-TR-101', testCaseKey: 'PROJ-TC-42', linked: true }",
      },
      {
        description: "Link bugs using a JQL filter",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          filter: {
            jql: "project = PROJ AND issuetype = Bug AND status = 'To Do'",
          },
        },
        expectedOutput:
          "{ testCycleKey: 'PROJ-TR-101', testCaseKey: 'PROJ-TC-42', linked: true, linkedDefectCount: 5 }",
      },
    ],
    hints: [
      "Call set_project_context before this tool.",
      "An execution must already be started for the test case before bugs can be linked.",
      "If the user provides a JQL expression, pass it as the `filter.jql` field. Correct or normalize JQL before calling this tool if needed — the handler passes it through unchanged.",
    ],
    outputDescription:
      "Confirmation object with testCycleKey, testCaseKey, linked: true, and linkedDefectCount (by default). " +
      "warningMessages is included when the server reports per-bug issues.",
  };

  handle = async (rawArgs: any) => {
    const args = LinkTestCaseBugsBody.parse(rawArgs);
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();

    const testCaseExecutionId = await this.resolveTestCaseExecutionId(
      fieldResolver,
      context,
      args.testCycleKey,
      args.testCaseKey,
    );

    const endpoint = ENDPOINTS.LINK_BUGS_TEST_CASE_EXECUTION(
      args.testCycleKey,
      testCaseExecutionId,
      args.returnLinkedDefectCount,
    );

    // Exclude path/control fields; spread remaining schema fields directly into body.
    const {
      testCycleKey: _tc,
      testCaseKey: _tck,
      returnLinkedDefectCount: _rc,
      ...bodyArgs
    } = args;
    const body: Record<string, unknown> = { ...bodyArgs };
    const warnings: string[] = [];
    await Promise.all(
      Object.entries(FIELD_CONFIG).map(([inputField, resolverKey]) =>
        fieldResolver
          .getResolver(resolverKey)
          .resolve(inputField, resolverKey, body, context, warnings),
      ),
    );

    const hasDefectIDs =
      Array.isArray(body.defectIDs) && (body.defectIDs as unknown[]).length > 0;
    const hasJql =
      typeof (body.filter as Record<string, unknown>)?.jql === "string";
    if (!hasDefectIDs && !hasJql) {
      throw new ToolError(
        `No bugs to link after resolution. ${warnings.join(" | ")}`,
      );
    }

    // PUT may return 204 (nobody) or 200 (with warnings/count)
    let apiResponse: LinkDefectsApiResponse = {};
    const resp = await this.client.getApiClient().put(endpoint, body);
    if (resp && typeof resp === "object") {
      apiResponse = resp as LinkDefectsApiResponse;
    }

    const validated: LinkBugsResponseType = LinkBugsResponse.parse({
      testCycleKey: args.testCycleKey,
      testCaseKey: args.testCaseKey,
      linked: true,
      ...(apiResponse.linkedDefectCount !== undefined
        ? { linkedDefectCount: apiResponse.linkedDefectCount }
        : {}),
      ...(apiResponse.warningMessages?.length
        ? { warningMessages: apiResponse.warningMessages }
        : {}),
    });

    if (apiResponse.warningMessages?.length) {
      warnings.push(`API: ${apiResponse.warningMessages.join(" | ")}`);
    }

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
