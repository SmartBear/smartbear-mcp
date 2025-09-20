/**
 * Get Release Tool
 *
 * Retrieves detailed information about a specific release by its ID.
 * Includes caching for improved performance and stability data integration.
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
 * Arguments interface for the Get Release tool
 */
export interface GetReleaseArgs extends ProjectArgs {
  releaseId: string;
}

/**
 * Get Release Tool implementation
 *
 * Retrieves detailed information about a specific release including metadata,
 * version information, source control details, and stability metrics.
 * Uses caching for improved performance.
 */
export class GetReleaseTool implements BugsnagTool {
  readonly name = "get_release";
  readonly hasProjectIdParameter = true;
  readonly enableInSingleProjectMode = true;

  readonly definition: ToolDefinition = {
    title: "Get Release",
    summary: "Get more details for a specific release by its ID",
    purpose: "Retrieve detailed information about a release for analysis and debugging",
    useCases: [
      "View release metadata such as version, source control info, and error counts",
      "Analyze a specific release to correlate with error spikes or deployments",
      "See the stability targets for a project and if the release meets them",
      "Get comprehensive release information for incident analysis"
    ],
    parameters: [
      CommonParameterDefinitions.releaseId()
    ],
    examples: [
      {
        description: "Get details for a specific release",
        parameters: {
          projectId: "515fb9337c1074f6fd000003",
          releaseId: "5f8d0d55c9e77c0017a1b2c3"
        },
        expectedOutput: "JSON object with release details including version, source control info, error counts and stability data"
      }
    ],
    hints: [
      "Release IDs can be found using the List Releases tool",
      "Release details include stability metrics and target compliance",
      "Release information is cached for improved performance",
      "Use this tool to get comprehensive information about a specific release"
    ],
    outputFormat: "JSON object containing release details along with stability metrics such as user and session stability, and whether it meets project targets"
  };

  async execute(args: GetReleaseArgs, context: ToolExecutionContext): Promise<object> {
    // Validate arguments
    validateToolArgs(args, this.definition.parameters, this.name);

    const { services } = context;

    // Get the project
    const project = await services.getInputProject(args.projectId);

    // Get the release with caching and stability data
    const release = await services.getRelease(project.id, args.releaseId);

    return release;
  }
}
