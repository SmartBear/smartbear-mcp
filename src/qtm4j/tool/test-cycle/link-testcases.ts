import { Tool, ToolError } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { Qtm4jClient } from "../../client.ts";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants.ts";
import { ResolverKeys } from "../../config/field-resolution.types.ts";
import type { ResolvedTestCase } from "../../resolver/resolvers/test-case-uid-resolver.ts";
import type { ResolvedTestCycle } from "../../resolver/resolvers/test-cycle-uid-resolver.ts";
import {
  LinkTestCasesToCycleBody,
  TestCycleLinkResponse,
} from "../../schema/test-cycle.link.schema.ts";

export class LinkTestCasesToCycle extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.LINK_TESTCASES_TO_CYCLE.TITLE,
    summary: TOOL_NAMES.LINK_TESTCASES_TO_CYCLE.SUMMARY,
    readOnly: false,
    idempotent: false,
    toolset: TOOLSETS.TEST_CYCLES,
    inputSchema: LinkTestCasesToCycleBody,
    outputSchema: TestCycleLinkResponse,
    purpose:
      "Link test cases to a QTM4J test cycle using the cycle's human-readable key. " +
      "The cycle key (e.g. 'SCRUM-TR-1') is resolved to the internal UID automatically. " +
      "Test cases can be specified by their human-readable keys (e.g. 'SCRUM-TC-1'), which are also resolved to internal IDs and latest versions automatically. " +
      "Alternatively, use a filter object to select test cases by criteria such as status, priority, labels, or folder. " +
      "The active project ID is injected automatically into the filter. " +
      "Test cases that cannot be linked are reported in warnings. " +
      "PREREQUISITE: set_project_context must be called before this tool.",
    useCases: [
      "Add specific test cases to a test cycle by key",
      "Populate a test cycle with test cases matching a filter (e.g., all High priority test cases)",
      "Link test cases from a specific folder to a test cycle",
      "Add test cases to a cycle with a specific assignee or environment",
    ],
    examples: [
      {
        description: "Link two test cases by key",
        parameters: {
          cycleKey: "SCRUM-TR-1",
          testCaseKeys: ["SCRUM-TC-10", "SCRUM-TC-11"],
        },
        expectedOutput: "Test cases linked to test cycle",
      },
      {
        description: "Link test cases matching a filter with assignee",
        parameters: {
          cycleKey: "SCRUM-TR-1",
          filter: { priority: ["High"], status: ["To Do"] },
          // biome-ignore lint/security/noSecrets: example Jira account ID, not a secret
          assignee: "5b10a2844c20165700ede21f",
          startNewExecution: true,
        },
        expectedOutput: "Filtered test cases linked to cycle with assignee",
      },
      {
        description: "Link test cases in a folder to a cycle with planned date",
        parameters: {
          cycleKey: "SCRUM-TR-5",
          filter: { folderId: 42, withChild: true },
          executionPlannedDate: "2024-03-31",
          sort: "key:asc",
        },
        expectedOutput: "Folder test cases linked to cycle with planned date",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "CYCLE KEY FORMAT: '{PROJECT_KEY}-TR-{id}' — e.g. 'SCRUM-TR-1'. Resolved to internal UID automatically.",
      "TEST CASE KEY FORMAT: '{PROJECT_KEY}-TC-{number}' — e.g. 'SCRUM-TC-145'.",
      "Provide either testCaseKeys or filter — not both.",
      "projectId in filter is auto-filled from the active project context — do not set it manually.",
      "filter.excludeCycleId excludes test cases already in another cycle.",
      "startNewExecution: true creates a fresh execution record for each linked test case.",
      "executionPlannedDate must be in yyyy-MM-dd format (e.g., '2024-03-31').",
      "actualTime must be in HH:mm format (e.g., '02:30').",
      "If a test case key cannot be resolved, it is reported in warnings and others are still linked.",
    ],
    outputDescription:
      "Confirmation with the cycle key and linked: true. Warnings included if any test cases could not be resolved or linked.",
  };

  // biome-ignore lint/complexity/noExcessiveLinesPerFunction: single sequential tool handler; splitting would fragment one linear resolve→request→respond flow
  handle = async (rawArgs: unknown) => {
    const args = LinkTestCasesToCycleBody.parse(rawArgs);
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

    // Resolve test case keys → [{id: uid, versionNo}]
    if (args.testCaseKeys && args.testCaseKeys.length > 0) {
      const uidMap = (await fieldResolver
        .getResolver(ResolverKeys.SearchableField.TEST_CASE_KEY_TO_UID)
        .resolveAndReturn(context.projectId, args.testCaseKeys)) as Record<
        string,
        ResolvedTestCase
      >;

      const testCases: { id: string; versionNo: number }[] = [];
      for (const tcKey of args.testCaseKeys) {
        const resolved = uidMap[tcKey];
        if (resolved) {
          testCases.push({
            id: resolved.uid,
            versionNo: resolved.latestVersion,
          });
        } else {
          warnings.push(
            `Test case '${tcKey}' could not be resolved and was skipped.`,
          );
        }
      }

      if (testCases.length > 0) {
        body.testCases = testCases;
      }
    }

    // Pass filter with auto-injected projectId
    if (args.filter) {
      body.filter = { ...args.filter, projectId: context.projectId };
    }

    // Pass optional top-level params (undefined values stripped by JSON.stringify)
    const {
      cycleKey: _cycleKey,
      testCaseKeys: _tcKeys,
      filter: _filter,
      ...rest
    } = args;
    Object.assign(body, rest);

    await this.client
      .getApiClient()
      .post(ENDPOINTS.LINK_TESTCASES_TO_CYCLE(cycleEntry.uid), body);

    return {
      structuredContent: TestCycleLinkResponse.parse({
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
