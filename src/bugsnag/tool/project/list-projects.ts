import { z } from "zod";
import { Tool, ToolError, type ToolHandler } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import type { Project } from "../../client/api/index";

const inputSchema = z.object({
  apiKey: z
    .string()
    .optional()
    .describe(
      "The notifier API key of the BugSnag project (found where the BugSnag SDK is configured in the user's code). If provided, only the project with this key is returned.",
    ),
});

// Lists all projects the user has access to, optionally filtered by API key.
export class ListProjects extends Tool<BugsnagClient> {
  specification: ToolParams = {
    toolset: "Projects",
    title: "List Projects",
    summary:
      "List the projects the current user has access to, or find the project matching an API key. Each project includes its 'id', 'name', 'slug' and 'api_key'.",
    purpose:
      "Retrieve available projects for browsing and selecting which project to analyze.",
    useCases: [
      "Get an overview of all projects in the organization",
      "Locate a project by its API key if known from the user's code",
    ],
    inputSchema,
    hints: [
      "Use the 'id' field (not the name or slug) as the projectId parameter of other BugSnag tools when no current project is configured",
      "To find a project the user refers to by name or slug, look it up in this list and use its 'id'",
    ],
  };

  handle: ToolHandler = async (args, _ctx) => {
    const params = inputSchema.parse(args);
    let projects = await this.client.getProjects();
    if (!projects || projects.length === 0) {
      throw new ToolError("No BugSnag projects found for the current user.");
    }
    if (params.apiKey) {
      const matchedProject = projects.find(
        (p: Project) => p.api_key === params.apiKey,
      );
      projects = matchedProject ? [matchedProject] : [];
    }
    const content = {
      data: projects,
      count: projects.length,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(content) }],
    };
  };
}
