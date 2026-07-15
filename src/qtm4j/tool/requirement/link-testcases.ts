import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { Qtm4jClient } from "../../client.ts";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants.ts";
import { ResolverKeys } from "../../config/field-resolution.types.ts";
import type { ResolvedRequirement } from "../../resolver/resolvers/requirement-id-resolver.ts";
import type { ResolvedTestCase } from "../../resolver/resolvers/test-case-uid-resolver.ts";
import {
  LinkTestCasesToRequirementBody,
  RequirementTestCaseLinkResponse,
} from "../../schema/requirements.schema.ts";

export class LinkTestCasesToRequirement extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.LINK_TESTCASES_TO_REQUIREMENT.TITLE,
    summary: TOOL_NAMES.LINK_TESTCASES_TO_REQUIREMENT.SUMMARY,
    readOnly: false,
    idempotent: false,
    toolset: TOOLSETS.REQUIREMENTS,
    inputSchema: LinkTestCasesToRequirementBody,
    outputSchema: RequirementTestCaseLinkResponse,
    purpose:
      "Link test cases to a Jira requirement in QTM4J using the requirement's human-readable key. " +
      "Test cases can be specified by their keys (e.g. 'SCRUM-TC-1'), which are resolved to internal IDs and latest versions automatically. " +
      "Alternatively, use a filter object to select test cases by criteria such as status, priority, labels, or folder. " +
      "The active project ID is injected automatically into the filter. " +
      "Test cases that cannot be linked are reported in warnings. " +
      "PREREQUISITE: set_project_context must be called before this tool.",
    useCases: [
      "Link specific test cases to a Jira story or bug by requirement key",
      "Build traceability between Jira requirements and QTM4J test cases",
      "Link all test cases matching a filter to a requirement",
      "Associate test cases with a requirement as part of sprint planning",
    ],
    examples: [
      {
        description: "Link two test cases by key",
        parameters: {
          requirementKey: "SCRUM-1",
          testCaseKeys: ["SCRUM-TC-10", "SCRUM-TC-11"],
        },
        expectedOutput: "Test cases linked to requirement SCRUM-1",
      },
      {
        description: "Link test cases matching a filter",
        parameters: {
          requirementKey: "SCRUM-1",
          filter: { priority: ["High"], status: ["To Do"] },
        },
        expectedOutput: "Filtered test cases linked to requirement",
      },
      {
        description: "Link test cases in a specific folder",
        parameters: {
          requirementKey: "SCRUM-5",
          filter: { folderId: 42, withChild: true },
          sort: "key:asc",
        },
        expectedOutput: "Folder test cases linked to requirement",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "REQUIREMENT KEY FORMAT: '{PROJECT_KEY}-{number}' — e.g. 'SCRUM-1'.",
      "TEST CASE KEY FORMAT: '{PROJECT_KEY}-TC-{number}' — e.g. 'SCRUM-TC-145'.",
      "Provide either testCaseKeys or filter — not both.",
      "projectId in filter is auto-filled from the active project context — do not set it manually.",
      "filter.excludeRequirementId excludes test cases already linked to that requirement ID.",
      "If a test case key cannot be resolved, it is reported in warnings and other test cases are still linked.",
    ],
    outputDescription:
      "Confirmation with the requirement key and linked: true. Warnings included if any test cases could not be resolved or linked.",
  };

  handle = async (rawArgs: any) => {
    const args = LinkTestCasesToRequirementBody.parse(rawArgs);
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();
    const warnings: string[] = [];

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

    const body: Record<string, unknown> = {};

    // Resolve test case keys → [{id, versionNo}]
    if (args.testCaseKeys?.length) {
      const uidMap = (await fieldResolver
        .getResolver(ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID)
        .resolveAndReturn(context.projectId, args.testCaseKeys)) as Record<
        string,
        ResolvedTestCase
      >;

      const testcases: { id: string; versionNo: number }[] = [];
      for (const tcKey of args.testCaseKeys) {
        const resolved = uidMap[tcKey];
        if (resolved) {
          testcases.push({
            id: resolved.uid,
            versionNo: resolved.latestVersion,
          });
        } else {
          warnings.push(
            `Test case '${tcKey}' could not be resolved and was skipped.`,
          );
        }
      }

      if (testcases.length > 0) body.testcases = testcases;
    }

    // Pass filter with auto-injected projectId
    if (args.filter) {
      body.filter = { ...args.filter, projectId: context.projectId };
    }

    if (args.sort) body.sort = args.sort;

    await this.client
      .getApiClient()
      .post(ENDPOINTS.LINK_TESTCASES_TO_REQUIREMENT(requirementId), body);

    return {
      structuredContent: RequirementTestCaseLinkResponse.parse({
        requirementKey: args.requirementKey,
        linked: true,
      }),
      content:
        warnings.length > 0
          ? [{ type: "text" as const, text: `Note: ${warnings.join(" | ")}` }]
          : [],
    };
  };
}
