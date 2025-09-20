/**
 * List Releases Tool
 *
 * Lists releases for a project with optional filtering by release stage and pagination.
 * Includes stability data integration for enhanced release analysis.
 */

import { z } from "zod";
import {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  ProjectArgs,
  PaginationArgs,
  BugsnagTool
} from "../../types.js";
import {
  CommonParameterDefinitions,
  validateToolArgs,
} from "../../tool-utilities.js";

/**
 * Arguments interface for the List Releases tool
 */
export interface ListReleasesArgs extends ProjectArgs, PaginationArgs {
  releaseStage?: string;
  visibleOnly?: boolean;
  nextUrl?: string;
}

/**
 * List Releases Tool implementation
 *
 * Lists releases for a project with optional filtering by release stage.
 * Includes stability data and pagination support for comprehensive release analysis.
 */
export class ListReleasesTool implements BugsnagTool {
  readonly name = "list_releases";
  readonly hasProjectIdParameter = true;
  readonly enableInSingleProjectMode = true;

  readonly definition: ToolDefinition = {
    title: "List Releases",
    summary: "List releases for a project with optional filtering by release stage",
    purpose: "Retrieve a list of release summaries to analyze deployment history and associated errors",
    useCases: [
      "View recent releases to correlate with error spikes",
      "Filter releases by stage (e.g. production, staging) for targeted analysis",
      "Monitor release quality and stability metrics over time",
      "Track deployment history and associated error patterns"
    ],
    parameters: [
      CommonParameterDefinitions.releaseStage(),
      {
        name: "visibleOnly",
        type: z.boolean().default(true),
        required: false,
        description: "Whether to only include releases that are marked as visible (default: true)",
        examples: ["true", "false"]
      },
      CommonParameterDefinitions.nextUrl()
    ],
    examples: [
      {
        description: "List all releases for a project",
        parameters: {
          projectId: "515fb9337c1074f6fd000003"
        },
        expectedOutput: "JSON object with releases array and optional next URL for pagination"
      },
      {
        description: "List production releases for a project",
        parameters: {
          projectId: "515fb9337c1074f6fd000003",
          releaseStage: "production"
        },
        expectedOutput: "JSON object with filtered releases array and metadata"
      },
      {
        description: "Get the next page of results",
        parameters: {
          projectId: "515fb9337c1074f6fd000003",
          nextUrl: "/projects/515fb9337c1074f6fd000003/releases?offset=30&per_page=30"
        },
        expectedOutput: "JSON object with next page of releases"
      }
    ],
    hints: [
      "For more detailed results use the Get Release tool",
      "Use releaseStage parameter to filter releases by environment (production, staging, etc.)",
      "Releases include stability data showing error rates and target compliance",
      "Use pagination for projects with many releases to manage response size"
    ]
  };

  async execute(args: ListReleasesArgs, context: ToolExecutionContext): Promise<object> {
    // Validate arguments
    validateToolArgs(args, this.definition.parameters, this.name);

    const { services } = context;

    // Get the project
    const project = await services.getInputProject(args.projectId);

    // Prepare options for the API call
    const options: any = {
      release_stage_name: args.releaseStage ?? "production",
      visible_only: args.visibleOnly ?? true,
      next_url: args.nextUrl ?? null
    };

    // Call the service to list releases
    const { releases, nextUrl } = await services.listReleases(project.id, options);

    // Format the result with pagination info
    const result = {
      releases,
      next: nextUrl ?? null
    };

    return result;
  }
}
