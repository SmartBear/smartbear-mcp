import { z } from "zod";
import { TypesafeTool } from "../../../common/tools";
import type { BugsnagClient } from "../../client";
import type { FilterObject } from "../../client/filters";
import { toolInputParameters } from "../../input-schemas";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
  filters: toolInputParameters.filters.describe(
    "Apply filters to narrow down the error list. Use the List Project Event Filters tool to discover available filter fields. " +
      "Time filters support extended ISO 8601 format (e.g. 2018-05-20T00:00:00Z) or relative format (e.g. 7d, 24h).",
  ),
  sort: toolInputParameters.sort,
  direction: toolInputParameters.direction,
  perPage: toolInputParameters.perPage,
  nextUrl: toolInputParameters.nextUrl,
});

// Lists errors in a project with optional filters, sorting, and pagination.
export const listProjectErrors = new TypesafeTool(
  {
    title: "List Project Errors",
    summary:
      "List and search errors in a project using customizable filters and pagination",
    purpose:
      "Retrieve filtered list of errors from a project for analysis, debugging, and reporting",
    useCases: [
      "Debug recent application errors by filtering for open errors in the last 7 days",
      "Generate error reports for stakeholders by filtering specific error types or severity levels",
      "Monitor error trends over time using date range filters",
      "Find errors affecting specific users or environments using metadata filters",
    ],
    inputSchema,
    examples: [
      {
        description:
          "Find errors affecting a specific user in the last 24 hours",
        parameters: {
          filters: {
            "user.email": [{ type: "eq", value: "user@example.com" }],
            "event.since": [{ type: "eq", value: "24h" }],
          },
        },
        expectedOutput:
          "JSON object with a list of errors in the 'data' field, a count of the current page of results in the 'count' field, and a total count of all results in the 'total' field",
      },
      {
        description:
          "Get the 10 open errors with the most users affected in the last 30 days",
        parameters: {
          filters: {
            "event.since": [{ type: "eq", value: "30d" }],
            "error.status": [{ type: "eq", value: "open" }],
          },
          sort: "users",
          direction: "desc",
          perPage: 10,
        },
        expectedOutput:
          "JSON object with a list of errors in the 'data' field, a count of the current page of results in the 'count' field, and a total count of all results in the 'total' field",
      },
      {
        description: "Get the next 50 results",
        parameters: {
          nextUrl:
            "https://api.bugsnag.com/projects/515fb9337c1074f6fd000003/errors?base=2025-08-29T13%3A11%3A37Z&direction=desc&filters%5Berror.status%5D%5B%5D%5Btype%5D=eq&filters%5Berror.status%5D%5B%5D%5Bvalue%5D=open&offset=10&per_page=10&sort=users",
          perPage: 50,
        },
        expectedOutput:
          "JSON object with a list of errors, with a URL to the next page if more results are available and a total count of all errors matched",
      },
    ],
    hints: [
      "Use List Project Event Filters tool first to discover valid filter field names for your project",
      "Combine multiple filters to narrow results - filters are applied with AND logic",
      "For time filters: use relative format (7d, 24h) for recent periods or ISO 8601 UTC format (2018-05-20T00:00:00Z) for specific dates",
      "Common time filters: event.since (from this time), event.before (until this time)",
      "The 'event.since' filter and 'error.status' filters are always applied and if not specified are set to '30d' and 'open' respectively",
      "There may not be any errors matching the filters - this is not a problem with the tool, in fact it might be a good thing that the user's application had no errors",
      "This tool returns paged results. The 'page_error_count' field indicates the number of results returned in the current page, and the 'total_error_count' field indicates the total number of results across all pages.",
      "If the output contains a 'next_url' value, there are more results available - call this tool again supplying the next URL as a parameter to retrieve the next page.",
      "Do not modify the next URL as this can cause incorrect results. The only other parameter that can be used with 'next' is 'per_page' to control the page size.",
    ],
  },
  (client: BugsnagClient) => async (params, _extra) => {
    const project = await client.getInputProject(params.projectId);

    const filters: FilterObject = {
      "event.since": [{ type: "eq", value: "30d" }],
      "error.status": [{ type: "eq", value: "open" }],
      ...params.filters,
    };

    // Validate filter keys against cached event fields
    await client.validateEventFields(project, filters);

    const response = await client.errorsApi.listProjectErrors(
      project.id,
      null,
      params.sort,
      params.direction,
      params.perPage,
      filters,
      params.nextUrl,
    );

    const result = {
      data: response.body,
      next_url: response.nextUrl ?? undefined,
      data_count: response.body?.length,
      total_count: response.totalCount ?? undefined,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(result) }],
    };
  },
);
