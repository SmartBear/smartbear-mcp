import z from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import {ENDPOINTS, TOOL_NAMES, TOOLSETS} from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types";
import type { ResolvedRequirement } from "../../resolver/resolvers/requirement-id-resolver";
import type { ResolvedTestCase } from "../../resolver/resolvers/test-case-uid-resolver.ts";

const UnlinkRequirementsBody = z.object({
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
      "List of requirement keys to unlink (e.g., ['SCRUM-1', 'SCRUM-2']). Ignored when unLinkAll is true.",
    ),
  unLinkAll: z
    .boolean()
    .optional()
    .describe(
      "If true, all linked requirements are unlinked from this test case. Ignores requirementKeys when set.",
    ),
});

const UnlinkRequirementsResponse = z.object({
  key: z.string(),
  versionNo: z.number().int(),
  unlinked: z.literal(true),
});

export class UnlinkRequirements extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.UNLINK_REQUIREMENTS.TITLE,
    summary: TOOL_NAMES.UNLINK_REQUIREMENTS.SUMMARY,
    readOnly: false,
    idempotent: false,
    toolset:TOOLSETS.TEST_CASES,
    inputSchema: UnlinkRequirementsBody,
    outputSchema: UnlinkRequirementsResponse,
    purpose:
      "Unlink Jira requirements from a test case in QTM4J using the test case's human-readable key. " +
      "Specify individual requirement keys to unlink (resolved to internal IDs automatically), " +
      "or set unLinkAll to true to remove all linked requirements in one call. " +
      "Requirements that cannot be unlinked are reported as warnings. " +
      "PREREQUISITE: set_project_context must be called before this tool.",
    useCases: [
      "Remove specific requirements from a test case",
      "Unlink all requirements from a test case at once",
      "Clean up stale or incorrect requirement links from a test case",
      "Remove requirement associations from a specific test case version",
    ],
    examples: [
      {
        description: "Unlink specific requirements by key",
        parameters: {
          key: "SCRUM-TC-145",
          requirementKeys: ["SCRUM-1", "SCRUM-2"],
        },
        expectedOutput:
          "Requirements SCRUM-1 and SCRUM-2 unlinked from test case",
      },
      {
        description: "Unlink all requirements from a test case",
        parameters: { key: "SCRUM-TC-145", unLinkAll: true },
        expectedOutput: "All requirements unlinked from test case",
      },
      {
        description: "Unlink a requirement from a specific version",
        parameters: {
          key: "SCRUM-TC-85",
          versionNo: 2,
          requirementKeys: ["SCRUM-10"],
        },
        expectedOutput: "Requirement unlinked from version 2 of test case",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "KEY FORMAT: '{PROJECT_KEY}-TC-{number}' — e.g. 'SCRUM-TC-145'.",
      "Requirement keys follow the Jira issue key format: '{PROJECT_KEY}-{number}' (e.g. 'SCRUM-1').",
      "Set unLinkAll to true to remove all requirements in one call — no need to list them individually.",
      "If a requirement key cannot be resolved or unlinked, it is reported in warnings and others are still unlinked.",
      "versionNo defaults to the latest version. Use search_test_cases to find available versions if needed.",
    ],
    outputDescription:
      "Confirmation with the test case key, version number, and unlinked: true. Warnings are included if any requirements could not be resolved or unlinked.",
  };

  handle = async (rawArgs: any) => {
    const args = UnlinkRequirementsBody.parse(rawArgs);
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

    if (args.unLinkAll) {
      body.unLinkAll = true;
    } else if (args.requirementKeys?.length) {
      // Resolve requirement keys → numeric IDs
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

    await this.client
      .getApiClient()
      .post(ENDPOINTS.UNLINK_REQUIREMENTS(entry.uid, versionNo), body);

    return {
      structuredContent: UnlinkRequirementsResponse.parse({
        key: args.key,
        versionNo,
        unlinked: true,
      }),
      content:
        warnings.length > 0
          ? [{ type: "text" as const, text: `Note: ${warnings.join(" | ")}` }]
          : [],
    };
  };
}
