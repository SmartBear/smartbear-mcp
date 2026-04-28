import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
  collaboratorNameOrId: toolInputParameters.collaboratorNameOrId,
});

// Fetches a list of collaborators for a given project, including their details such as name, email, and role.
export class ListCollaborators extends Tool<BugsnagClient> {
  specification: ToolParams = {
    title: "List Collaborators",
    summary:
      "List all collaborators for a specified project, including their details such as name, email, and role.",
    purpose:
      "Retrieve collaborators related to a project for assignment and access management purposes.",
    useCases: [
      "Investigate a specific collaborator's involvement in a project",
      "Understand the roles and responsibilities of team members",
      "Get collaborator details for project management and reporting",
      "Retrieve collaborator information for communication and coordination",
    ],
    hints: [
      "Collaborator name or ID is used to filter the list of collaborators for a project. If a name is provided, it will be matched against collaborator names to find the corresponding ID.",
    ],
    inputSchema,
  };

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
    const params = inputSchema.parse(args);
    const project = await this.client.getInputProject(params.projectId);

    // Get the list of all collaborators for the project, then filter by the provided collaborator name or ID
    var collaborators = [];
    try {
      collaborators = (await this.client.getCollaborators(project.id)).body;
    } catch (e) {
      console.warn("Failed to fetch project collaborators:", e);
      throw new ToolError("Unable to fetch project collaborators");
    }

    const content = {
      collaborator_list: collaborators,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(content) }],
    };
  };
}
