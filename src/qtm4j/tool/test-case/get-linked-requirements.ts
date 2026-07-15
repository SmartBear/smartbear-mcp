import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { Qtm4jClient } from "../../client.ts";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants.ts";
import { ResolverKeys } from "../../config/field-resolution.types.ts";
import type { ResolvedTestCase } from "../../resolver/resolvers/test-case-uid-resolver.ts";
import {
  GetLinkedRequirementsBody,
  GetLinkedRequirementsResponse,
} from "../../schema/linked-items.schema.ts";

export class GetLinkedRequirements extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.GET_LINKED_REQUIREMENTS.TITLE,
    summary: TOOL_NAMES.GET_LINKED_REQUIREMENTS.SUMMARY,
    readOnly: true,
    idempotent: true,
    toolset: TOOLSETS.TEST_CASES,
    inputSchema: GetLinkedRequirementsBody,
    outputSchema: GetLinkedRequirementsResponse,
    purpose:
      "Retrieve all Jira requirements linked to a specific test case in QTM4J. " +
      "The test case's human-readable key (e.g. 'SCRUM-TC-145') is resolved to the internal UID automatically. " +
      "Returns a paginated list of linked requirements with their Jira metadata (key, summary, status, priority, issue type). " +
      "PREREQUISITE: set_project_context must be called before this tool.",
    useCases: [
      "Check which Jira stories or bugs a test case covers",
      "Audit requirement traceability for a test case",
      "Retrieve requirement keys to use in other operations",
      "Verify that the correct requirements are linked to a test case before a release",
    ],
    examples: [
      {
        description: "Get all requirements linked to a test case",
        parameters: { key: "SCRUM-TC-145" },
        expectedOutput:
          "Paginated list of linked requirements with Jira metadata",
      },
      {
        description: "Get requirements for a specific version",
        parameters: { key: "SCRUM-TC-85", versionNo: 2, maxResults: 20 },
        expectedOutput: "Requirements linked to version 2 of the test case",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "KEY FORMAT: '{PROJECT_KEY}-TC-{number}' — e.g. 'SCRUM-TC-145'.",
      "versionNo defaults to the latest version. Use search_test_cases to find available versions.",
      "Paginate using startAt — increment by maxResults until startAt >= total.",
    ],
    outputDescription:
      "Paginated list with total, startAt, maxResults, and data array of linked requirement objects (id, key, summary, status, priority, issueType).",
  };

  handle = async (rawArgs: unknown) => {
    const args = GetLinkedRequirementsBody.parse(rawArgs);
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();

    // Resolve test case key → internal UID
    const uidMap = (await fieldResolver
      .getResolver(ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID)
      .resolveAndReturn(context.projectId, [args.key])) as Record<
      string,
      ResolvedTestCase
    >;
    const entry = uidMap[args.key];
    if (!entry) {
      throw new ToolError(
        `Test case '${args.key}' not found in project '${context.projectKey}'. ` +
          "Verify the key using the search_test_cases tool.",
      );
    }

    const params: Record<string, string | number | boolean | undefined> = {
      maxResults: args.maxResults,
      startAt: args.startAt,
      sort: args.sort,
      tcVersionNo: args.versionNo,
    };

    const response = await this.client
      .getApiClient()
      .get(ENDPOINTS.GET_LINKED_REQUIREMENTS(entry.uid), params);

    return {
      structuredContent: GetLinkedRequirementsResponse.parse(response),
      content: [],
    };
  };
}
