import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { Qtm4jClient } from "../../client.ts";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants.ts";
import { ResolverKeys } from "../../config/field-resolution.types.ts";
import type { ResolvedRequirement } from "../../resolver/resolvers/requirement-id-resolver.ts";
import type { ResolvedTestCycle } from "../../resolver/resolvers/test-cycle-uid-resolver.ts";
import {
  UnlinkRequirementsFromCycleBody,
  UnlinkRequirementsFromCycleResponse,
} from "../../schema/test-cycle.link.schema.ts";

export class UnlinkRequirementsFromCycle extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.UNLINK_REQUIREMENTS_FROM_CYCLE.TITLE,
    summary: TOOL_NAMES.UNLINK_REQUIREMENTS_FROM_CYCLE.SUMMARY,
    readOnly: false,
    idempotent: false,
    toolset: TOOLSETS.TEST_CYCLES,
    inputSchema: UnlinkRequirementsFromCycleBody,
    outputSchema: UnlinkRequirementsFromCycleResponse,
    purpose:
      "Unlink Jira requirements from a QTM4J test cycle using the cycle's human-readable key. " +
      "The cycle key (e.g. 'SCRUM-TR-1') is resolved to the internal UID automatically. " +
      "Requirements can be specified by their human-readable keys (e.g. 'SCRUM-1') which are resolved to internal IDs automatically, " +
      "or set unLinkAll to true to remove all requirements from the cycle in one call. " +
      "Requirements that cannot be unlinked are reported as warnings. " +
      "PREREQUISITE: set_project_context must be called before this tool.",
    useCases: [
      "Remove one or more Jira requirements from a test cycle by key",
      "Unlink all requirements from a test cycle at once",
      "Clean up requirement links before repopulating a test cycle",
    ],
    examples: [
      {
        description: "Unlink two requirements by key",
        parameters: {
          cycleKey: "SCRUM-TR-1",
          requirementKeys: ["SCRUM-1", "SCRUM-2"],
        },
        expectedOutput:
          "Requirements SCRUM-1 and SCRUM-2 unlinked from test cycle",
      },
      {
        description: "Unlink all requirements from a cycle",
        parameters: { cycleKey: "SCRUM-TR-1", unLinkAll: true },
        expectedOutput: "All requirements unlinked from test cycle",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "CYCLE KEY FORMAT: '{PROJECT_KEY}-TR-{id}' — e.g. 'SCRUM-TR-1'. Resolved to internal UID automatically.",
      "Requirement keys follow Jira issue key format: '{PROJECT_KEY}-{number}' (e.g. 'SCRUM-1').",
      "Provide either requirementKeys or unLinkAll: true — not both.",
      "unLinkAll: true removes every requirement from the cycle — no need to list them individually.",
      "If a requirement key cannot be resolved or unlinked, it is reported in warnings and other requirements are still unlinked.",
    ],
    outputDescription:
      "Confirmation with the cycle key and unlinked: true. Warnings are included if any requirements could not be resolved or unlinked.",
  };

  handle = async (rawArgs: any) => {
    const args = UnlinkRequirementsFromCycleBody.parse(rawArgs);
    const fieldResolver = this.client.getResolverRegistry();
    const context = fieldResolver.requireProjectContext();
    const warnings: string[] = [];

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
      .post(ENDPOINTS.UNLINK_REQUIREMENTS_FROM_CYCLE(cycleEntry.uid), body);

    return {
      structuredContent: UnlinkRequirementsFromCycleResponse.parse({
        cycleKey: args.cycleKey,
        unlinked: true,
      }),
      content:
        warnings.length > 0
          ? [{ type: "text" as const, text: `Note: ${warnings.join(" | ")}` }]
          : [],
    };
  };
}
