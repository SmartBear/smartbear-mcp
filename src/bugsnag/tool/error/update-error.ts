import { z } from "zod";
import { ToolError } from "../../../common/tools";
import { BugsnagClient } from "../../client";
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
export const updateError = BugsnagClient.createTool(
  {
    title: "Update Error",
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
  },
  async ({ client, args, getInput }) => {
    const project = await client.getInputProject(args.projectId);

    // Validate snooze operation requirements
    if (args.operation === "snooze" && !args.reopenRules) {
      throw new ToolError(
        "reopenRules parameter is required when using 'snooze' operation",
      );
    }

    // Validate link_issue operation requirements
    if (args.operation === "link_issue" && !args.issue_url) {
      throw new ToolError(
        "'issue_url' parameter is required for 'link_issue' operation",
      );
    }

    // Validate reopen rule parameters based on reopenIf type
    if (args.reopenRules) {
      const { reopenIf } = args.reopenRules;
      if (reopenIf === "occurs_after" && !args.reopenRules.seconds) {
        throw new ToolError(
          "'seconds' parameter is required for 'occurs_after' reopen rules",
        );
      }
      if (
        reopenIf === "n_additional_users" &&
        !args.reopenRules.additionalUsers
      ) {
        throw new ToolError(
          "'additionalUsers' parameter is required for 'n_additional_users' reopen rules",
        );
      }
      if (
        reopenIf === "n_occurrences_in_m_hours" &&
        (!args.reopenRules.occurrences || !args.reopenRules.hours)
      ) {
        throw new ToolError(
          "Both 'occurrences' and 'hours' parameters are required for 'n_occurrences_in_m_hours' reopen rules",
        );
      }
      if (
        reopenIf === "n_additional_occurrences" &&
        !args.reopenRules.additionalOccurrences
      ) {
        throw new ToolError(
          "'additionalOccurrences' parameter is required for 'n_additional_occurrences' reopen rules",
        );
      }
    }

    let severity: any;
    if (args.operation === "override_severity") {
      // illicit the severity from the user
      const result = await getInput({
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
    if (args.reopenRules) {
      reopenRules = {
        reopen_if: args.reopenRules.reopenIf,
      };
      if (args.reopenRules.additionalUsers !== undefined) {
        reopenRules.additional_users = args.reopenRules.additionalUsers;
      }
      if (args.reopenRules.seconds !== undefined) {
        reopenRules.seconds = args.reopenRules.seconds;
      }
      if (args.reopenRules.occurrences !== undefined) {
        reopenRules.occurrences = args.reopenRules.occurrences;
      }
      if (args.reopenRules.hours !== undefined) {
        reopenRules.hours = args.reopenRules.hours;
      }
      if (args.reopenRules.additionalOccurrences !== undefined) {
        reopenRules.additional_occurrences =
          args.reopenRules.additionalOccurrences;
      }
    }

    const errorUpdateRequestBody: any = {
      operation: Object.values(ErrorUpdateRequest.OperationEnum).find(
        (value) => value === args.operation,
      ) as ErrorUpdateRequest.OperationEnum,
    };
    if (severity !== undefined) {
      errorUpdateRequestBody.severity = severity;
    }
    if (reopenRules !== undefined) {
      errorUpdateRequestBody.reopen_rules = reopenRules;
    }
    if (args.operation === "link_issue" && args.issue_url) {
      errorUpdateRequestBody.issue_url = args.issue_url;
      errorUpdateRequestBody.verify_issue_url = true;
    }

    const result = await client.errorsApi.updateErrorOnProject(
      project.id,
      args.errorId,
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
      structuredContent: {
        success: result.status === 200 || result.status === 204,
      },
    };
  },
);
