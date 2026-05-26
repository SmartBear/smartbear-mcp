import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import { ENDPOINTS, TOOL_NAMES } from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types";
import type { ResolvedRequirement } from "../../resolver/resolvers/requirement-id-resolver";
import {
  GetLinkedTestCasesForRequirementBody,
  GetLinkedTestCasesResponse,
} from "../../schema/linked-items.schema";

export class GetLinkedTestCasesForRequirement extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.GET_LINKED_TESTCASES_FOR_REQUIREMENT.TITLE,
    summary: TOOL_NAMES.GET_LINKED_TESTCASES_FOR_REQUIREMENT.SUMMARY,
    readOnly: true,
    idempotent: true,
    inputSchema: GetLinkedTestCasesForRequirementBody,
    outputSchema: GetLinkedTestCasesResponse,
    purpose:
      "Retrieve all test cases linked to a specific Jira requirement in QTM4J. " +
      "The requirement's human-readable key (e.g. 'SCRUM-1') is resolved to the internal Jira issue ID automatically. " +
      "Returns a paginated list of linked test cases with their metadata. " +
      "Use the filter to narrow results by status, priority, labels, folder, and more. " +
      "PREREQUISITE: set_project_context must be called before this tool.",
    useCases: [
      "Check which test cases cover a Jira story or bug",
      "Audit requirement traceability — find all test cases for a given requirement",
      "Filter linked test cases by status or priority before a release",
      "Retrieve test case keys to use in update or link operations",
    ],
    examples: [
      {
        description: "Get all test cases linked to a requirement",
        parameters: { requirementKey: "SCRUM-1" },
        expectedOutput: "Paginated list of linked test cases",
      },
      {
        description: "Get high priority linked test cases",
        parameters: {
          requirementKey: "SCRUM-5",
          filter: { priority: ["High"] },
          fields: "key,summary,status,priority",
          sort: "key:asc",
        },
        expectedOutput:
          "Filtered high-priority test cases linked to requirement",
      },
      {
        description: "Paginate through linked test cases",
        parameters: {
          requirementKey: "SCRUM-1",
          maxResults: 20,
          startAt: 20,
        },
        expectedOutput: "Second page of linked test cases",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "REQUIREMENT KEY FORMAT: '{PROJECT_KEY}-{number}' — e.g. 'SCRUM-1'.",
      "projectId in filter is auto-filled from the active project context — do not set it manually.",
      "Use the fields param to limit response size — only request fields you need.",
      "Paginate using startAt — increment by maxResults until startAt >= total.",
      "filter.testCaseStatus can be 'active', 'archived', or 'deleted' to filter by archive state.",
    ],
    outputDescription:
      "Paginated response with total, startAt, maxResults, and data array of linked test case objects.",
  };

  handle = async (rawArgs: any) => {
    const args = GetLinkedTestCasesForRequirementBody.parse(rawArgs);
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();

    // Resolve requirement key → Jira issue ID
    const reqMap = (await fieldResolver
      .getResolver(ResolverKeys.SearchableField.REQUIREMENT_KEY_TO_ID)
      .resolveAndReturn(context.projectId, [args.requirementKey])) as Record<
      string,
      ResolvedRequirement
    >;
    const reqEntry = reqMap[args.requirementKey];
    if (!reqEntry) {
      throw new ToolError(
        `Requirement '${args.requirementKey}' not found in project '${context.projectKey}'. ` +
          "Verify the key is a valid Jira issue key.",
      );
    }
    const requirementId = Number(reqEntry.id);

    // Query params go in the URL; filter body is posted as JSON
    const queryParams: Record<string, string | number | boolean | undefined> = {
      fields: args.fields,
      maxResults: args.maxResults,
      startAt: args.startAt,
      sort: args.sort,
    };

    // Build POST body: filter with auto-injected projectId
    const body: Record<string, unknown> = {};
    if (args.filter) {
      body.filter = { ...args.filter, projectId: context.projectId };
    }

    const response = await this.client
      .getApiClient()
      .post(
        ENDPOINTS.GET_LINKED_TESTCASES_FOR_REQUIREMENT(requirementId),
        body,
        queryParams,
      );

    return {
      structuredContent: GetLinkedTestCasesResponse.parse(response),
      content: [],
    };
  };
}
