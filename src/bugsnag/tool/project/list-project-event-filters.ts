import { z } from "zod";
import { Tool, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
});

// Returns the available event filter fields for a project, used to build filter queries for errors and events.
export class ListProjectEventFilters extends Tool<BugsnagClient> {
  specification: ToolParams = {
    title: "List Project Event Filters",
    toolset: "Projects",
    summary: "Get available event filter fields for a project",
    purpose:
      "Discover the filter field names (including custom metadata fields) that are valid for this project, for use in the 'filters' parameter of List Project Errors, Get Error and Get Events on an Error",
    useCases: [
      "Discover what filter fields are available before searching for errors",
      "Find the correct field names for filtering by user, environment, or custom metadata",
      "Understand filter options and data types for building complex queries",
    ],
    inputSchema,
    examples: [
      {
        description: "Get all available filter fields",
        parameters: {},
        expectedOutput:
          "JSON array of EventField objects containing display_id, custom flag, and filter/pivot options",
      },
    ],
    hints: [
      "Use this tool before the List Project Errors, Get Error or Get Events on an Error tools to understand available filters",
      "Look for display_id field in the response - these are the field names to use as keys in the filters parameter (e.g. 'error.status', 'event.since', 'user.email')",
    ],
  };

  handle: ToolHandler = async (args, _ctx) => {
    const params = inputSchema.parse(args);
    const eventFilters = await this.client.getProjectEventFields(
      await this.client.getInputProject(params.projectId),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(eventFilters) }],
    };
  };
}
