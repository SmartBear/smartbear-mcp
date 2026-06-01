import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import { ENDPOINTS, TOOL_NAMES } from "../../config/constants";
import { ResolverKeys } from "../../config/field-resolution.types";
import type { ResolvedTestCase } from "../../resolver/resolvers/test-case-uid-resolver.ts";
import type { ResolvedTestCycle } from "../../resolver/resolvers/test-cycle-uid-resolver.ts";
import {
  TestCycleLinkResponse,
  UnlinkTestCasesFromCycleBody,
} from "../../schema/test-cycle.link.schema.ts";

export class UnlinkTestCasesFromCycle extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.UNLINK_TESTCASES_FROM_CYCLE.TITLE,
    summary: TOOL_NAMES.UNLINK_TESTCASES_FROM_CYCLE.SUMMARY,
    readOnly: false,
    idempotent: false,
    inputSchema: UnlinkTestCasesFromCycleBody,
    outputSchema: TestCycleLinkResponse,
    purpose:
      "Unlink test cases from a QTM4J test cycle using the cycle's human-readable key. " +
      "The cycle key (e.g. 'SCRUM-TR-1') is resolved to the internal UID automatically. " +
      "Test cases can be specified by their human-readable keys (e.g. 'SCRUM-TC-1'), which are also resolved to internal IDs and latest versions automatically. " +
      "Alternatively, set unlinkAll to true to remove all test cases from the cycle in one call, " +
      "or use a filter to select which test cases to unlink by criteria. " +
      "The active project ID is injected automatically into the filter. " +
      "PREREQUISITE: set_project_context must be called before this tool.",
    useCases: [
      "Remove specific test cases from a test cycle by key",
      "Unlink all test cases from a test cycle at once",
      "Remove test cases matching a filter from a cycle (e.g., all 'Done' test cases)",
      "Clean up a test cycle before repopulating it",
    ],
    examples: [
      {
        description: "Unlink two specific test cases",
        parameters: {
          cycleKey: "SCRUM-TR-1",
          testCaseKeys: ["SCRUM-TC-10", "SCRUM-TC-11"],
        },
        expectedOutput: "Test cases unlinked from test cycle",
      },
      {
        description: "Unlink all test cases from a cycle",
        parameters: { cycleKey: "SCRUM-TR-1", unlinkAll: true },
        expectedOutput: "All test cases unlinked from cycle",
      },
      {
        description: "Unlink test cases matching a status filter",
        parameters: {
          cycleKey: "SCRUM-TR-5",
          filter: { status: ["Done"], labels: ["Deprecated"] },
        },
        expectedOutput: "Filtered test cases unlinked from cycle",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "CYCLE KEY FORMAT: '{PROJECT_KEY}-TR-{id}' — e.g. 'SCRUM-TR-1'. Resolved to internal UID automatically.",
      "TEST CASE KEY FORMAT: '{PROJECT_KEY}-TC-{number}' — e.g. 'SCRUM-TC-145'.",
      "Provide exactly one of: testCaseKeys, unlinkAll, or filter.",
      "unlinkAll: true removes every test case from the cycle — no need to list them individually.",
      "projectId in filter is auto-filled from the active project context — do not set it manually.",
      "If a test case key cannot be resolved, it is reported in warnings and others are still unlinked.",
    ],
    outputDescription:
      "Confirmation with the cycle key and unlinked: true. Warnings included if any test cases could not be resolved or unlinked.",
  };

  handle = async (rawArgs: any) => {
    const args = UnlinkTestCasesFromCycleBody.parse(rawArgs);
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

    if (args.unlinkAll) {
      body.unlinkAll = true;
    } else if (args.testCaseKeys?.length) {
      // Resolve test case keys → [{id: uid, versionNo}]
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

      if (testCases.length > 0) body.testCases = testCases;
    }

    // Pass filter with auto-injected projectId
    if (args.filter) {
      body.filter = { ...args.filter, projectId: context.projectId };
    }

    await this.client
      .getApiClient()
      .delete(ENDPOINTS.UNLINK_TESTCASES_FROM_CYCLE(cycleEntry.uid), body);

    return {
      structuredContent: TestCycleLinkResponse.parse({
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
