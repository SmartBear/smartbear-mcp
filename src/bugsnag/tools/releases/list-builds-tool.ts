/**
 * List Builds Tool
 *
 * Lists builds for a project with optional filtering by release stage and pagination.
 * Includes stability data integration for enhanced build analysis.
 */

import {
  ToolDefinition,
  ToolExecutionContext,
  ProjectArgs,
  PaginationArgs,
  BugsnagTool
} from "../../types.js";
import {
  CommonParameterDefinitions,
  validateToolArgs,
} from "../../tool-utilities.js";

/**
 * Arguments interface for the List Builds tool
 */
export interface ListBuildsArgs extends ProjectArgs, PaginationArgs {
  releaseStage?: string;
  nextUrl?: string;
}

/**
 * List Builds Tool implementation
 *
 * Lists builds for a project with optional filtering by release stage.
 * Includes stability data and pagination support for comprehensive build analysis.
 */
export class ListBuildsTool implements BugsnagTool {
  readonly name = "list_builds";
  readonly hasProjectIdParameter = true;
  readonly enableInSingleProjectMode = true;

  readonly definition: ToolDefinition = {
    title: "List Builds",
    summary: "List builds for a project with optional filtering by release stage",
    purpose: "Retrieve a list of build summaries to analyze deployment history and associated errors",
    useCases: [
      "Analyze deployment history and build stability over time",
      "Filter builds by release stage to focus on specific environments",
      "Monitor build quality and error rates across deployments",
      "Track stability metrics and targets for builds"
    ],
    parameters: [
      CommonParameterDefinitions.releaseStage(),
      CommonParameterDefinitions.perPage(30),
      CommonParameterDefinitions.nextUrl()
    ],
    examples: [
      {
        description: "Get all builds for a project",
        parameters: {
          projectId: "515fb9337c1074f6fd000003"
        },
        expectedOutput: "JSON object with builds array, count, and optional next URL for pagination"
      },
      {
        description: "Get production builds only",
        parameters: {
          projectId: "515fb9337c1074f6fd000003",
          releaseStage: "production"
        },
        expectedOutput: "JSON object with filtered builds array and metadata"
      },
      {
        description: "Get next page of results",
        parameters: {
          projectId: "515fb9337c1074f6fd000003",
          nextUrl: "https://api.bugsnag.com/projects/515fb9337c1074f6fd000003/builds?offset=30"
        },
        expectedOutput: "JSON object with next page of builds"
      }
    ],
    hints: [
      "For more detailed results use the Get Build tool",
      "Use releaseStage parameter to filter builds by environment (production, staging, etc.)",
      "Builds include stability data showing error rates and target compliance",
      "Use pagination for projects with many builds to manage response size"
    ]
  };

  async execute(args: ListBuildsArgs, context: ToolExecutionContext): Promise<object> {
    // Validate arguments
    validateToolArgs(args, this.definition.parameters, this.name);

    const { services } = context;

    // Get the project
    const project = await services.getInputProject(args.projectId);

    // Prepare options for the API call
    const options: any = {};

    if (args.releaseStage) {
      options.release_stage = args.releaseStage;
    }

    if (args.per_page) {
      options.per_page = args.per_page;
    }

    if (args.nextUrl) {
      options.next_url = args.nextUrl;
    }

    // Call the service to list builds
    const { builds, nextUrl } = await services.listBuilds(project.id, options);

    // Format the result with standard data structure
    const result: any = {
      data: builds,
      count: builds.length
    };

    if (nextUrl) {
      result.next = nextUrl;
    }

    return result;
  }
}
