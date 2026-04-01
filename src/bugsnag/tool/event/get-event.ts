import { z } from "zod";
import { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
  eventId: toolInputParameters.eventId,
});

// Fetches full details for a single event by its ID, including stack trace and metadata.
export default BugsnagClient.createTool(
  {
    title: "Get Event",
    summary: "Get detailed information about a specific event",
    purpose: "Retrieve event details directly from its ID",
    useCases: [
      "Get the full details of an event, including any thread stack traces",
    ],
    inputSchema,
    examples: [
      {
        description: "Get event details of an event",
        parameters: {
          eventId: "6863e2af012caf1d5c320000",
        },
        expectedOutput:
          "JSON object with complete event details including stack trace (error trace and other threads, if present), metadata, and context",
      },
    ],
  },
  async ({ client, args }) => {
    const project = await client.getInputProject(args.projectId);
    const response = await client.getEvent(args.eventId, project.id);
    return {
      content: [{ type: "text", text: JSON.stringify(response) }],
    };
  },
);
