import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types";
import type { ExecutionContextEntry } from "../../resolver/resolvers/execution-context-resolver.ts";
import {
  StartExecutionBody,
  StartExecutionResponse,
  type StartExecutionResponseType,
} from "../../schema/start-execution.schema";

// Maps each API body field to its resolver key. Keys match the API field names so no renaming is needed.
const FIELD_CONFIG: Record<string, string> = {
  environmentId: ResolverKeys.SearchableField.ENVIRONMENT,
  buildId: ResolverKeys.SearchableField.BUILD,
};

/**
 * StartExecution Tool
 *
 * Starts a new test case execution within a test cycle.
 * The test cycle key is used directly as the path parameter (no UID resolution).
 * The testCycleTestCaseMapId is resolved via the ExecutionContextResolver.
 * Always operates at the test case level — test step executions are created automatically by the server.
 */
export class StartExecution extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.START_NEW_EXECUTION.TITLE,
    toolset: TOOLSETS.TEST_EXECUTIONS,
    summary: TOOL_NAMES.START_NEW_EXECUTION.SUMMARY,
    readOnly: false,
    idempotent: false,
    inputSchema: StartExecutionBody,
    outputSchema: StartExecutionResponse,
    purpose: "Start a new test case execution within a test cycle.",
    useCases: [
      "Start a fresh execution for a test case in a test cycle",
      "Clone an existing execution",
    ],
    examples: [
      {
        description: "Start an execution for a test case (minimal)",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
        },
        expectedOutput:
          "{ testCycleKey: 'PROJ-TR-101', testCaseKey: 'PROJ-TC-42', created: true }",
      },
      {
        description: "Start execution with environment, build and planned date",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          environmentId: "Production",
          buildId: "Build 2.0",
          executionPlannedDate: "15/Oct/2025",
          assignee: "5e4a642c1c9d440008f2a2b4",
        },
        expectedOutput:
          "{ testCycleKey: 'PROJ-TR-101', testCaseKey: 'PROJ-TC-42', created: true }",
      },
      {
        description: "Clone an existing execution",
        parameters: {
          testCycleKey: "PROJ-TR-101",
          testCaseKey: "PROJ-TC-42",
          cloneFrom: 725981,
          cloneExecutionCustomFields: true,
        },
        expectedOutput:
          "{ testCycleKey: 'PROJ-TR-101', testCaseKey: 'PROJ-TC-42', created: true }",
      },
    ],
    hints: [
      "Call set_project_context before this tool.",
      "executionPlannedDate must be in 'dd/MMM/yyyy' format (e.g. '15/Oct/2025', month 3-letter capitalised). Normalize from any user-provided format before calling.",
      "When cloneFrom is non-zero, the server ignores all body fields except cloneExecutionCustomFields.",
      "assignee must be a Jira account ID (e.g. '5e4a642c1c9d440008f2a2b4'), not a display name.",
      "environmentId and buildId accept name as strings that are resolved to numeric IDs; unresolved names are dropped and a warning is returned.",
      "actualTime must be in 'HH:mm:ss' format (e.g. '02:30:00'). Always include seconds.",
    ],
    outputDescription:
      "Confirmation object with testCycleKey, testCaseKey, and created: true (set when server returns 204).",
  };

  handle = async (rawArgs: any) => {
    const args = StartExecutionBody.parse(rawArgs);
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();
    const warnings: string[] = [];

    const mapId = await this.resolveTestCycleTestCaseMapId(
      fieldResolver,
      context,
      args.testCycleKey,
      args.testCaseKey,
    );
    const body = await this.buildRequestBody(
      args,
      fieldResolver,
      context,
      warnings,
    );
    const endpoint = this.buildEndpoint(
      args.testCycleKey,
      mapId,
      args.cloneFrom,
    );

    await this.client.getApiClient().post(endpoint, body);

    // New execution changes testCaseExecutionId and step execution IDs — evict stale cache.
    (
      fieldResolver.getResolver(
        ResolverKeys.SearchableField.EXECUTION_CONTEXT,
      ) as { clearCache(k?: string): void }
    ).clearCache(context.projectKey);
    (
      fieldResolver.getResolver(
        ResolverKeys.SearchableField.STEP_EXECUTION_CONTEXT,
      ) as { clearCache(k?: string): void }
    ).clearCache(context.projectKey);

    const validated: StartExecutionResponseType = StartExecutionResponse.parse({
      testCycleKey: args.testCycleKey,
      testCaseKey: args.testCaseKey,
      created: true,
    });

    return {
      structuredContent: validated,
      content:
        warnings.length > 0
          ? [{ type: "text" as const, text: `Note: ${warnings.join(" | ")}` }]
          : [],
    };
  };

  private async resolveTestCycleTestCaseMapId(
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
    return entry.testCycleTestCaseMapId;
  }

  private async buildRequestBody(
    args: ReturnType<typeof StartExecutionBody.parse>,
    fieldResolver: ReturnType<Qtm4jClient["getResolverRegistry"]>,
    context: ReturnType<
      ReturnType<Qtm4jClient["getResolverRegistry"]>["requireProjectContext"]
    >,
    warnings: string[],
  ): Promise<Record<string, unknown>> {
    // Destructure path/query params; spread the rest directly as the API body.
    const {
      testCycleKey: _tc,
      testCaseKey: _tck,
      cloneFrom: _cf,
      ...bodyArgs
    } = args;
    const body: Record<string, unknown> = { ...bodyArgs };

    await Promise.all(
      Object.entries(FIELD_CONFIG).map(([inputField, resolverKey]) =>
        fieldResolver
          .getResolver(resolverKey)
          .resolve(inputField, resolverKey, body, context, warnings),
      ),
    );

    return body;
  }

  private buildEndpoint(
    testCycleKey: string,
    testCycleTestCaseMapId: number,
    cloneFrom: number | undefined,
  ): string {
    const params = new URLSearchParams();
    if (cloneFrom !== undefined) params.set("cloneFrom", String(cloneFrom));
    const query = params.toString();
    return `${ENDPOINTS.START_NEW_EXECUTION(testCycleKey, testCycleTestCaseMapId)}${query ? `?${query}` : ""}`;
  }
}
