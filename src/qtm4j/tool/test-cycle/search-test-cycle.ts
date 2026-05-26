import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import { ENDPOINTS, RESPONSE_FIELDS, TOOL_NAMES } from "../../config/constants";
import {
  SearchTestCycleBody,
  SearchTestCycleResponse,
  type SearchTestCycleResponseType,
} from "../../schema/search-test-cycle.schema";

/**
 * SearchTestCycles Tool
 *
 * Searches and filters test cycles in a QTM4J project.
 * Filter fields are sent in the POST body; pagination, sort, and field-selection
 * are passed as URL query parameters — the same pattern as SearchTestCases.
 */
export class SearchTestCycles extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.SEARCH_TEST_CYCLES.TITLE,
    summary: TOOL_NAMES.SEARCH_TEST_CYCLES.SUMMARY,
    readOnly: true,
    idempotent: true,
    inputSchema: SearchTestCycleBody,
    outputSchema: SearchTestCycleResponse,
    purpose:
      "Search and filter test cycles in a QTM4J project. " +
      "projectId is auto-injected from the active project context — do not provide it.",
    useCases: [
      "Find test cycles by status, priority, assignee, reporter, or folder",
      "Find test cycles by planned execution date range (plannedStartDate / plannedEndDate)",
      "Find test cycles created or updated within a date range (createdOn / updatedOn)",
      "Search test cycles by keyword across key, summary, and description",
      "Paginate, sort, and select specific response fields",
    ],
    examples: [
      {
        description: "Find all in-progress and to-do cycles",
        parameters: { filter: { status: ["In Progress", "To Do"] } },
        expectedOutput: "Paginated list of matching test cycles",
      },
      {
        description: "Find cycles owned by a specific user",
        parameters: { filter: { assignee: ["5b10a2844c20165700ede21f"] } },
        expectedOutput: "Test cycles assigned to that user",
      },
      {
        description:
          "Find cycles with planned start date in a range, requesting date fields explicitly",
        parameters: {
          filter: { plannedStartDate: "01/Apr/2026,30/Apr/2026" },
          fields: [
            "key",
            "summary",
            "status",
            "assignee",
            "plannedStartDate",
            "plannedEndDate",
          ],
        },
        expectedOutput:
          "Cycles with planned start date in April 2026 including date fields",
      },
      {
        description:
          "Keyword search with sort, pagination, and selected fields",
        parameters: {
          filter: { searchText: "regression" },
          fields: ["key", "summary", "status", "assignee"],
          sort: "plannedStartDate:asc",
          startAt: 0,
          maxResults: 25,
        },
        expectedOutput:
          "Cycles matching 'regression', sorted by planned start date",
      },
      {
        description: "Find cycles created last week",
        parameters: {
          filter: { createdOn: "01/May/2026,07/May/2026" },
          fields: ["key", "summary", "status", "assignee"],
          sort: "key:asc",
        },
        expectedOutput: "Test cycles created between 01 May and 07 May 2026",
      },
      {
        description: "Find high-priority cycles updated recently by reporter",
        parameters: {
          filter: {
            priority: ["High"],
            reporter: ["5b10a2844c20165700ede21f"],
            updatedOn: "01/May/2026,21/May/2026",
          },
          fields: ["key", "summary", "status", "priority", "assignee"],
        },
        expectedOutput:
          "High-priority cycles updated in May 2026 reported by that user",
      },
      {
        description: "All filters combined with explicit field selection",
        parameters: {
          filter: {
            status: ["In Progress"],
            priority: ["High", "Medium"],
            assignee: ["5b10a2844c20165700ede21f"],
            folderId: 109987,
            plannedStartDate: "02/Apr/2026,15/May/2026",
            searchText: "regression",
          },
          fields: [
            "key",
            "summary",
            "status",
            "priority",
            "assignee",
            "plannedStartDate",
          ],
          sort: "plannedStartDate:asc",
          maxResults: 25,
        },
        expectedOutput:
          "Test cycles matching all specified filters with selected fields",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "SUPPORTED FILTER FIELDS: status, priority, assignee, reporter, folderId, labels, components, plannedStartDate, plannedEndDate, searchText, createdOn, updatedOn, isAutomated, aiGenerated. Do NOT use any other filter field names.",
      "DATE FILTERS: createdOn = creation date; updatedOn = last-updated date; plannedStartDate / plannedEndDate = planned execution window. Format: 'dd/MMM/yyyy,dd/MMM/yyyy' e.g. '01/May/2026,21/May/2026'. Month is case-sensitive. 'Created last week' → createdOn, NOT plannedStartDate.",
      "FIELDS: Pass as an array to select what to return. plannedStartDate and plannedEndDate are NOT in the default response — include them explicitly. Available: key, summary, description, status, priority, assignee, reporter, isAutomated, plannedStartDate, plannedEndDate, labels, components, fixVersions, sprint, defectCount, estimatedTime, actualTime, created, updated.",
      "REQUEST STRUCTURE: filter → request body; fields, sort, startAt, maxResults → URL query params.",
      "SORT: Allowed fields: key, summary, status, plannedStartDate, plannedEndDate, defectCount. Format: 'fieldName:asc' or 'fieldName:desc' e.g. 'plannedStartDate:asc'.",
      "FOLDER ID: folderId in fields.testCycle and fields.testCase is a numeric ID. Tell the user they can get it by right-clicking the target folder in QTM4J and selecting 'Copy Folder Id'. Always ask the user for the numeric ID directly — never try to look it up.",
    ],
    outputDescription:
      "JSON object with total (matching cycles across all pages), startAt, maxResults, and data (array of test cycle objects for this page). " +
      "Each item always has id and key. Other fields depend on what was requested via the fields parameter.",
  };

  handle = async (rawArgs: any) => {
    const args = SearchTestCycleBody.parse(rawArgs);
    const context = this.client.getResolverRegistry().requireProjectContext();

    // Inject projectId into the filter body — never exposed to the LLM.
    if (!args.filter) args.filter = {};
    args.filter.projectId = context.projectId;

    // Pagination, sort, and field selection are URL query params, not body fields.
    const params = new URLSearchParams();
    if (args.fields?.length)
      params.set(RESPONSE_FIELDS.FIELDS, args.fields.join(","));
    params.set(RESPONSE_FIELDS.START_AT, String(args.startAt));
    params.set(RESPONSE_FIELDS.MAX_RESULTS, String(args.maxResults));
    params.set(RESPONSE_FIELDS.SORT, args.sort);

    const endpoint = `${ENDPOINTS.SEARCH_TEST_CYCLES}?${params.toString()}`;
    const response = await this.client
      .getApiClient()
      .post(endpoint, { filter: args.filter });

    const validated: SearchTestCycleResponseType =
      SearchTestCycleResponse.parse(response);

    return {
      structuredContent: validated,
      content: [],
    };
  };
}
