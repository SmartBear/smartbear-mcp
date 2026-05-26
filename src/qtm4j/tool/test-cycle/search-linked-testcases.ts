import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import { ENDPOINTS, RESPONSE_FIELDS, TOOL_NAMES } from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types";
import type { ResolvedTestCycle } from "../../resolver/resolvers/test-cycle-uid-resolver.ts";
import {
  SearchLinkedTestCasesInCycleBody,
  SearchLinkedTestCasesInCycleResponse,
} from "../../schema/test-cycle.schema";

export class SearchLinkedTestCasesInCycle extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.SEARCH_LINKED_TESTCASES_IN_CYCLE.TITLE,
    summary: TOOL_NAMES.SEARCH_LINKED_TESTCASES_IN_CYCLE.SUMMARY,
    readOnly: true,
    idempotent: true,
    inputSchema: SearchLinkedTestCasesInCycleBody,
    outputSchema: SearchLinkedTestCasesInCycleResponse,
    purpose:
      "Search and filter test case executions linked to a QTM4J test cycle. " +
      "The cycle key (e.g. 'SCRUM-TR-1') is resolved to the internal UID automatically. " +
      "Supports pagination, field selection, sorting, and rich filter criteria such as execution result, " +
      "priority, status, environment, assignee, and date ranges. " +
      "The active project ID is injected automatically into the filter. " +
      "PREREQUISITE: set_project_context must be called before this tool.",
    useCases: [
      "List all test cases linked to a test cycle",
      "Find failed or blocked test case executions in a cycle",
      "Search for test cases in a cycle by execution result (Pass, Fail, Blocked)",
      "Filter test cases in a cycle by priority or status",
      "Retrieve test cases assigned to a specific executor in a cycle",
      "Get test cases with defects in a cycle",
      "Paginate through large test cycle execution lists",
      "Request only specific fields to reduce response size",
    ],
    examples: [
      {
        description: "List all test cases in a cycle",
        parameters: { cycleKey: "SCRUM-TR-1" },
        expectedOutput:
          "Paginated list of test case executions in the cycle (first 50 results)",
      },
      {
        description: "Find failed test cases in a cycle",
        parameters: {
          cycleKey: "SCRUM-TR-1",
          filter: { executionResult: ["Fail"] },
          fields: ["key", "summary", "executionResult", "priority"],
        },
        expectedOutput: "Test case executions with Fail result",
      },
      {
        description: "Search with pagination and sort",
        parameters: {
          cycleKey: "SCRUM-TR-5",
          maxResults: 25,
          startAt: 0,
          sort: "key:asc",
          filter: { status: ["To Do"] },
        },
        expectedOutput:
          "First 25 To Do test cases in the cycle sorted by key ascending",
      },
      {
        description: "Filter by execution assignee and environment",
        parameters: {
          cycleKey: "SCRUM-TR-2",
          filter: {
            executionAssignee: ["5b10a2844c20165700ede21f"],
            environment: ["Staging"],
          },
          fields: [
            "key",
            "summary",
            "executionResult",
            "environment",
            "actualTime",
          ],
        },
        expectedOutput:
          "Test cases assigned to the specified user in the Staging environment",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "CYCLE KEY FORMAT: '{PROJECT_KEY}-TR-{id}' — e.g. 'SCRUM-TR-1'. Resolved to internal UID automatically.",
      "projectId in filter is auto-filled from the active project context — do not set it manually.",
      "fields is sent as a query parameter; filter is sent in the request body.",
      "Allowed fields: id, key, summary, description, executionResult, status, priority, environment, tcWithDefects, estimatedTime, actualTime, createdOn, updatedOn, sprint, seqNo, latestTcExecutionId, customFields, flakyScore, passRateScore.",
      "Allowed sort fields: id, key, summary, description, executionResult, status, priority, environment, tcWithDefects, estimatedTime, actualTime, createdOn, updatedOn, sprint, flakyScore, passRateScore.",
      "Date range format for filter fields: 'dd/mmm/yyyy,dd/mmm/yyyy' (e.g., '01/Jan/2024,31/Mar/2024').",
      "maxResults defaults to 50, maximum is 100. Use startAt to paginate.",
      "executionResult filter accepts values like 'Pass', 'Fail', 'Blocked', 'Unexecuted'.",
    ],
    outputDescription:
      "JSON object with total (total matching executions), startAt, maxResults, and data (array of test case execution objects for this page).",
  };

  handle = async (rawArgs: any) => {
    const args = SearchLinkedTestCasesInCycleBody.parse(rawArgs);
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();

    // Resolve cycle key → internal UID
    const cycleMap = (await fieldResolver
      .getResolver(ResolverKeys.SearchableField.TEST_CYCLE_KEY_TO_UID)
      .resolveAndReturn(context.projectId, [args.cycleKey])) as Record<
      string,
      ResolvedTestCycle
    >;
    const cycleEntry = cycleMap[args.cycleKey];
    if (!cycleEntry) {
      throw new ToolError(
        `Test cycle '${args.cycleKey}' not found in project '${context.projectKey}'. ` +
          "Verify the key is a valid QTM4J test cycle key.",
      );
    }

    // Build query params
    const params = new URLSearchParams();
    if (args.fields?.length) {
      params.set(RESPONSE_FIELDS.FIELDS, args.fields.join(","));
    }
    if (args.sort) {
      params.set(RESPONSE_FIELDS.SORT, args.sort);
    }
    params.set(RESPONSE_FIELDS.MAX_RESULTS, String(args.maxResults));
    params.set(RESPONSE_FIELDS.START_AT, String(args.startAt));

    const endpoint = `${ENDPOINTS.SEARCH_LINKED_TESTCASES_IN_CYCLE(cycleEntry.uid)}?${params.toString()}`;

    // Build request body with auto-injected projectId in filter (API expects array)
    const filter = args.filter
      ? { ...args.filter, projectId: [context.projectId] }
      : { projectId: [context.projectId] };

    const response = await this.client
      .getApiClient()
      .post(endpoint, { filter });

    return {
      structuredContent: SearchLinkedTestCasesInCycleResponse.parse(response),
      content: [],
    };
  };
}
