import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import { type FilterObject, toUrlSearchParams } from "../../client/filters";
import { toolInputParameters } from "../../input-schemas";

// Fetches full details for a single error including aggregated stats, the latest event, pivots, and a dashboard URL.
export class GetError extends Tool<BugsnagClient> {
  specification: ToolParams = {
    title: "Get Error",
    summary:
      "Get full details on an error, including aggregated and summarized data across all events (occurrences) and details of the latest event (occurrence), such as breadcrumbs, metadata and the stacktrace. Use the filters parameter to narrow down the summaries further.",
    purpose:
      "Retrieve all the information required on a specified error to understand who it is affecting and why.",
    useCases: [
      "Investigate a specific error found through the List Project Errors tool",
      "Understand which types of user are affected by the error using summarized event data",
      "Get error details for debugging and root cause analysis",
      "Retrieve error metadata for incident reports and documentation",
    ],
    inputSchema: z.object({
      projectId: toolInputParameters.projectId,
      errorId: toolInputParameters.errorId.describe(
        "Unique identifier of the error to retrieve",
      ),
      filters: toolInputParameters.filters.describe(
        "Apply filters to narrow down the error list. Use the List Project Event Filters tool to discover available filter fields. " +
          "Time filters support extended ISO 8601 format (e.g. 2018-05-20T00:00:00Z) or relative format (e.g. 7d, 24h).",
      ),
    }),
    outputDescription:
      "JSON object containing: " +
      " - error_details: Aggregated data about the error, including first and last seen occurrence" +
      " - latest_event: Detailed information about the most recent occurrence of the error, including stacktrace, breadcrumbs, user and context" +
      " - pivots: List of pivots (summaries) for the error, which can be used to analyze patterns in occurrences" +
      " - url: A link to the error in the dashboard - this should be shown to the user for them to perform further analysis",
    examples: [
      {
        description: "Get details for a specific error",
        parameters: {
          errorId: "6863e2af8c857c0a5023b411",
        },
        expectedOutput:
          "JSON object with error details including message, stack trace, occurrence count, and metadata",
      },
    ],
    hints: [
      "Error IDs can be found using the List Project Errors tool",
      "Use this after filtering errors to get detailed information about specific errors",
      "Use Get Event Details tool if you need detailed information about a specific event (occurrence) rather than the aggregated error",
      "If you used a filter to get this error, you can pass the same filters here to restrict the results or apply further filters",
      "The URL provided in the response points should be shown to the user in all cases as it allows them to view the error in the dashboard and perform further analysis",
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
    const params: any = this.specification.inputSchema!.parse(args);
    const project = await this.client.getInputProject(params.projectId);
    const errorDetails = (
      await this.client.errorsApi.viewErrorOnProject(project.id, params.errorId)
    ).body;
    if (!errorDetails) {
      throw new ToolError(
        `Error with ID ${params.errorId} not found in project ${project.id}.`,
      );
    }

    const filters: FilterObject = {
      error: [{ type: "eq", value: params.errorId }],
      ...params.filters,
    };

    await this.client.validateEventFields(project, filters);

    // Get the latest event for this error using the events endpoint with filters
    let latestEvent = null;
    try {
      const latestEvents = (
        await this.client.errorsApi.listEventsOnProject(
          project.id,
          null,
          "timestamp",
          "desc",
          1,
          filters,
          true,
        )
      ).body;
      if (latestEvents && latestEvents.length > 0) {
        latestEvent = latestEvents[0];
        latestEvent.threads = undefined; // Remove threads to reduce payload size
      }
    } catch (e) {
      console.warn("Failed to fetch latest event:", e);
      // Continue without latest event rather than failing the entire request
    }

    const content = {
      error_details: errorDetails,
      latest_event: latestEvent,
      pivots:
        (
          await this.client.errorsApi.getPivotValuesOnAnError(
            project.id,
            params.errorId,
            filters,
            5,
          )
        ).body || [],
      url: await this.client.getErrorUrl(
        project,
        params.errorId,
        toUrlSearchParams(filters).toString(),
      ),
    };
    return {
      content: [{ type: "text", text: JSON.stringify(content) }],
    };
  };
}
