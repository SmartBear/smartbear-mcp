import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types";
import {
  LinkBugsResponse,
  type LinkBugsResponseType,
  LinkTestStepBugsBody,
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
 * LinkTestStepBugs Tool
 *
 * Links one or more Jira bug keys to a specific test step execution.
 * PUT /testcycles/{cycleKey}/teststep-executions/{testStepExecutionId}/defects
 * testStepSeqNo is resolved to testStepExecutionId via GET .../testcase-executions/{id}/teststeps.
 * Bug keys are resolved to numeric defect IDs via DefectIdResolver and sent as defectIDs.
 */
export class LinkTestStepBugs extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.LINK_BUGS_TO_TEST_STEP_EXECUTION.TITLE,
    toolset: TOOLSETS.TEST_EXECUTIONS,
    summary: TOOL_NAMES.LINK_BUGS_TO_TEST_STEP_EXECUTION.SUMMARY,
    readOnly: false,
    idempotent: false,
    inputSchema: LinkTestStepBugsBody,
    outputSchema: LinkBugsResponse,
    purpose: "Link Jira bugs to a specific test step execution.",
    useCases: [
      "Link a Jira bug to a specific test step execution",
      "Link multiple Jira bugs to a test step execution in a single request",
    ],
    examples: [
      {
        description: "Link a bug to step 2 of a test case execution",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 2,
          defectIDs: ["PROJ-456"],
        },
        expectedOutput:
          "{ testCycleKey: 'PROJ-TR-101', testCaseKey: 'PROJ-TC-42', linked: true, linkedDefectCount: 1 }",
      },
      {
        description: "Link multiple bugs to step 3 and suppress defect count",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 3,
          defectIDs: ["PROJ-456", "PROJ-789"],
          returnLinkedDefectCount: false,
        },
        expectedOutput:
          "{ testCycleKey: 'PROJ-TR-101', testCaseKey: 'PROJ-TC-42', linked: true }",
      },
      {
        description: "Link bugs to a step using a JQL filter",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          testStepSeqNo: 1,
          filter: {
            jql: "project = PROJ AND status = Open",
          },
        },
        expectedOutput:
          "{ testCycleKey: 'PROJ-TR-101', testCaseKey: 'PROJ-TC-42', linked: true, linkedDefectCount: 2 }",
      },
    ],
    hints: [
      "Call set_project_context before this tool.",
      "An execution must already be started for the test case before bugs can be linked.",
      "If the user provides a JQL expression, pass it as the `filter.jql` field. Correct or normalize JQL before calling if needed — the handler passes it through unchanged.",
    ],
    outputDescription:
      "Confirmation object with testCycleKey, testCaseKey, linked: true, and linkedDefectCount (by default). " +
      "warningMessages is included when the server reports per-bug issues.",
  };

  handle = async (rawArgs: any) => {
    const args = LinkTestStepBugsBody.parse(rawArgs);
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();

    const testStepExecutionId = await this.resolveTestStepExecutionId(
      fieldResolver,
      context,
      args.testCycleKey,
      args.testCaseKey,
      args.testStepSeqNo,
    );

    const endpoint = ENDPOINTS.LINK_BUGS_TEST_STEP_EXECUTION(
      args.testCycleKey,
      testStepExecutionId,
      args.returnLinkedDefectCount,
    );

    // Exclude path/control fields; spread remaining schema fields directly into body.
    const {
      testCycleKey: _tc,
      testCaseKey: _tck,
      testStepSeqNo: _sn,
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
