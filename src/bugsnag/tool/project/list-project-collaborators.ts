import { z } from "zod";
import { Tool, ToolError, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";

const inputSchema = z.object({
  projectId: z
    .string()
    .min(1)
    .optional()
    .describe(
      "The ID of the Bugsnag project. If omitted, uses the current project if one is set.",
    ),
  collaboratorNameOrId: z
    .string()
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
      "Locate a specific collaborator to assign errors or tasks",
      "Check project team membership",
      "Get collaborator details for project management and reporting",
      "Retrieve collaborator information for communication and coordination",
    ],
    inputSchema,
    hints: [
      "Use collaboratorNameOrId to filter by exact ID, or by partial name or email match",
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
          params.collaboratorNameOrId,
        )
      ).body;

      const data = collaborators ?? [];

      const content = {
        data,
        count: data.length,
        filtered: !!params.collaboratorNameOrId,
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
