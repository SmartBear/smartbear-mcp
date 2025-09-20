/**
 * List Project Event Filters Tool
 *
 * Retrieves available event filter fields for the current project.
 * This tool helps discover valid filter field names that can be used
 * with other tools like List Project Errors and Get Error.
 */

import {
  ToolDefinition,
  ToolExecutionContext,
  BugsnagTool
} from "../../types.js";
import {
  validateToolArgs,
} from "../../tool-utilities.js";
import { EventField } from "../../client/api/Project.js";
import { ToolError } from "../../../common/types.js";

/**
 * Arguments interface for the List Project Event Filters tool
 * This tool takes no parameters as it returns filters for the current project
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ListProjectEventFiltersArgs {
  // No parameters required - uses current project from context
}

/**
 * List Project Event Filters Tool implementation
 *
 * Discovers available event filter fields for the current project.
 * The results are cached and filtered to exclude fields that are not
 * useful for programmatic filtering (like the "search" field).
 */
export class ListProjectEventFiltersTool implements BugsnagTool {
  readonly name = "list_project_event_filters";
  readonly hasProjectIdParameter = false;
  readonly enableInSingleProjectMode = true;

  readonly definition: ToolDefinition = {
    title: "List Project Event Filters",
    summary: "Get available event filter fields for the current project",
    purpose: "Discover valid filter field names and options that can be used with the List Errors or Get Error tools",
    useCases: [
      "Discover what filter fields are available before searching for errors",
      "Find the correct field names for filtering by user, environment, or custom metadata",
      "Understand filter options and data types for building complex queries"
    ],
    parameters: [],
    examples: [
      {
        description: "Get all available filter fields",
        parameters: {},
        expectedOutput: "JSON array of EventField objects containing display_id, custom flag, and filter/pivot options"
      }
    ],
    hints: [
      "Use this tool before the List Errors or Get Error tools to understand available filters",
      "Look for display_id field in the response - these are the field names to use in filters",
      "Custom fields are marked with the 'custom' flag in the response",
      "Some fields may be excluded from results if they are not suitable for programmatic filtering"
    ]
  };

  async execute(args: ListProjectEventFiltersArgs, context: ToolExecutionContext): Promise<object> {
    // Validate arguments (though there are none for this tool)
    validateToolArgs(args, this.definition.parameters, this.name);

    const { services } = context;

    // Try to get cached filters first
    const cache = services.getCache();
    const cacheKey = "bugsnag_current_project_event_filters";
    let projectFields = cache.get<EventField[]>(cacheKey);

    if (!projectFields) {
      // If not cached, get current project and fetch filters
      const currentProject = await services.getCurrentProject();
      if (!currentProject) {
        throw new ToolError(
          "No current project found. Please configure a project API key or specify a project ID.",
          this.name
        );
      }

      // Fetch and cache the filters
      projectFields = await services.getProjectEventFilters(currentProject);
      cache.set(cacheKey, projectFields);
    }

    if (!projectFields || projectFields.length === 0) {
      throw new ToolError(
        "No event filters found for the current project.",
        this.name
      );
    }

    // Return the raw data - executeWithErrorHandling will wrap it in createSuccessResult
    return projectFields;
  }
}
