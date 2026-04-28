import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
  errorId: toolInputParameters.errorId.describe(
    "Unique identifier of the error to add a comment to",
  ),
  message: z
    .string()
    .min(1)
    .describe("The comment message to add to the error"),
});

// Adds a comment to an error to record notes, decisions, or context.
export class CreateErrorComment extends Tool<BugsnagClient> {
  specification: ToolParams = {
    title: "Create Error Comment",
    summary: "Add a comment to an error",
    purpose:
      "Record notes, decisions, or context on an error to communicate with the team and build a discussion thread",
    useCases: [
      "Add investigation notes to an error being actively debugged",
      "Record a decision about how to handle or prioritize an error",
      "Leave context for teammates about the root cause or a workaround",
      "Document when a fix was deployed or an incident was resolved",
    ],
    inputSchema,
    outputDescription:
      "JSON object containing the created comment with: id, message, created_at, updated_at, and user details",
    examples: [
      {
        description: "Add an investigation note to an error",
        parameters: {
          errorId: "6863e2af8c857c0a5023b411",
          message:
            "This appears to be caused by a null user session on the checkout page. Fix deployed in v2.3.1.",
        },
        expectedOutput:
          "JSON object with the created comment including its id and timestamps",
      },
    ],
    hints: [
      "Error IDs can be found using the List Project Errors tool",
      "Use List Error Comments to read existing comments before adding a new one",
      "Comments cannot be edited or deleted via this MCP server - be precise in your message",
    ],
    readOnly: false,
    idempotent: false,
  };

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
    const params = inputSchema.parse(args);
    const project = await this.client.getInputProject(params.projectId);

    const response = await this.client.errorsApi.createErrorComment(
      project.id,
      params.errorId,
      params.message,
    );

    if (!response.body) {
      throw new ToolError("Failed to create comment: no response body returned");
    }

    return {
      content: [{ type: "text", text: JSON.stringify(response.body) }],
    };
  };
}
