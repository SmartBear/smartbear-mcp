/**
 * Get Build Tool
 *
 * Retrieves detailed information about a specific build by its ID.
 * Includes caching and stability data enhancement for comprehensive build analysis.
 */

import {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  ProjectArgs,
  BugsnagTool
} from "../../types.js";
import {
  CommonParameterDefinitions,
  validateToolArgs,
} from "../../tool-utilities.js";

/**
 * Arguments interface for the Get Build tool
 */
export interface GetBuildArgs extends ProjectArgs {
  buildId: string;
}

/**
 * Get Build Tool implementation
 *
 * Retrieves detailed information about a specific build including stability data,
 * error rates, and target compliance. Uses caching for improved performance.
 */
export class GetBuildTool implements BugsnagTool {
  readonly name = "get_build";
  readonly hasProjectIdParameter = true;
  readonly enableInSingleProjectMode = true;

  readonly definition: ToolDefinition = {
    title: "Get Build",
    summary: "Get more details for a specific build by its ID",
    purpose: "Retrieve detailed information about a build for analysis and debugging",
    useCases: [
      "Get comprehensive build details including stability metrics",
      "Analyze build quality and error rates for specific deployments",
      "Monitor stability target compliance for individual builds",
      "Debug build-specific issues and performance metrics"
    ],
    parameters: [
      CommonParameterDefinitions.buildId()
    ],
    examples: [
      {
        description: "Get details for a specific build",
        parameters: {
          projectId: "515fb9337c1074f6fd000003",
          buildId: "build-123"
        },
        expectedOutput: "JSON object with complete build details including stability data, error counts, and metadata"
      }
    ],
    hints: [
      "Build IDs can be found using the List builds tool",
      "Build details include stability metrics showing user and session stability",
      "Stability data shows whether the build meets target and critical stability thresholds",
      "Build information is cached for improved performance on repeated requests"
    ]
  };

  async execute(args: GetBuildArgs, context: ToolExecutionContext): Promise<object> {
    // Validate arguments
    validateToolArgs(args, this.definition.parameters, this.name);

    const { services } = context;

    // Validate required parameters
    if (!args.buildId) {
      throw new Error("buildId argument is required");
    }

    // Get the project
    const project = await services.getInputProject(args.projectId);

    // Get the build details with caching and stability data
    const build = await services.getBuild(project.id, args.buildId);

    return build;
  }
}
