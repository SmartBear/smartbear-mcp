import z from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import { ENDPOINTS, TOOL_NAMES } from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types";
import type { ResolvedRequirement } from "../../resolver/resolvers/requirement-id-resolver";
import type { ResolvedTestCase } from "../../resolver/resolvers/test-case-uid-resolver.ts";

const LinkRequirementsBody = z.object({
  key: z
    .string()
    .describe(
      "Test case key in '{PROJECT_KEY}-TC-{number}' format (e.g., 'SCRUM-TC-145'). Required.",
    ),
  versionNo: z
    .number()
    .int()
    .optional()
    .describe("Test case version number. Defaults to the latest version."),
  requirementKeys: z
    .array(z.string())
    .optional()
    .describe(
      "List of requirement keys to link (e.g., ['SCRUM-1', 'SCRUM-2']). Resolved to internal IDs automatically. Provide this OR filter.jql — not both.",
    ),
  filter: z
    .object({
      jql: z
        .string()
        .describe(
          'JQL query to filter requirements to link (e.g., "project = DEMO AND issuetype = Story").',
        ),
    })
    .optional()
    .describe(
      "JQL filter to select requirements to link. Use instead of requirementKeys when filtering by JQL.",
    ),
});

const LinkRequirementsResponse = z.object({
  key: z.string(),
  versionNo: z.number().int(),
  linked: z.literal(true),
});

export class LinkRequirements extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.LINK_REQUIREMENTS.TITLE,
    summary: TOOL_NAMES.LINK_REQUIREMENTS.SUMMARY,
    readOnly: false,
    idempotent: false,
    inputSchema: LinkRequirementsBody,
    outputSchema: LinkRequirementsResponse,
    purpose:
      "Link Jira requirements to a test case in QTM4J using the test case's human-readable key. " +
      "Requirements can be specified by their human-readable keys (e.g. 'SCRUM-1') which are resolved to internal IDs automatically, " +
      "or via a JQL filter. Requirements that cannot be linked are reported as warnings. " +
      "PREREQUISITE: set_project_context must be called before this tool.",
    useCases: [
      "Link one or more Jira requirements (stories, bugs, epics) to a test case",
      "Associate requirements with a test case using a JQL filter",
      "Build traceability between requirements and test cases",
      "Link requirements to a specific test case version",
    ],
    examples: [
      {
        description: "Link two requirements by key",
        parameters: {
          key: "SCRUM-TC-145",
          requirementKeys: ["SCRUM-1", "SCRUM-2"],
        },
        expectedOutput: "Requirements SCRUM-1 and SCRUM-2 linked to test case",
      },
      {
        description: "Link requirements by JQL filter",
        parameters: {
          key: "SCRUM-TC-145",
          filter: { jql: "project = DEMO AND issuetype = Story" },
        },
        expectedOutput: "Requirements matched by JQL linked to test case",
      },
      {
        description: "Link a requirement to a specific version",
        parameters: {
          key: "SCRUM-TC-85",
          versionNo: 2,
          requirementKeys: ["SCRUM-10"],
        },
        expectedOutput: "Requirement linked to version 2 of test case",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "KEY FORMAT: '{PROJECT_KEY}-TC-{number}' — e.g. 'SCRUM-TC-145'.",
      "Requirement keys follow the Jira issue key format: '{PROJECT_KEY}-{number}' (e.g. 'SCRUM-1').",
      "Provide either requirementKeys or filter.jql — not both.",
      "If a requirement key cannot be resolved or linked, it is reported in warnings and other requirements are still linked.",
      "versionNo defaults to the latest version. Use search_test_cases to find available versions if needed.",
    ],
    outputDescription:
      "Confirmation with the test case key, version number, and linked: true. Warnings are included if any requirements could not be resolved or linked.",
  };

  handle = async (rawArgs: any) => {
    const args = LinkRequirementsBody.parse(rawArgs);
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();
    const warnings: string[] = [];

    // Resolve test case key → internal UID + version
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

    const versionNo = args.versionNo ?? entry.latestVersion;
    const body: Record<string, unknown> = {};

    // Resolve requirement keys → numeric IDs
    if (args.requirementKeys?.length) {
      const reqMap = (await fieldResolver
        .getResolver(ResolverKeys.SearchableField.REQUIREMENT_KEY_TO_ID)
        .resolveAndReturn(context.projectId, args.requirementKeys)) as Record<
        string,
        ResolvedRequirement
      >;

      const requirementIds: number[] = [];
      for (const reqKey of args.requirementKeys) {
        const resolved = reqMap[reqKey];
        if (resolved) {
          requirementIds.push(Number(resolved.id));
        } else {
          warnings.push(
            `Requirement '${reqKey}' could not be resolved and was skipped.`,
          );
        }
      }

      if (requirementIds.length > 0) body.requirementIds = requirementIds;
    }

    if (args.filter) {
      body.filter = args.filter;
    }

    await this.client
      .getApiClient()
      .post(ENDPOINTS.LINK_REQUIREMENTS(entry.uid, versionNo), body);

    return {
      structuredContent: LinkRequirementsResponse.parse({
        key: args.key,
        versionNo,
        linked: true,
      }),
      content:
        warnings.length > 0
          ? [{ type: "text" as const, text: `Note: ${warnings.join(" | ")}` }]
          : [],
    };
  };
}
