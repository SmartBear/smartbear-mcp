import { z } from "zod";
import { Tool, ToolError, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import { toolInputParameters } from "../../input-schemas";

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
  collaboratorNameEmailOrId: z
    .string()
    .trim()
    .min(1)
    .optional()
    .describe(
      "Optional: filter by exact collaborator ID, or by part of a collaborator's name or email address (case-insensitive)",
    ),
});

export class ListProjectCollaborators extends Tool<BugsnagClient> {
  specification: ToolParams = {
    toolset: "Projects",
    title: "List Project Collaborators",
    summary: "List all collaborators with access to a specific Bugsnag project",
    purpose:
      "Retrieve the list of team members and collaborators assigned to a project, optionally filtered by name, email or ID.",
    useCases: [
      "Find all team members with access to a project",
      "Look up a collaborator's email address or role on the project",
      "Check project team membership",
      "Get collaborator details for project management and reporting",
      "Retrieve collaborator information for communication and coordination",
    ],
    inputSchema,
    hints: [
      "Use collaboratorNameEmailOrId to filter by exact ID, or by partial name or email match",
      "project_role is the collaborator's role on this project. is_admin is whether they are an admin of the whole organization, not of this project",
      "pending_invitation is true for people who have been invited but have not accepted yet",
    ],
  };

  handle: ToolHandler = async (args, _extra) => {
    const params = inputSchema.parse(args);
    // Resolved outside the try so its own "not found" errors reach the caller unwrapped.
    const project = await this.client.getInputProject(params.projectId);
    try {
      const collaborators = (
        await this.client.projectApi.listProjectCollaborators(
          project.id,
          params.collaboratorNameEmailOrId,
        )
      ).body;

      const data = collaborators ?? [];

      const content = {
        data,
        count: data.length,
        filtered: !!params.collaboratorNameEmailOrId,
      };

      return {
        content: [{ type: "text", text: JSON.stringify(content) }],
      };
    } catch (error) {
      console.warn("Failed to fetch project collaborators:", error);
      throw new ToolError(
        `Failed to list collaborators for project ${project.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  };
}
