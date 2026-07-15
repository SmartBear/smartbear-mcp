import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { Qtm4jClient } from "../../client.ts";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants.ts";
import { ResolverKeys } from "../../config/field-resolution.types.ts";
import type { ResolvedTestCycle } from "../../resolver/resolvers/test-cycle-uid-resolver.ts";
import { GetLinkedRequirementsResponse } from "../../schema/linked-items.schema.ts";
import { GetLinkedRequirementsForCycleBody } from "../../schema/test-cycle.link.schema.ts";

export class GetLinkedRequirementsForCycle extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.GET_LINKED_REQUIREMENTS_FOR_CYCLE.TITLE,
    summary: TOOL_NAMES.GET_LINKED_REQUIREMENTS_FOR_CYCLE.SUMMARY,
    readOnly: true,
    idempotent: true,
    toolset: TOOLSETS.TEST_CYCLES,
    inputSchema: GetLinkedRequirementsForCycleBody,
    outputSchema: GetLinkedRequirementsResponse,
    purpose:
      "Retrieve all Jira requirements linked to a QTM4J test cycle. " +
      "The cycle's human-readable key (e.g. 'SCRUM-TR-1') is resolved to the internal UID automatically. " +
      "Returns a paginated list of linked requirements with their Jira metadata (key, summary, status, priority, issue type). " +
      "PREREQUISITE: set_project_context must be called before this tool.",
    useCases: [
      "Check which Jira stories or bugs are covered by a test cycle",
      "Audit requirement traceability for a test cycle",
      "Retrieve requirement keys linked to a cycle before a release",
      "Verify correct requirements are linked to a test cycle",
    ],
    examples: [
      {
        description: "Get all requirements linked to a test cycle",
        parameters: { cycleKey: "SCRUM-TR-1" },
        expectedOutput:
          "Paginated list of linked requirements with Jira metadata",
      },
      {
        description:
          "Get requirements sorted by priority with custom page size",
        parameters: {
          cycleKey: "SCRUM-TR-5",
          sort: "priority:asc",
          maxResults: 20,
        },
        expectedOutput:
          "Requirements linked to cycle sorted by priority ascending",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "CYCLE KEY FORMAT: '{PROJECT_KEY}-TR-{id}' — e.g. 'SCRUM-TR-1'. Resolved to internal UID automatically.",
      "Allowed sort fields: key, status, priority. Default sort: 'key:desc'.",
      "Paginate using startAt — increment by maxResults until startAt >= total.",
    ],
    outputDescription:
      "Paginated result with total, startAt, maxResults, and data array of linked requirement objects (id, key, summary, status, priority, issueType).",
  };

  handle = async (rawArgs: unknown) => {
    const args = GetLinkedRequirementsForCycleBody.parse(rawArgs);
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

    const params: Record<string, string | number | undefined> = {
      maxResults: args.maxResults,
      startAt: args.startAt,
      sort: args.sort,
    };

    const response = await this.client
      .getApiClient()
      .get(ENDPOINTS.GET_LINKED_REQUIREMENTS_FOR_CYCLE(cycleEntry.uid), params);

    return {
      structuredContent: GetLinkedRequirementsResponse.parse(response),
      content: [],
    };
  };
}
