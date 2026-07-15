import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { Qtm4jClient } from "../../client.ts";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants.ts";
import { ResolverKeys } from "../../config/field-resolution.types.ts";
import type { ResolvedRequirement } from "../../resolver/resolvers/requirement-id-resolver.ts";
import type { ResolvedTestCycle } from "../../resolver/resolvers/test-cycle-uid-resolver.ts";
import {
  LinkRequirementsToCycleBody,
  LinkRequirementsToCycleResponse,
} from "../../schema/test-cycle.link.schema.ts";

export class LinkRequirementsToCycle extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.LINK_REQUIREMENTS_TO_CYCLE.TITLE,
    summary: TOOL_NAMES.LINK_REQUIREMENTS_TO_CYCLE.SUMMARY,
    readOnly: false,
    idempotent: false,
    toolset: TOOLSETS.TEST_CYCLES,
    inputSchema: LinkRequirementsToCycleBody,
    outputSchema: LinkRequirementsToCycleResponse,
    purpose:
      "Link Jira requirements to a QTM4J test cycle using the cycle's human-readable key. " +
      "The cycle key (e.g. 'SCRUM-TR-1') is resolved to the internal UID automatically. " +
      "Requirements can be specified by their human-readable keys (e.g. 'SCRUM-1') which are resolved to internal IDs automatically, " +
      "or via a JQL filter. Requirements that cannot be linked are reported as warnings. " +
      "PREREQUISITE: set_project_context must be called before this tool.",
    useCases: [
      "Link one or more Jira requirements (stories, bugs, epics) to a test cycle",
      "Associate requirements with a test cycle using a JQL filter",
      "Build traceability between requirements and a test cycle",
      "Link all stories from a sprint to a test cycle using JQL",
    ],
    examples: [
      {
        description: "Link two requirements by key",
        parameters: {
          cycleKey: "SCRUM-TR-1",
          requirementKeys: ["SCRUM-1", "SCRUM-2"],
        },
        expectedOutput: "Requirements SCRUM-1 and SCRUM-2 linked to test cycle",
      },
      {
        description: "Link requirements by JQL filter",
        parameters: {
          cycleKey: "SCRUM-TR-1",
          filter: { jql: "project = DEMO AND issuetype = Story" },
        },
        expectedOutput: "Requirements matched by JQL linked to test cycle",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "CYCLE KEY FORMAT: '{PROJECT_KEY}-TR-{id}' — e.g. 'SCRUM-TR-1'. Resolved to internal UID automatically.",
      "Requirement keys follow Jira issue key format: '{PROJECT_KEY}-{number}' (e.g. 'SCRUM-1').",
      "Provide either requirementKeys or filter.jql — not both.",
      "If a requirement key cannot be resolved or linked, it is reported in warnings and other requirements are still linked.",
    ],
    outputDescription:
      "Confirmation with the cycle key and linked: true. Warnings are included if any requirements could not be resolved or linked.",
  };

  handle = async (rawArgs: any) => {
    const args = LinkRequirementsToCycleBody.parse(rawArgs);
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
      .post(ENDPOINTS.LINK_REQUIREMENTS_TO_CYCLE(cycleEntry.uid), body);

    return {
      structuredContent: LinkRequirementsToCycleResponse.parse({
        cycleKey: args.cycleKey,
        linked: true,
      }),
      content:
        warnings.length > 0
          ? [{ type: "text" as const, text: `Note: ${warnings.join(" | ")}` }]
          : [],
    };
  };
}
