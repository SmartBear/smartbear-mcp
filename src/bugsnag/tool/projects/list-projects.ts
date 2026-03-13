import { z } from "zod";
import { ToolError, TypesafeTool } from "../../../common/tools.ts";
import type { BugsnagClient } from "../../client";
import type { Project } from "../../client/api";

const listProjectsInputSchema = z.object({
  apiKey: z
    .string()
    .optional()
    .describe("The API key of the BugSnag project, if known."),
});

export const listProjects = new TypesafeTool(
  {
    title: "List Projects",
    summary:
      "List all projects in the organization that the current user has access to, or find a project matching an API key.",
    purpose:
      "Retrieve available projects for browsing and selecting which project to analyze.",
    useCases: [
      "Get an overview of all projects in the organization",
      "Locate a project by its API key if known from the user's code",
    ],
    inputSchema: listProjectsInputSchema,
    hints: [
      "Project IDs from this list can be used with other tools when no project API key is configured",
    ],
  },
  (client: BugsnagClient) => async (args, _extra) => {
    let projects = await client.getProjects();

    if (!projects.length) {
      throw new ToolError("No BugSnag projects found for the current user.");
    }

    if (args.apiKey) {
      projects = projects.filter((p: Project) => p.api_key === args.apiKey);
    }

    const content = {
      data: projects,
      count: projects.length,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(content) }],
      structuredContent: content,
    };
  },
);
