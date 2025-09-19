/**
 * Get Event Details Tool
 *
 * Retrieves detailed information about a specific event using its dashboard URL.
 * This tool parses the URL to extract project slug and event ID, then fetches
 * the event details from the API.
 */

import {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  BaseBugsnagTool,
  BugsnagToolError
} from "../types.js";
import {
  CommonParameterDefinitions,
  validateToolArgs,
  executeWithErrorHandling,
  extractProjectSlugFromUrl,
  extractEventIdFromUrl
} from "../utils/tool-utilities.js";

/**
 * Arguments interface for the Get Event Details tool
 */
export interface GetEventDetailsArgs {
  link: string;
}

/**
 * Get Event Details Tool implementation
 *
 * Parses dashboard URLs to extract project and event information,
 * then retrieves detailed event data from the API.
 */
export class GetEventDetailsTool extends BaseBugsnagTool {
  readonly name = "get_event_details";

  readonly definition: ToolDefinition = {
    title: "Get Event Details",
    summary: "Get detailed information about a specific event using its dashboard URL",
    purpose: "Retrieve event details directly from a dashboard URL for quick debugging",
    useCases: [
      "Get event details when given a dashboard URL from a user or notification",
      "Extract event information from shared links or browser URLs",
      "Quick lookup of event details without needing separate project and event IDs"
    ],
    parameters: [
      CommonParameterDefinitions.dashboardUrl()
    ],
    examples: [
      {
        description: "Get event details from a dashboard URL",
        parameters: {
          link: "https://app.bugsnag.com/my-org/my-project/errors/6863e2af8c857c0a5023b411?event_id=6863e2af012caf1d5c320000"
        },
        expectedOutput: "JSON object with complete event details including stack trace, metadata, and context"
      }
    ],
    hints: [
      "The URL must contain both project slug in the path and event_id in query parameters",
      "This is useful when users share BugSnag dashboard URLs and you need to extract the event data"
    ]
  };

  async execute(args: GetEventDetailsArgs, context: ToolExecutionContext): Promise<ToolResult> {
    return executeWithErrorHandling(this.name, async () => {
      // Validate arguments
      validateToolArgs(args, this.definition.parameters, this.name);

      const { services } = context;

      if (!args.link) {
        throw new BugsnagToolError("link argument is required", this.name);
      }

      // Extract project slug and event ID from the URL
      let projectSlug: string;
      let eventId: string;

      try {
        projectSlug = extractProjectSlugFromUrl(args.link);
        eventId = extractEventIdFromUrl(args.link);
      } catch (error) {
        if (error instanceof BugsnagToolError) {
          throw error;
        }
        throw new BugsnagToolError(
          "Both projectSlug and eventId must be present in the link",
          this.name,
          error as Error
        );
      }

      // Find the project by slug
      const projects = await services.getProjects();
      const project = projects.find((p) => p.slug === projectSlug);

      if (!project) {
        throw new BugsnagToolError(
          "Project with the specified slug not found.",
          this.name
        );
      }

      // Get the event details using the shared service
      const eventDetails = await services.getEvent(eventId, project.id);

      if (!eventDetails) {
        throw new BugsnagToolError(
          `Event with ID ${eventId} not found in project ${project.id}.`,
          this.name
        );
      }

      return eventDetails;
    });
  }
}
