/**
 * List Builds in Release Tool
 *
 * Lists builds associated with a specific release.
 * Includes caching for improved performance and error handling for invalid release IDs.
 */

import {
  BugsnagTool,
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
} from "../../types.js";
import {
  CommonParameterDefinitions,
  validateToolArgs,
  formatListResult
} from "../../tool-utilities.js";

/**
 * Arguments interface for the List Builds in Release tool
 */
export interface ListBuildsInReleaseArgs {
  releaseId: string;
}

/**
 * List Builds in Release Tool implementation
 *
 * Lists all builds associated with a specific release. Uses caching for improved
 * performance and provides comprehensive error handling for invalid release IDs.
 */
export class ListBuildsInReleaseTool implements BugsnagTool {
  readonly name = "list_builds_in_release";
  readonly hasProjectIdParameter = false;
  readonly enableInSingleProjectMode = true;

  readonly definition: ToolDefinition = {
    title: "List Builds in Release",
    summary: "List builds associated with a specific release",
    purpose: "Retrieve a list of builds for a given release to analyze deployment history and associated errors",
    useCases: [
      "Analyze which builds are included in a specific release",
      "Track build composition and deployment history for releases",
      "Debug release-specific issues by examining constituent builds",
      "Monitor build quality within release contexts"
    ],
    parameters: [
      CommonParameterDefinitions.releaseId()
    ],
    examples: [
      {
        description: "Get all builds in a specific release",
        parameters: {
          releaseId: "5f8d0d55c9e77c0017a1b2c3"
        },
        expectedOutput: "JSON object with array of builds associated with the release"
      }
    ],
    hints: [
      "Release IDs can be found using the List Releases tool",
      "This tool shows which builds are grouped together in a release",
      "Build information is cached for improved performance",
      "Use this to understand the composition of a release before deployment"
    ]
  };

  async execute(args: ListBuildsInReleaseArgs, context: ToolExecutionContext): Promise<object> {
    // Validate arguments
    validateToolArgs(args, this.definition.parameters, this.name);

      const { services } = context;

      // Validate required parameters
      if (!args.releaseId) {
        throw new Error("releaseId argument is required");
      }

      try {
        // Get the builds for the release with caching
        const builds = await services.listBuildsInRelease(args.releaseId);

        // Format the result as a list
        const result = formatListResult(builds, builds.length);

        return result;
      } catch (error) {
        // Handle specific error cases for invalid release IDs
        if (error instanceof Error) {
          if (error.message.includes("404") || error.message.includes("not found")) {
            throw new Error(`Release with ID ${args.releaseId} not found. Please verify the release ID is correct.`);
          }
          if (error.message.includes("403") || error.message.includes("unauthorized")) {
            throw new Error(`Access denied to release ${args.releaseId}. Please check your permissions.`);
          }
        }

        // Re-throw other errors as-is
        throw error;
      }
  }
}
