// biome-ignore-all lint/style/noExcessiveLinesPerFile: single-class-per-file Tool pattern used throughout this codebase; the length comes from the tool specification's examples/hints, not code complexity
// biome-ignore-all lint/security/noSecrets: this file contains many high-entropy API action-name / wire-format / fixture string constants that trip the noSecrets entropy heuristic; none are real secrets
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { z } from "zod";
import { Tool, ToolError } from "../../../common/tools.ts";
import type { GetInputFunction, ToolParams } from "../../../common/types.ts";
import { ErrorUpdateRequest } from "../../client/api/index.ts";
import type { BugsnagClient } from "../../client.ts";
import { toolInputParameters } from "../../input-schemas.ts";

const HTTP_STATUS_OK = 200;
const HTTP_STATUS_NO_CONTENT = 204;
const MAX_ADDITIONAL_USERS = 100_000;

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
        .max(MAX_ADDITIONAL_USERS)
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

type UpdateErrorParams = z.infer<typeof inputSchema>;

// Updates an error's workflow state (e.g. fix, ignore, snooze, link/unlink issue). Prompts for severity when overriding it.
export class UpdateError extends Tool<BugsnagClient> {
  private readonly getInput: GetInputFunction;

  specification: ToolParams = {
    title: "Update Error",
    toolset: "Errors",
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

  // Validate operation-specific requirements that the input schema can't express on its own.
  private validateParams(params: UpdateErrorParams): void {
    if (params.operation === "snooze" && !params.reopenRules) {
      throw new ToolError(
        "reopenRules parameter is required when using 'snooze' operation",
      );
    }

    if (params.operation === "link_issue" && !params.issue_url) {
      throw new ToolError(
        "'issue_url' parameter is required for 'link_issue' operation",
      );
    }

    if (!params.reopenRules) {
      return;
    }
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
      !(params.reopenRules.occurrences && params.reopenRules.hours)
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

  // Prompt the user for a new severity when overriding it; otherwise undefined.
  private async resolveSeverity(
    params: UpdateErrorParams,
  ): Promise<ErrorUpdateRequest["severity"]> {
    if (params.operation !== "override_severity") {
      return;
    }
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
      return result.content.severity as ErrorUpdateRequest["severity"];
    }
  }

  // Translate the tool's reopenRules input shape into the API's reopen_rules request shape.
  private buildReopenRules(
    params: UpdateErrorParams,
  ): ErrorUpdateRequest["reopen_rules"] {
    if (!params.reopenRules) {
      return;
    }
    const {
      reopenIf,
      additionalUsers,
      seconds,
      occurrences,
      hours,
      additionalOccurrences,
    } = params.reopenRules;
    return {
      reopen_if: reopenIf as unknown as NonNullable<
        ErrorUpdateRequest["reopen_rules"]
      >["reopen_if"],
      ...(additionalUsers !== undefined && {
        additional_users: additionalUsers,
      }),
      ...(seconds !== undefined && { seconds }),
      ...(occurrences !== undefined && { occurrences }),
      ...(hours !== undefined && { hours }),
      ...(additionalOccurrences !== undefined && {
        additional_occurrences: additionalOccurrences,
      }),
    };
  }

  handle: ToolCallback<ZodRawShape> = async (args, _extra) => {
    const params = inputSchema.parse(args);
    const project = await this.client.getInputProject(params.projectId);

    this.validateParams(params);

    const severity = await this.resolveSeverity(params);
    const reopenRules = this.buildReopenRules(params);

    const errorUpdateRequestBody: ErrorUpdateRequest = {
      operation: Object.values(ErrorUpdateRequest.OperationEnum).find(
        (value) => value === params.operation,
      ) as ErrorUpdateRequest.OperationEnum,
      ...(severity !== undefined && { severity }),
      ...(reopenRules !== undefined && { reopen_rules: reopenRules }),
      ...(params.operation === "link_issue" &&
        params.issue_url && {
          issue_url: params.issue_url,
          verify_issue_url: true,
        }),
    };

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
            success:
              result.status === HTTP_STATUS_OK ||
              result.status === HTTP_STATUS_NO_CONTENT,
          }),
        },
      ],
    };
  };
}
