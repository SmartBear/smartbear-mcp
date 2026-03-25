import { z } from "zod";
import { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
});

// Returns the available event filter fields for a project, used to build filter queries for errors and events.
export const listProjectEventFilters = BugsnagClient.createTool(
  {
    title: "List Project Event Filters",
    summary: "Get available event filter fields for a project",
    purpose:
      "Discover valid filter field names and options that can be used with the List Errors or Get Error tools",
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
      "Use this tool before the List Errors or Get Error tools to understand available filters",
      "Look for display_id field in the response - these are the field names to use in filters",
    ],
  },
  async ({ client, args }) => {
    const eventFilters = await client.getProjectEventFields(
      await client.getInputProject(args.projectId),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(eventFilters) }],
    };
  },
);
