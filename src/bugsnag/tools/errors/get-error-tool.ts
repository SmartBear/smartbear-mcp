/**
 * Get Error Tool
 *
 * Retrieves full details on an error, including aggregated and summarized data
 * across all events (occurrences) and details of the latest event (occurrence).
 */

import {
  ToolDefinition,
  ToolExecutionContext,
  ErrorArgs,
  BugsnagTool
} from "../../types.js";
import {
  CommonParameterDefinitions,
  validateToolArgs,
} from "../../tool-utilities.js";
import { FilterObject, toQueryString } from "../../client/api/filters.js";

/**
 * Arguments interface for the Get Error tool
 */
export interface GetErrorArgs extends ErrorArgs {
  filters?: FilterObject;
}

/**
 * Get Error Tool implementation
 *
 * Retrieves comprehensive error details including aggregated data, latest event details,
 * pivots for analysis, and a dashboard URL for further investigation.
 */
export class GetErrorTool implements BugsnagTool {
  readonly name = "get_error";
  readonly hasProjectIdParameter = true;
  readonly enableInSingleProjectMode = true;

  readonly definition: ToolDefinition = {
    title: "Get Error",
    summary: "Get full details on an error, including aggregated and summarized data across all events (occurrences) and details of the latest event (occurrence), such as breadcrumbs, metadata and the stacktrace. Use the filters parameter to narrow down the summaries further.",
    purpose: "Retrieve all the information required on a specified error to understand who it is affecting and why.",
    useCases: [
      "Investigate a specific error found through the List Project Errors tool",
      "Understand which types of user are affected by the error using summarized event data",
      "Get error details for debugging and root cause analysis",
      "Retrieve error metadata for incident reports and documentation"
    ],
    parameters: [
      CommonParameterDefinitions.errorId(),
      CommonParameterDefinitions.filters(false),
    ],
    examples: [
      {
        description: "Get details for a specific error",
        parameters: {
          errorId: "6863e2af8c857c0a5023b411"
        },
        expectedOutput: "JSON object with error details including message, stack trace, occurrence count, and metadata"
      },
      {
        description: "Get error details with filters applied",
        parameters: {
          errorId: "6863e2af8c857c0a5023b411",
          filters: {
            "event.since": [{ "type": "eq", "value": "7d" }],
            "user.email": [{ "type": "eq", "value": "user@example.com" }]
          }
        },
        expectedOutput: "JSON object with filtered error details and latest event matching the filters"
      }
    ],
    hints: [
      "Error IDs can be found using the List Project Errors tool",
      "Use this after filtering errors to get detailed information about specific errors",
      "If you used a filter to get this error, you can pass the same filters here to restrict the results or apply further filters",
      "The URL provided in the response should be shown to the user in all cases as it allows them to view the error in the dashboard and perform further analysis"
    ],
    outputFormat: "JSON object containing: " +
      " - error_details: Aggregated data about the error, including first and last seen occurrence" +
      " - latest_event: Detailed information about the most recent occurrence of the error, including stacktrace, breadcrumbs, user and context" +
      " - pivots: List of pivots (summaries) for the error, which can be used to analyze patterns in occurrences" +
      " - url: A link to the error in the dashboard - this should be shown to the user for them to perform further analysis"
  };

  async execute(args: GetErrorArgs, context: ToolExecutionContext): Promise<object> {
    // Validate arguments
    validateToolArgs(args, this.definition.parameters, this.name);

    const { services } = context;

    // Validate required errorId
    if (!args.errorId) {
      throw new Error("Both projectId and errorId arguments are required");
    }

    // Get the project (either from projectId or current project)
    const project = await services.getInputProject(args.projectId);

    // Get error details from the API
    const errorsApi = services.getErrorsApi();
    const errorDetailsResponse = await errorsApi.viewErrorOnProject(project.id, args.errorId);
    const errorDetails = errorDetailsResponse.body;

    if (!errorDetails) {
      throw new Error(`Error with ID ${args.errorId} not found in project ${project.id}.`);
    }

    // Build query parameters for getting the latest event
    const params = new URLSearchParams();
    params.append('sort', 'timestamp');
    params.append('direction', 'desc');
    params.append('per_page', '1');
    params.append('full_reports', 'true');

    // Combine error filter with any additional filters provided
    const filters: FilterObject = {
      "error": [{ type: "eq", value: args.errorId }],
      ...args.filters
    };

    const filtersQueryString = toQueryString(filters);
    const listEventsQueryString = `?${params}&${filtersQueryString}`;

    // Get the latest event for this error using the events endpoint with filters
    let latestEvent = null;
    try {
      const eventsResponse = await errorsApi.listEventsOnProject(project.id, listEventsQueryString);
      const events = eventsResponse.body || [];
      latestEvent = events[0] || null;
    } catch (e) {
      console.warn("Failed to fetch latest event:", e);
      // Continue without latest event rather than failing the entire request
    }

    // Get error pivots for analysis
    let pivots: any[] = [];
    try {
      const pivotsResponse = await errorsApi.listErrorPivots(project.id, args.errorId);
      pivots = pivotsResponse.body || [];
    } catch (e) {
      console.warn("Failed to fetch error pivots:", e);
      // Continue without pivots rather than failing the entire request
    }

    // Generate dashboard URL with filters
    const errorUrl = await services.getErrorUrl(project, args.errorId, `?${filtersQueryString}`);

    const result = {
      error_details: errorDetails,
      latest_event: latestEvent,
      pivots: pivots,
      url: errorUrl
    };

    return result;
  }
}
