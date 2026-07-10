import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
  errorId: toolInputParameters.errorId.describe(
    "Unique identifier of the error to list comments for",
  ),
});

// Lists all comments on a specific error.
export class ListErrorComments extends Tool<BugsnagClient> {
  specification: ToolParams = {
    title: "List Error Comments",
    summary: "List all comments that have been added to a specific error",
    purpose:
      "Retrieve the discussion thread on an error to understand context, decisions, and team communication around an issue",
    useCases: [
      "Review team notes and context added to an error during investigation",
      "Check whether an error has already been acknowledged or assigned",
      "Read decisions made about how to handle or prioritize an error",
    ],
    inputSchema,
    outputDescription:
      "JSON object containing: " +
      " - data: Array of comment objects, each with id, message, created_at, updated_at, url, and collaborator details (id, name, email)" +
      " - count: Number of comments returned",
    examples: [
      {
        description: "List all comments on an error",
        parameters: {
          errorId: "6863e2af8c857c0a5023b411",
        },
        expectedOutput:
          "JSON object with a list of comments in the 'data' field and a count of results",
      },
    ],
    hints: [
      "Error IDs can be found using the List Project Errors tool",
      "Comments are returned in chronological order",
      "Use Create Error Comment to add a new comment to an error",
    ],
    readOnly: true,
    idempotent: true,
  };

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
    const params = inputSchema.parse(args);
    const project = await this.client.getInputProject(params.projectId);

    const response = await this.client.errorsApi.listErrorComments(
      project.id,
      params.errorId,
    );

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            data: response.body,
            count: response.body?.length ?? 0,
          }),
        },
      ],
    };
  };
}
