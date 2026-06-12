import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { Qtm4jClient } from "../../client";
import {
  ENDPOINTS,
  RESPONSE_FIELDS,
  TOOL_NAMES,
  TOOLSETS,
} from "../../config/constants";
import {
  SearchTestCaseBody,
  SearchTestCaseResponse,
  type SearchTestCaseResponseType,
} from "../../schema/get-test-case.schema";

export class GetTestCases extends Tool<Qtm4jClient> {
  specification: ToolParams = {
    title: TOOL_NAMES.SEARCH_TEST_CASES.TITLE,
    toolset: TOOLSETS.TEST_CASES,
    summary: TOOL_NAMES.SEARCH_TEST_CASES.SUMMARY,
    readOnly: true,
    idempotent: true,
    inputSchema: SearchTestCaseBody,
    outputSchema: SearchTestCaseResponse,
    purpose:
      "Search and filter test cases in a QTM4J project. " +
      "The filter object is sent in the request body; fields, sort, startAt, and maxResults are sent as URL query parameters. " +
      "All filter values accept string names directly (e.g., status: ['Done'], priority: ['High'], labels: ['Release_1']). " +
      "PREREQUISITE: set_project_context must be called before this tool.",
    useCases: [
      "Search all test cases in a project",
      "Filter test cases by status (e.g., 'Done', 'To Do', 'In Progress')",
      "Filter test cases by priority (e.g., 'High', 'Medium', 'Low')",
      "Filter test cases by labels and components",
      "Search test cases by text in summary and description",
      "Filter test cases by assignee or reporter",
      "Filter test cases by creation/update date ranges",
      "Filter test cases by automation status",
      "Request only specific fields to reduce response size",
      "Sort results using the sort query param (e.g., 'created:desc', 'priority:asc')",
      "Paginate through large result sets using startAt and maxResults",
      "Combine multiple filters for complex queries",
      "Find all failed test cases that need attention (by status and execution date)",
      "Get test cases for sprint planning (filter by sprint and status)",
      "Audit test coverage by searching for untested areas (filter by executed date)",
      "Find all manual test cases assigned to a specific tester",
      "Generate test reports by filtering and sorting test cases",
      "Track test case changes over time (filter by update date range)",
      "Identify high-priority test cases pending review",
      "Search for test cases related to specific features (using searchText)",
      "Find duplicate or similar test cases (using searchText)",
      "Get automated vs manual test distribution (filter by isAutomated)",
      "Monitor test execution trends (filter by executed date ranges)",
      "Prepare test execution schedules (filter by assignee and priority)",
    ],
    examples: [
      {
        description: "Search all test cases in the project",
        parameters: {},
        expectedOutput:
          "Paginated list of all test cases with all fields (first 50 results)",
      },
      {
        description: "Filter test cases by status",
        parameters: {
          filter: {
            status: ["Done"],
          },
        },
        expectedOutput: "List of test cases with 'Done' status",
      },
      {
        description:
          "Filter by multiple statuses and priorities with specific fields",
        parameters: {
          filter: {
            status: ["Done", "To Do"],
            priority: ["High", "Medium"],
          },
          fields: ["key", "summary", "status", "priority", "assignee"],
        },
        expectedOutput:
          "Test cases matching the filters with only the selected fields returned",
      },
      {
        description: "Search test cases by text in summary/description",
        parameters: {
          filter: {
            searchText: "login functionality",
          },
        },
        expectedOutput:
          "Test cases containing 'login functionality' in summary or description",
      },
      {
        description: "Filter by labels and components",
        parameters: {
          filter: {
            labels: ["Release_1", "Sprint 1"],
            components: ["UI", "Cloud"],
          },
        },
        expectedOutput:
          "Test cases tagged with the specified labels and components",
      },
      {
        description: "Filter by assignee and automation status",
        parameters: {
          filter: {
            assignee: ["712020:ddc8e24b-2de7-404b-b9ed-3d7b241e2ced"],
            isAutomated: false,
          },
        },
        expectedOutput: "Manual test cases assigned to the specified user",
      },
      {
        description: "Filter by creation date range",
        parameters: {
          filter: {
            createdOnFrom: "01/Jan/2026",
            createdOnTo: "31/Dec/2026",
          },
        },
        expectedOutput: "Test cases created during 2026",
      },
      {
        description: "Paginate and sort by creation date (newest first)",
        parameters: {
          filter: {
            status: ["Done"],
          },
          startAt: 0,
          maxResults: 50,
          sort: "created:desc",
        },
        expectedOutput:
          "First 50 'Done' test cases sorted by creation date, newest first",
      },
      {
        description: "Get all available fields for test cases",
        parameters: {
          filter: {},
          fields: [
            "key",
            "summary",
            "description",
            "priority",
            "status",
            "assignee",
            "isAutomated",
            "reporter",
            "estimatedTime",
            "labels",
            "components",
            "fixVersions",
            "sprint",
            "folders",
            "updated",
            "created",
            "executed",
            "flakyScore",
            "passRateScore",
            "aiGenerated",
            "precondition",
            "orderNo",
            "seqNo",
            "version",
          ],
        },
        expectedOutput:
          "Test cases with all available fields explicitly requested",
      },
      {
        description: "Filter by folder and fix version",
        parameters: {
          filter: {
            folders: [123, 456],
            fixVersions: [789],
          },
        },
        expectedOutput: "Test cases in the specified folders and fix versions",
      },
      {
        description:
          "Complex filter: multiple criteria combined with multi-field sort",
        parameters: {
          filter: {
            status: ["Done", "In Progress"],
            priority: ["High"],
            labels: ["Release_1"],
            isAutomated: false,
            createdOnFrom: "01/Apr/2026",
            createdOnTo: "30/Apr/2026",
          },
          fields: ["key", "summary", "status", "priority", "created"],
          sort: "priority:asc,created:desc",
        },
        expectedOutput:
          "High-priority manual test cases created in April 2026 with 'Done' or 'In Progress' status, " +
          "sorted by priority ascending then creation date descending",
      },
      {
        description: "Find all automated test cases for CI/CD pipeline",
        parameters: {
          filter: {
            isAutomated: true,
            status: ["Done", "In Progress"],
          },
          fields: ["key", "summary", "status", "labels", "components"],
        },
        expectedOutput:
          "Up to 50 automated test cases ready for execution in CI/CD",
      },
      {
        description:
          "Sprint planning: get pending test cases for a team, sorted by priority",
        parameters: {
          filter: {
            status: ["To Do", "In Progress"],
            assignee: [
              "712020:ddc8e24b-2de7-404b-b9ed-3d7b241e2ced",
              "712020:b8479b55-6d23-478c-a2ad-4c8ce176e1fc",
            ],
            priority: ["High", "Medium"],
          },
          fields: [
            "key",
            "summary",
            "status",
            "priority",
            "assignee",
            "estimatedTime",
          ],
          sort: "priority:desc",
        },
        expectedOutput:
          "Pending high and medium priority test cases assigned to the team, sorted by priority descending",
      },
      {
        description:
          "Test coverage report: find completed cases sorted oldest first",
        parameters: {
          filter: {
            status: ["Done"],
          },
          fields: ["key", "summary", "priority", "created", "assignee"],
          sort: "created:asc",
        },
        expectedOutput:
          "Completed test cases sorted by creation date, oldest first",
      },
      {
        description: "Find test cases by keyword for regression testing",
        parameters: {
          filter: {
            searchText: "authentication login",
            status: ["Done"],
          },
          fields: ["key", "summary", "description", "labels", "components"],
        },
        expectedOutput:
          "All completed test cases related to authentication/login functionality",
      },
      {
        description: "Weekly test execution summary",
        parameters: {
          filter: {
            executedOnFrom: "27/Apr/2026",
            executedOnTo: "03/May/2026",
          },
          fields: [
            "key",
            "summary",
            "status",
            "executed",
            "passRateScore",
            "flakyScore",
          ],
          sort: "executed:desc",
        },
        expectedOutput:
          "Test cases executed in the past week with their pass rates and flaky scores, sorted most-recent first",
      },
    ],
    hints: [
      "PREREQUISITE: set_project_context must be called before this tool. NEVER auto-select a project.",
      "REQUEST STRUCTURE: filter goes in the request body; fields, sort, startAt, and maxResults are URL query parameters.",
      "The 'projectId' inside filter is auto-populated from the active project context if not provided.",
      "All filter values accept string names directly — no ID resolution needed (e.g., status: ['Done'], priority: ['High']).",
      "FIELDS: Pass as an array (sent as comma-separated URL param). Example: { fields: ['key', 'summary', 'status'] }. Omit to return all fields.",
      "Available fields: key, summary, description, priority, status, assignee, isAutomated, reporter, estimatedTime, labels, components, fixVersions, sprint, folders, updated, created, executed, flakyScore, passRateScore, aiGenerated, precondition, orderNo, seqNo, version",
      "SORTING: Use 'sort' with format 'fieldName:order' (asc/desc). Multiple fields: 'priority:asc,created:desc'. Sortable fields: key, summary, created, updated, status, priority, executed.",
      "PAGINATION: startAt (default: 0) and maxResults (default: 50, max: 50) are sent as URL query params. Increment startAt by 50 to get the next page. Stop when startAt >= total.",
      "Date format for all filter date fields: 'dd/MMM/yyyy' (e.g., '17/Apr/2026', '01/Jan/2026'). Case-sensitive.",
      "FILTER LOGIC: Multiple values within one filter field use OR (status: ['Done', 'To Do'] = Done OR To Do).",
      "FILTER LOGIC: Different filter fields are combined with AND (status + priority = both must match).",
      "The 'searchText' filter searches both summary and description fields (case-insensitive). To get details of a specific test case by its key (e.g., 'SCRUM-TC-145'), pass the key as filter.searchText — there is no separate key filter field.",
      "For assignee/reporter filters, use Jira account IDs (format: '712020:uuid'). Multiple IDs = OR logic.",
      "Omitting filter entirely returns all test cases in the active project (paginated).",
    ],
    outputDescription:
      "JSON object with total (total matching test cases), startAt, maxResults, and data (array of test case objects for this page).",
  };

  handle = async (rawArgs: any) => {
    const args = SearchTestCaseBody.parse(rawArgs);

    const context = this.client.getResolverRegistry().requireProjectContext();

    if (!args.filter) {
      args.filter = {};
    }
    if (!args.filter.projectId) {
      args.filter.projectId = String(context.projectId);
    }

    const params = new URLSearchParams();
    if (args.fields?.length)
      params.set(RESPONSE_FIELDS.FIELDS, args.fields.join(","));
    if (args.sort) params.set(RESPONSE_FIELDS.SORT, args.sort);
    params.set(RESPONSE_FIELDS.START_AT, String(args.startAt));
    params.set(RESPONSE_FIELDS.MAX_RESULTS, String(args.maxResults));

    const endpoint = `${ENDPOINTS.SEARCH_TEST_CASES}?${params.toString()}`;

    const response = await this.client
      .getApiClient()
      .post(endpoint, { filter: args.filter });

    const validated: SearchTestCaseResponseType =
      SearchTestCaseResponse.parse(response);

    return {
      structuredContent: validated,
      content: [],
    };
  };
}
