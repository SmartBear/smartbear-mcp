import { Tool } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { Qtm4jClient } from "../../client.ts";
import { ENDPOINTS, TOOL_NAMES, TOOLSETS } from "../../config/constants.ts";
import {
  GetAutomationHistoryBody,
  GetAutomationHistoryResponse,
  type GetAutomationHistoryResponseType,
} from "../../schema/automation.schema.ts";

export class GetAutomationHistory extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.GET_AUTOMATION_HISTORY.TITLE,
    toolset: TOOLSETS.TEST_AUTOMATION,
    summary: TOOL_NAMES.GET_AUTOMATION_HISTORY.SUMMARY,
    readOnly: true,
    idempotent: true,
    inputSchema: GetAutomationHistoryBody,
    outputSchema: GetAutomationHistoryResponse,
    purpose:
      "Retrieve a paginated list of past automation result uploads from QTM4J. " +
      "Use this to review upload history, check upload statuses, and audit past CI/CD automation runs. " +
      "No set_project_context call is required.",
    useCases: [
      "Review past automation result uploads for a project",
      "Check the status of recent automation imports",
      "Audit CI/CD automation upload history",
      "Paginate through all historical automation uploads",
    ],
    examples: [
      {
        description:
          "Get the first page of automation upload history (default page size 20)",
        parameters: {},
        expectedOutput:
          "Paginated list of automation history records with upload status and metadata",
      },
      {
        description: "Get the second page of automation upload history",
        parameters: {
          startAt: 20,
          maxResults: 20,
        },
        expectedOutput: "Next 20 automation history records",
      },
      {
        description: "Get up to 50 records starting from the beginning",
        parameters: {
          startAt: 0,
          maxResults: 50,
        },
        expectedOutput: "Up to 50 automation history records",
      },
    ],
    hints: [
      "NO PROJECT CONTEXT REQUIRED: Do NOT call set_project_context and do NOT ask the user for a project key, project ID, or any other project details. This tool works independently.",
      "PAGINATION: startAt is zero-indexed (default: 0), maxResults controls page size (default: 20, max: 100). Increment startAt by maxResults to fetch the next page.",
      "Returns an empty data array (not an error) when no history records exist.",
      "DISPLAY FORMAT: Show '1–N of <total>' above all cards. Render each record as a card separated by --- dividers. Each card has two sections:\n\n" +
        "PRIMARY SECTION (always first): heading with status emoji (✅ SUCCESS / ❌ FAILED) + test cycle key and name; then format, start→end time, message, summary stats (test cases/versions created/reused/test steps), tracking ID.\n\n" +
        "EXTRA DETAILS SECTION (at the bottom of the card, under a 'Details' sub-label): any remaining non-null fields from the record such as fileSize, extraAttributes values, etc.\n\n" +
        "Skip any field that is null, missing, or false. NEVER show the raw fileName. NEVER use a table.",
    ],
    outputDescription:
      "Paginated list of automation import history. Each record includes: format, processStatus, importStatus, startTime, endTime, trackingId, detailedMessage, and a summary array. " +
      "summary[0] contains: testCycleIssueKey, testCycleSummary, testCasesCreated, testCaseVersionsCreated, testCaseVersionsReused, testStepsCreated. " +
      "Render as individual cards separated by dividers, NOT a table. Show '1–N of total' count above. Never show raw fileName.",
  };

  handle = async (rawArgs: any) => {
    const args = GetAutomationHistoryBody.parse(rawArgs);
    const apiClient = this.client.getApiClient();

    const response = await apiClient.getAutomation(
      ENDPOINTS.AUTOMATION_HISTORY,
      {
        startAt: args.startAt,
        maxResults: args.maxResults,
      },
    );

    const result: GetAutomationHistoryResponseType =
      GetAutomationHistoryResponse.parse(response);

    return {
      structuredContent: result,
      content: [],
    };
  };
}
