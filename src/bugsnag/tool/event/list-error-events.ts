import { z } from "zod";
import { Tool, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
  errorId: toolInputParameters.errorId,
  filters: toolInputParameters.errorScopedFilters,
  direction: toolInputParameters.direction,
  perPage: toolInputParameters.perPage,
  nextUrl: toolInputParameters.nextUrl,
});

// Lists the individual events (occurrences) that have grouped into a single error.
export class ListErrorEvents extends Tool<BugsnagClient> {
  specification: ToolParams = {
    title: "Get Events on an Error",
    toolset: "Events",
    summary:
      "List the individual events (occurrences) of one error, newest first by default",
    purpose:
      "Show the events that make up an error to see individual occurrences of the error for detailed analysis",
    useCases: [
      "Retrieving all the events for comparison to find commonalities or differences in stack traces, breadcrumbs and metadata",
    ],
    inputSchema,
    examples: [
      {
        description: "Get events of an error",
        parameters: {
          projectId: "1234567890abcdef12345678",
          errorId: "6863e2af012caf1d5c320000",
        },
        expectedOutput:
          "A list of events, ordered by timestamp, with complete details including stack trace, breadcrumbs, metadata, and context",
      },
      {
        description: "Get events of an error from the last 7 days only",
        parameters: {
          errorId: "6863e2af012caf1d5c320000",
          filters: { "event.since": [{ type: "eq", value: "7d" }] },
        },
        expectedOutput: "A list of events that occurred in the last 7 days",
      },
    ],
    hints: [
      "No time filter is applied by default, so events of any age are returned. Use 'event.since' / 'event.before' in filters to restrict the time range",
      "Event stack traces and metadata are included, so keep perPage small when you only need a few events",
      "Use the 'id' of an event with the Get Event tool if you need to look at one event on its own",
      "This tool returns paged results - if the output contains a 'next_url' value, call this tool again with it as the nextUrl parameter to get more events",
    ],
  };

  handle: ToolHandler = async (args, _ctx) => {
    const params = inputSchema.parse(args);
    const project = await this.client.getInputProject(params.projectId);
    const response = await this.client.errorsApi.listErrorEvents(
      project.id,
      params.errorId,
      undefined, // base
      "timestamp", // sort (the only available option)
      params.direction,
      params.perPage,
      params.filters,
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
  };
}
