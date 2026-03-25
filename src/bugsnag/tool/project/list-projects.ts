import { z } from "zod";
import { ToolError } from "../../../common/tools";
import { BugsnagClient } from "../../client";
import type { Project } from "../../client/api";

const inputSchema = z.object({
  apiKey: z
    .string()
    .optional()
    .describe("The API key of the BugSnag project, if known."),
});

// Lists all projects the user has access to, optionally filtered by API key.
export const listProjects = BugsnagClient.createTool(
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
    inputSchema,
    hints: [
      "Project IDs from this list can be used with other tools when no project API key is configured",
    ],
  },
  async ({ client, args }) => {
    let projects = await client.getProjects();
    if (!projects || projects.length === 0) {
      throw new ToolError("No BugSnag projects found for the current user.");
    }
    if (args.apiKey) {
      const matchedProject = projects.find(
        (p: Project) => p.api_key === args.apiKey,
      );
      projects = matchedProject ? [matchedProject] : [];
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
