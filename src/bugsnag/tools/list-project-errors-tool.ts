/**
 * List Project Errors Tool
 *
 * Lists and searches errors in a project using customizable filters and pagination.
 * Supports complex filter handling, default parameter logic, and pagination with next URL generation.
 */

import {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  BaseBugsnagTool,
  ProjectArgs,
  PaginationArgs,
  SortingArgs,
  SharedServices
} from "../types.js";
import {
  CommonParameterDefinitions,
  validateToolArgs,

  executeWithErrorHandling,
  formatPaginatedResult,
  TOOL_DEFAULTS
} from "../utils/tool-utilities.js";
import { FilterObject } from "../client/api/filters.js";
import { ListProjectErrorsOptions } from "../client/api/Error.js";
import { EventField } from "../client/api/Project.js";

/**
 * Arguments interface for the List Project Errors tool
 */
export interface ListProjectErrorsArgs extends ProjectArgs, PaginationArgs, SortingArgs {
  filters?: FilterObject;
  sort?: "first_seen" | "last_seen" | "events" | "users" | "unsorted";
  direction?: "asc" | "desc";
  per_page?: number;
  next?: string;
}

/**
 * List Project Errors Tool implementation
 *
 * Provides comprehensive error listing with filtering, sorting, and pagination capabilities.
 * Includes default filters for common use cases and validates filter keys against project event fields.
 */
export class ListProjectErrorsTool extends BaseBugsnagTool {
  readonly name = "list_project_errors";

  readonly definition: ToolDefinition = {
    title: "List Project Errors",
    summary: "List and search errors in a project using customizable filters and pagination",
    purpose: "Retrieve filtered list of errors from a project for analysis, debugging, and reporting",
    useCases: [
      "Debug recent application errors by filtering for open errors in the last 7 days",
      "Generate error reports for stakeholders by filtering specific error types or severity levels",
      "Monitor error trends over time using date range filters",
      "Find errors affecting specific users or environments using metadata filters"
    ],
    parameters: [
      CommonParameterDefinitions.filters(false, TOOL_DEFAULTS.DEFAULT_FILTERS),
      CommonParameterDefinitions.sort(["first_seen", "last_seen", "events", "users", "unsorted"], "last_seen"),
      CommonParameterDefinitions.direction("desc"),
      CommonParameterDefinitions.perPage(30),
      CommonParameterDefinitions.nextUrl()
    ],
    examples: [
      {
        description: "Find errors affecting a specific user in the last 24 hours",
        parameters: {
          filters: {
            "user.email": [{ "type": "eq", "value": "user@example.com" }],
            "event.since": [{ "type": "eq", "value": "24h" }]
          }
        },
        expectedOutput: "JSON object with a list of errors in the 'data' field, a count of the current page of results in the 'count' field, and a total count of all results in the 'total' field"
      },
      {
        description: "Get the 10 open errors with the most users affected in the last 30 days",
        parameters: {
          filters: {
            "event.since": [{ "type": "eq", "value": "30d" }],
            "error.status": [{ "type": "eq", "value": "open" }]
          },
          sort: "users",
          direction: "desc",
          per_page: 10
        },
        expectedOutput: "JSON object with a list of errors in the 'data' field, a count of the current page of results in the 'count' field, and a total count of all results in the 'total' field"
      },
      {
        description: "Get the next 50 results",
        parameters: {
          next: "https://api.bugsnag.com/projects/515fb9337c1074f6fd000003/errors?base=2025-08-29T13%3A11%3A37Z&direction=desc&filters%5Berror.status%5D%5B%5D%5Btype%5D=eq&filters%5Berror.status%5D%5B%5D%5Bvalue%5D=open&offset=10&per_page=10&sort=users",
          per_page: 50
        },
        expectedOutput: "JSON object with a list of errors in the 'data' field, a count of the current page of results in the 'count' field, and a total count of all results in the 'total' field"
      }
    ],
    hints: [
      "Use list_project_event_filters tool first to discover valid filter field names for your project",
      "Combine multiple filters to narrow results - filters are applied with AND logic",
      "For time filters: use relative format (7d, 24h) for recent periods or ISO 8601 UTC format (2018-05-20T00:00:00Z) for specific dates",
      "Common time filters: event.since (from this time), event.before (until this time)",
      "The 'event.since' filter and 'error.status' filters are always applied and if not specified are set to '30d' and 'open' respectively",
      "There may not be any errors matching the filters - this is not a problem with the tool, in fact it might be a good thing that the user's application had no errors",
      "This tool returns paged results. The 'count' field indicates the number of results returned in the current page, and the 'total' field indicates the total number of results across all pages.",
      "If the output contains a 'next' value, there are more results available - call this tool again supplying the next URL as a parameter to retrieve the next page.",
      "Do not modify the next URL as this can cause incorrect results. The only other parameter that can be used with 'next' is 'per_page' to control the page size."
    ]
  };

  constructor(hasProjectApiKey: boolean = false) {
    super();

    // Add conditional projectId parameter if no project API key is configured
    if (!hasProjectApiKey) {
      this.definition.parameters.unshift(CommonParameterDefinitions.projectId(true));
    }
  }

  async execute(args: ListProjectErrorsArgs, context: ToolExecutionContext): Promise<ToolResult> {
    return executeWithErrorHandling(this.name, async () => {
      // Validate arguments
      validateToolArgs(args, this.definition.parameters, this.name);

      const { services } = context;

      // Get the project (either from projectId or current project)
      const project = await services.getInputProject(args.projectId);

      // Validate filter keys against cached event fields if filters are provided
      if (args.filters) {
        await this.validateFilterKeys(args.filters, services);
      }

      // Apply default filters if not provided
      const defaultFilters: FilterObject = JSON.parse(JSON.stringify(TOOL_DEFAULTS.DEFAULT_FILTERS));
      const mergedFilters = { ...defaultFilters, ...args.filters };

      // Build options for the API call
      const options: ListProjectErrorsOptions = {
        filters: mergedFilters
      };

      // Add optional parameters if provided
      if (args.sort !== undefined) options.sort = args.sort;
      if (args.direction !== undefined) options.direction = args.direction;
      if (args.per_page !== undefined) options.per_page = args.per_page;
      if (args.next !== undefined) options.next = args.next;

      // Make the API call
      const errorsApi = services.getErrorsApi();
      const response = await errorsApi.listProjectErrors(project.id, options);

      const errors = response.body || [];
      const totalCount = response.headers.get('X-Total-Count');
      const linkHeader = response.headers.get('Link');

      // Extract next URL from Link header
      const nextUrl = linkHeader?.match(/<([^>]+)>/)?.[1] || null;

      // Format the result with pagination information
      const result = formatPaginatedResult(
        errors,
        errors.length,
        totalCount ? parseInt(totalCount) : undefined,
        nextUrl
      );

      return result;
    });
  }

  /**
   * Validates filter keys against the project's available event fields
   *
   * @param filters The filters to validate
   * @param services The shared services instance
   * @throws BugsnagToolError if invalid filter keys are found
   */
  private async validateFilterKeys(filters: FilterObject, services: SharedServices): Promise<void> {
    const cache = services.getCache();
    const eventFields = cache.get<EventField[]>("bugsnag_current_project_event_filters") || [];

    if (eventFields.length === 0) {
      // If no cached event fields, we can't validate - let the API handle it
      return;
    }

    const validKeys = new Set(eventFields.map(f => f.display_id));

    for (const key of Object.keys(filters)) {
      if (!validKeys.has(key)) {
        throw new Error(`Invalid filter key: ${key}`);
      }
    }
  }
}
