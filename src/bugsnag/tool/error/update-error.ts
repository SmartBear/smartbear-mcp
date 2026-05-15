import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools";
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
  "snooze",
  "link_issue",
  "unlink_issue",
] as const;

const PERMITTED_REOPEN_CONDITIONS = [
  "occurs_after",
  "n_occurrences_in_m_hours",
  "n_additional_occurrences",
  "n_additional_users",
] as const;

const inputSchema = z.object({
  projectId: toolInputParameters.projectId,
  errorId: toolInputParameters.errorId,
  operation: z
    .enum(PERMITTED_UPDATE_OPERATIONS)
    .describe("The operation to apply to the error"),
  issue_url: z
    .string()
    .optional()
    .describe(
      "The URL of the issue to link to the error - required when operation is 'link_issue'",
    ),
  reopenRules: z
    .object({
      reopenIf: z
        .enum(PERMITTED_REOPEN_CONDITIONS)
        .describe("Condition for when the error should be reopened"),
      additionalUsers: z
        .number()
        .min(1)
        .max(100000)
        .optional()
        .describe(
          "for n_additional_users reopen rules, the number of additional users to be affected by an Error before the Error is automatically reopened.",
        ),
      seconds: z
        .number()
        .min(1)
        .optional()
        .describe(
          "for occurs_after reopen rules, the number of seconds that the Error should be snoozed for.",
        ),
      occurrences: z
        .number()
        .min(1)
        .optional()
        .describe(
          "for n_occurrences_in_m_hours reopen rules, the number of occurrences to allow in the number of hours indicated by the hours field, before the Error is automatically reopened.",
        ),
      hours: z
        .number()
        .min(1)
        .optional()
        .describe(
          "for n_occurrences_in_m_hours reopen rules, the number of hours.",
        ),
      additionalOccurrences: z
        .number()
        .min(1)
        .optional()
        .describe(
          "or n_additional_occurrences reopen rules, the number of additional occurrences allowed before reopening.",
        ),
    })
    .optional()
    .describe(
      "Reopen rules for snooze operation - required when operation is 'snooze'",
    ),
});

// Updates an error's workflow state (e.g. fix, ignore, snooze, link/unlink issue). Prompts for severity when overriding it.
export class UpdateError extends Tool<BugsnagClient> {
  private getInput: GetInputFunction;

