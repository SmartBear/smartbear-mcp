import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

// Returns the available event filter fields for a project, used to build filter queries for errors and events.
export class ListProjectEventFilters extends Tool<BugsnagClient> {
  specification: ToolParams = {
    title: "List Project Event Filters",
    summary: "Get available event filter fields for a project",
    purpose:
      "Discover valid filter field names and options that can be used with the List Errors or Get Error tools",
    useCases: [
      "Discover what filter fields are available before searching for errors",
      "Find the correct field names for filtering by user, environment, or custom metadata",
      "Understand filter options and data types for building complex queries",
    ],
    inputSchema: z.object({
      projectId: toolInputParameters.projectId,
    }),
    examples: [
      {
        description: "Get all available filter fields",
        parameters: {},
        expectedOutput:
          "JSON array of EventField objects containing display_id, custom flag, and filter/pivot options",
      },
    ],
    hints: [
      "Use this tool before the List Errors or Get Error tools to understand available filters",
      "Look for display_id field in the response - these are the field names to use in filters",
    ],
  };

  constructor(client: BugsnagClient) {
    super(client);
  }

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
    const inputSchema = z.object({
      projectId: toolInputParameters.projectId,
    });
    const params = inputSchema.parse(args);
    const eventFilters = await this.client.getProjectEventFields(
      await this.client.getInputProject(params.projectId),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(eventFilters) }],
    };
  };
}
