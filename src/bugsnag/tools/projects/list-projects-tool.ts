/**
 * List Projects Tool
 *
 * Retrieves all projects in the organization with optional pagination.
 * This tool is only available when no project API key is configured.
 */

import {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  PaginationArgs,
  BugsnagTool
} from "../../types.js";
import {
  CommonParameterDefinitions,
  validateToolArgs,
} from "../../tool-utilities.js";

/**
 * Arguments interface for the List Projects tool
 */
export interface ListProjectsArgs extends PaginationArgs {
  page_size?: number;
  page?: number;
}

/**
 * List Projects Tool implementation
 *
 * Lists all projects in the organization with optional pagination support.
 * Only available when no project API key is configured, as it's used for
 * project discovery and selection.
 */
export class ListProjectsTool implements BugsnagTool {
  readonly name = "list_projects";
  readonly hasProjectIdParameter = false;
  readonly enableInSingleProjectMode = false;

  readonly definition: ToolDefinition = {
    title: "List Projects",
    summary: "List all projects in the organization with optional pagination",
    purpose: "Retrieve available projects for browsing and selecting which project to analyze",
    useCases: [
      "Browse available projects when no specific project API key is configured",
      "Find project IDs needed for other tools",
      "Get an overview of all projects in the organization"
    ],
    parameters: [
      CommonParameterDefinitions.pageSize(10),
      CommonParameterDefinitions.page()
    ],
    examples: [
      {
        description: "Get first 10 projects",
        parameters: {
          page_size: 10,
          page: 1
        },
        expectedOutput: "JSON array of project objects with IDs, names, and metadata"
      },
      {
        description: "Get all projects (no pagination)",
        parameters: {},
        expectedOutput: "JSON array of all available projects"
      }
    ],
    hints: [
      "Use pagination for organizations with many projects to avoid large responses",
      "Project IDs from this list can be used with other tools when no project API key is configured"
    ]
  };

  async execute(args: ListProjectsArgs, context: ToolExecutionContext): Promise<object> {
    // Validate arguments
    validateToolArgs(args, this.definition.parameters, this.name);

    const { services } = context;

    // Get all projects from the organization
    let projects = await services.getProjects();

    if (!projects || projects.length === 0) {
      return {
        content: [{ type: "text", text: "No projects found." }]
      };
    }

    // Apply pagination if requested
    if (args.page_size || args.page) {
      const pageSize = args.page_size || 10;
      const page = args.page || 1;
      const startIndex = (page - 1) * pageSize;
      const endIndex = startIndex + pageSize;
      projects = projects.slice(startIndex, endIndex);
    }

    return {
      data: projects,
      count: projects.length
    };
  }
}
