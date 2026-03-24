import { z } from "zod";
import { ToolError, TypesafeTool } from "../../../common/tools";
import type { BugsnagClient } from "../../client";

const inputSchema = z.object({
  link: z
    .string()
    .describe(
      "Full URL to the event details page in the BugSnag dashboard (web interface), containing project slug and event_id parameter.",
    ),
});

// Parses a BugSnag dashboard URL to extract the project slug and event ID, then fetches the event details.
export const getEventDetailsFromDashboardUrl = new TypesafeTool(
  {
    title: "Get Event Details From Dashboard URL",
    summary:
      "Get detailed information about a specific event using its dashboard URL",
    purpose:
      "Retrieve event details directly from a dashboard URL for quick debugging",
    useCases: [
      "Get event details when given a dashboard URL from a user or notification",
      "Extract event information from shared links or browser URLs",
      "Quick lookup of event details without needing separate project and event IDs",
    ],
    inputSchema,
    examples: [
      {
        description: "Get event details from a dashboard URL",
        parameters: {
          link: "https://app.bugsnag.com/my-org/my-project/errors/6863e2af8c857c0a5023b411?event_id=6863e2af012caf1d5c320000",
        },
        expectedOutput:
          "JSON object with complete event details including stack trace, metadata, and context",
      },
    ],
    hints: [
      "The URL must contain both project slug in the path and event_id in query parameters",
      "This is useful when users share BugSnag dashboard URLs and you need to extract the event data",
    ],
  },
  (client: BugsnagClient) => async (params, _extra) => {
    const url = new URL(params.link);
    const eventId = url.searchParams.get("event_id");
    const projectSlug = url.pathname.split("/")[2];
    if (!projectSlug || !eventId)
      throw new ToolError(
        "Both projectSlug and eventId must be present in the link",
      );

    // get the project id from list of projects
    const projects = await client.getProjects();
    const projectId = projects.find((p: any) => p.slug === projectSlug)?.id;
    if (!projectId) {
      throw new ToolError("Project with the specified slug not found.");
    }

    const response = await client.getEvent(eventId, projectId);
    return {
      content: [{ type: "text", text: JSON.stringify(response) }],
    };
  },
);