  specification: ToolParams = {
    title: "Update Error",
    toolset: "errors",
    summary: "Update the status of an error",
    purpose:
      "Change an error's workflow state, such as marking it as resolved or ignored",
    useCases: [
      "Mark an error as open, fixed or ignored",
      "Discard or un-discard an error",
      "Update the severity of an error",
      "Snooze an error with defined conditions for when it should be reopened",
    ],
    inputSchema,
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
      {
        description: "Snooze an error for 1 hour",
        parameters: {
          errorId: "6863e2af8c857c0a5023b411",
          operation: "snooze",
          reopenRules: {
            reopenIf: "occurs_after",
            seconds: 3600,
          },
        },
        expectedOutput:
          "Success response indicating the error was snoozed for 1 hour",
      },
      {
        description: "Snooze an error until 5 additional users are affected",
        parameters: {
          errorId: "6863e2af8c857c0a5023b411",
          operation: "snooze",
          reopenRules: {
            reopenIf: "n_additional_users",
            additionalUsers: 5,
          },
        },
        expectedOutput:
          "Success response indicating the error was snoozed until 5 additional users are affected",
      },
      {
        description: "Snooze an error until 10 occurrences in 24 hours",
        parameters: {
          errorId: "6863e2af8c857c0a5023b411",
          operation: "snooze",
          reopenRules: {
            reopenIf: "n_occurrences_in_m_hours",
            occurrences: 10,
            hours: 24,
          },
        },
        expectedOutput:
          "Success response indicating the error was snoozed until 10 occurrences in 24 hours",
      },
      {
        description: "Link a Jira issue to an error",
        parameters: {
          errorId: "6863e2af8c857c0a5023b411",
          operation: "link_issue",
          issue_url: "https://smartbear.atlassian.net/browse/PIPE-9547",
        },
        expectedOutput:
          "Success response indicating the Jira issue was linked to the error",
      },
      {
        description: "Unlink a Jira issue from an error",
        parameters: {
          errorId: "6863e2af8c857c0a5023b411",
          operation: "unlink_issue",
        },
        expectedOutput:
          "Success response indicating the Jira issue was unlinked from the error",
      },
    ],
    hints: [
      "Only use valid operations - BugSnag may reject invalid values",
      "When using 'snooze' operation, reopenRules parameter is required",
      "When using 'link_issue' operation, issue_url parameter is required",
      "Use 'unlink_issue' to remove the link between an error and its issue",
      "For 'occurs_after' reopen rules, specify 'seconds' parameter",
      "For 'n_additional_users' reopen rules, specify 'additionalUsers' parameter (max 100,000)",
      "For 'n_occurrences_in_m_hours' reopen rules, specify both 'occurrences' and 'hours' parameters",
      "For 'n_additional_occurrences' reopen rules, specify 'additionalOccurrences' parameter",
      "Snoozing temporarily silences an error until the specified reopen condition is met",
    ],
    readOnly: false,
    idempotent: false,
  };

  constructor(client: BugsnagClient, getInput: GetInputFunction) {
    super(client);
    this.getInput = getInput;
  }

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
    const params = inputSchema.parse(args);
    const project = await this.client.getInputProject(params.projectId);

    // Validate snooze operation requirements
    if (params.operation === "snooze" && !params.reopenRules) {
      throw new ToolError(
        "reopenRules parameter is required when using 'snooze' operation",
      );
    }

    // Validate link_issue operation requirements
    if (params.operation === "link_issue" && !params.issue_url) {
      throw new ToolError(
        "'issue_url' parameter is required for 'link_issue' operation",
      );
    }

    // Validate reopen rule parameters based on reopenIf type
    if (params.reopenRules) {
      const { reopenIf } = params.reopenRules;
      if (reopenIf === "occurs_after" && !params.reopenRules.seconds) {
        throw new ToolError(
          "'seconds' parameter is required for 'occurs_after' reopen rules",
        );
      }
      if (
        reopenIf === "n_additional_users" &&
        !params.reopenRules.additionalUsers
      ) {
        throw new ToolError(
          "'additionalUsers' parameter is required for 'n_additional_users' reopen rules",
        );
      }
      if (
        reopenIf === "n_occurrences_in_m_hours" &&
        (!params.reopenRules.occurrences || !params.reopenRules.hours)
      ) {
        throw new ToolError(
          "Both 'occurrences' and 'hours' parameters are required for 'n_occurrences_in_m_hours' reopen rules",
        );
      }
      if (
        reopenIf === "n_additional_occurrences" &&
        !params.reopenRules.additionalOccurrences
      ) {
        throw new ToolError(
          "'additionalOccurrences' parameter is required for 'n_additional_occurrences' reopen rules",
        );
      }
    }

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

    // Prepare reopen rules for API call
    let reopenRules: any;
    if (params.reopenRules) {
      reopenRules = {
        reopen_if: params.reopenRules.reopenIf,
      };
      if (params.reopenRules.additionalUsers !== undefined) {
        reopenRules.additional_users = params.reopenRules.additionalUsers;
      }
      if (params.reopenRules.seconds !== undefined) {
        reopenRules.seconds = params.reopenRules.seconds;
      }
      if (params.reopenRules.occurrences !== undefined) {
        reopenRules.occurrences = params.reopenRules.occurrences;
      }
      if (params.reopenRules.hours !== undefined) {
        reopenRules.hours = params.reopenRules.hours;
      }
      if (params.reopenRules.additionalOccurrences !== undefined) {
        reopenRules.additional_occurrences =
          params.reopenRules.additionalOccurrences;
      }
    }

    const errorUpdateRequestBody: any = {
      operation: Object.values(ErrorUpdateRequest.OperationEnum).find(
        (value) => value === params.operation,
      ) as ErrorUpdateRequest.OperationEnum,
    };
    if (severity !== undefined) {
      errorUpdateRequestBody.severity = severity;
    }
    if (reopenRules !== undefined) {
      errorUpdateRequestBody.reopen_rules = reopenRules;
    }
    if (params.operation === "link_issue" && params.issue_url) {
      errorUpdateRequestBody.issue_url = params.issue_url;
      errorUpdateRequestBody.verify_issue_url = true;
    }

    const result = await this.client.errorsApi.updateErrorOnProject(
      project.id,
      params.errorId,
      errorUpdateRequestBody,
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
