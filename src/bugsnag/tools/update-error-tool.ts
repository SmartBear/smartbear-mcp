/**
 * Update Error Tool
 *
 * Updates the status of an error, such as marking it as resolved, ignored, or changing its severity.
 */

import {
  ToolDefinition,
  ToolExecutionContext,
  ToolResult,
  BaseBugsnagTool,
  ErrorArgs
} from "../types.js";
import {
  CommonParameterDefinitions,
  validateToolArgs,
  executeWithErrorHandling
} from "../utils/tool-utilities.js";

/**
 * Arguments interface for the Update Error tool
 */
export interface UpdateErrorArgs extends ErrorArgs {
  operation: "override_severity" | "open" | "fix" | "ignore" | "discard" | "undiscard";
  severity?: "error" | "warning" | "info";
}

/**
 * Update Error Tool implementation
 *
 * Allows updating the workflow state of an error, such as marking it as fixed,
 * ignored, or changing its severity level.
 */
export class UpdateErrorTool extends BaseBugsnagTool {
  readonly name = "update_error";

  readonly definition: ToolDefinition = {
    title: "Update Error",
    summary: "Update the status of an error",
    purpose: "Change an error's workflow state, such as marking it as resolved or ignored",
    useCases: [
      "Mark an error as open, fixed or ignored",
      "Discard or un-discard an error",
      "Update the severity of an error"
    ],
    parameters: [
      CommonParameterDefinitions.errorId(),
      CommonParameterDefinitions.updateOperation(),
    ],
    examples: [
      {
        description: "Mark an error as fixed",
        parameters: {
          errorId: "6863e2af8c857c0a5023b411",
          operation: "fix"
        },
        expectedOutput: "Success response indicating the error was marked as fixed"
      },
      {
        description: "Change error severity",
        parameters: {
          errorId: "6863e2af8c857c0a5023b411",
          operation: "override_severity"
        },
        expectedOutput: "Success response after prompting for new severity level"
      }
    ],
    hints: [
      "Only use valid operations - BugSnag may reject invalid values",
      "When using 'override_severity', you will be prompted to provide the new severity level"
    ]
  };

  constructor(hasProjectApiKey: boolean = false) {
    super();

    // Add conditional projectId parameter if no project API key is configured
    if (!hasProjectApiKey) {
      this.definition.parameters.unshift(CommonParameterDefinitions.projectId(true));
    }
  }

  async execute(args: UpdateErrorArgs, context: ToolExecutionContext): Promise<ToolResult> {
    return executeWithErrorHandling(this.name, async () => {
      // Validate arguments
      validateToolArgs(args, this.definition.parameters, this.name);

      const { services, getInput } = context;

      // Validate required parameters
      if (!args.errorId || !args.operation) {
        throw new Error("Both errorId and operation arguments are required");
      }

      // Get the project (either from projectId or current project)
      const project = await services.getInputProject(args.projectId);

      let severity = undefined;

      // Handle override_severity operation - prompt user for severity
      if (args.operation === 'override_severity') {
        const result = await getInput({
          message: "Please provide the new severity for the error (e.g. 'info', 'warning', 'error', 'critical')",
          requestedSchema: {
            type: "object",
            properties: {
              severity: {
                type: "string",
                enum: ['info', 'warning', 'error'],
                description: "The new severity level for the error"
              }
            }
          },
          required: ["severity"]
        });

        if (result.action === "accept" && result.content?.severity) {
          severity = result.content.severity;
        }
      }

      // Update the error using the shared service
      const success = await services.updateError(project.id!, args.errorId, args.operation, { severity });

      return { success };
    });
  }
}
