import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool } from "../../../common/tools";
import type { GetInputFunction, ToolParams } from "../../../common/types";
import type { BugsnagClient } from "../../client";
import { ErrorUpdateRequest } from "../../client/api/index";
import { toolInputParameters } from "../../input-schemas";

const PERMITTED_UPDATE_OPERATIONS = [
  "override_severity",
  "open",
  "fix",
  "ignore",
  "discard",
  "undiscard",
] as const;

export class UpdateError extends Tool<BugsnagClient> {
  private getInput: GetInputFunction;

  specification: ToolParams = {
    title: "Update Error",
    summary: "Update the status of an error",
    purpose:
      "Change an error's workflow state, such as marking it as resolved or ignored",
    useCases: [
      "Mark an error as open, fixed or ignored",
      "Discard or un-discard an error",
      "Update the severity of an error",
    ],
    inputSchema: z.object({
      projectId: toolInputParameters.projectId,
      errorId: toolInputParameters.errorId,
      operation: z
        .enum(PERMITTED_UPDATE_OPERATIONS)
        .describe("The operation to apply to the error"),
    }),
    examples: [
      {
        description: "Mark an error as fixed",
        parameters: {
          errorId: "6863e2af8c857c0a5023b411",
          operation: "fix",
        },
        expectedOutput:
          "Success response indicating the error was marked as fixed",
      },
    ],
    hints: [
      "Only use valid operations - BugSnag may reject invalid values",
    ],
    readOnly: false,
    idempotent: false,
  };

  constructor(client: BugsnagClient, getInput: GetInputFunction) {
    super(client);
    this.getInput = getInput;
  }

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
    const inputSchema = z.object({
      projectId: toolInputParameters.projectId,
      errorId: toolInputParameters.errorId,
      operation: z
        .enum(PERMITTED_UPDATE_OPERATIONS)
        .describe("The operation to apply to the error"),
    });
    const params = inputSchema.parse(args);
    const project = await this.client.getInputProject(params.projectId);

    let severity: any;
    if (params.operation === "override_severity") {
      // illicit the severity from the user
      const result = await this.getInput({
        message:
          "Please provide the new severity for the error (e.g. 'info', 'warning', 'error', 'critical')",
        requestedSchema: {
          type: "object",
          properties: {
            severity: {
              type: "string",
              enum: ["info", "warning", "error"],
              description: "The new severity level for the error",
            },
          },
          required: ["severity"],
        },
      });

      if (result.action === "accept" && result.content?.severity) {
        severity = result.content.severity;
      }
    }

    const result = await this.client.errorsApi.updateErrorOnProject(
      project.id,
      params.errorId,
      {
        operation: Object.values(ErrorUpdateRequest.OperationEnum).find(
          (value) => value === params.operation,
        ) as ErrorUpdateRequest.OperationEnum,
        severity: severity,
      },
    );
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify({
            success: result.status === 200 || result.status === 204,
          }),
        },
      ],
    };
  };
}
