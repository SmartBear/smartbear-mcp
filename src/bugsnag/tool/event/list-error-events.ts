import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { BugsnagClient } from "../../client.ts";
import { toolInputParameters } from "../../input-schemas.ts";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
  errorId: toolInputParameters.errorId,
  filters: toolInputParameters.filters.describe(
    "Apply filters to narrow down the event list. Use the List Project Event Filters tool to discover available filter fields. " +
      "Time filters support extended ISO 8601 format (e.g. 2018-05-20T00:00:00Z) or relative format (e.g. 7d, 24h).",
  ),
  direction: toolInputParameters.direction,
  perPage: toolInputParameters.perPage,
  nextUrl: toolInputParameters.nextUrl,
});

// Fetches full details for a single event by its ID, including stack trace and metadata.
export class ListErrorEvents extends Tool<BugsnagClient> {
  specification: ToolParams = {
    title: "Get Events on an Error",
    toolset: "Events",
    summary: "Gets a list of events that have grouped into the specified error",
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
          // biome-ignore lint/security/noSecrets: example project ID, not a secret
          projectId: "1234567890abcdef12345678",
          // biome-ignore lint/security/noSecrets: example error ID, not a secret
          errorId: "6863e2af012caf1d5c320000",
        },
        expectedOutput:
          "A list of events, ordered by timestamp, with complete details including stack trace, breadcrumbs, metadata, and context",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
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
