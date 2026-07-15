import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool } from "../../../common/tools.ts";
import type { ToolParams } from "../../../common/types.ts";
import type { BugsnagClient } from "../../client.ts";
import { toolInputParameters } from "../../input-schemas.ts";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
  eventId: toolInputParameters.eventId,
});

// Fetches full details for a single event by its ID, including stack trace and metadata.
export class GetEvent extends Tool<BugsnagClient> {
  specification: ToolParams = {
    title: "Get Event",
    toolset: "Events",
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
          // biome-ignore lint/security/noSecrets: example event ID, not a secret
          eventId: "6863e2af012caf1d5c320000",
        },
        expectedOutput:
          "JSON object with complete event details including stack trace (error trace and other threads, if present), metadata, and context",
      },
    ],
  };

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
    const params = inputSchema.parse(args);
    const project = await this.client.getInputProject(params.projectId);
    const response = await this.client.getEvent(params.eventId, project.id);
    return {
      content: [{ type: "text", text: JSON.stringify(response) }],
    };
  };
}
