import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
import type { ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import type { Project } from "../../client/api/index";

export class ListProjects extends Tool<BugsnagClient> {
  specification: ToolParams = {
    title: "List Projects",
    summary:
      "List all projects in the organization that the current user has access to, or find a project matching an API key.",
    purpose:
      "Retrieve available projects for browsing and selecting which project to analyze.",
    useCases: [
      "Get an overview of all projects in the organization",
      "Locate a project by its API key if known from the user's code",
    ],
    inputSchema: z.object({
      apiKey: z
        .string()
        .optional()
        .describe("The API key of the BugSnag project, if known."),
    }),
    hints: [
      "Project IDs from this list can be used with other tools when no project API key is configured",
    ],
  };

  constructor(client: BugsnagClient) {
    super(client);
  }

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
    const inputSchema = z.object({
      apiKey: z
        .string()
        .optional()
        .describe("The API key of the BugSnag project, if known."),
    });
    const params = inputSchema.parse(args);
    let projects = await this.client.getProjects();
    if (!projects || projects.length === 0) {
      throw new ToolError(
        "No BugSnag projects found for the current user.",
      );
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