import { z } from "zod";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";

export class CollaboratorClient implements Client {
  name = "Collaborator";
  prefix = "collaborator";
  private readonly baseUrl: string;
  private readonly username: string;
  private readonly loginTicket: string;

  constructor(baseUrl: string, username: string, loginTicket: string) {
    this.baseUrl = baseUrl;
    this.username = username;
    this.loginTicket = loginTicket;
  }

  /**
   * Calls the Collaborator API with the given commands, prepending authentication automatically.
   * @param commands Array of Collaborator API commands (excluding authentication)
   * @returns Raw Collaborator API response
   */
  async call(commands: any[]): Promise<any> {
    const url = `${this.baseUrl}/services/json/v1`;
    // Always prepend authentication command automatically
    const body = [
      {
        command: "SessionService.authenticate",
        args: { login: this.username, ticket: this.loginTicket },
      },
      ...commands,
    ];
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(
        `Collaborator API call failed: ${response.status} - ${await response.text()}`,
      );
    }
    return await response.json();
  }

  /**
   * Registers the Collaborator API tool with the MCP server. Accepts commands (excluding authentication).
   */
  registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): void {
    // findReviewById tool
    register(
      {
        title: "Find Collaborator Review By ID",
        summary: "Finds a review in Collaborator by its review ID.",
        inputSchema: z.object({
          reviewId: z.string().describe("The Collaborator review ID to find."),
        }),
      },
      async (args, _extra) => {
        try {
          const { reviewId } = args;
          const commands = [
            {
              command: "ReviewService.findReviewById",
              args: { reviewId },
            },
          ];
          const result = await this.call(commands);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    // createReview tool
    register(
      {
        title: "Create Collaborator Review",
        summary:
          "Creates a new review in Collaborator. All parameters are optional.",
        inputSchema: z.object({
          creator: z
            .string()
            .optional()
            .describe(
              "Collaborator username of the review creator. Optional. Default: currently logged in user.",
            ),
          title: z
            .string()
            .optional()
            .describe("Title of the review. Optional. Default: null."),
          templateName: z
            .string()
            .optional()
            .describe(
              "Review template name. Optional. Default: system default template.",
            ),
          accessPolicy: z
            .string()
            .optional()
            .describe(
              "Access policy for the review. Optional. Default: ANYONE.",
            ),
        }),
      },
      async (args, _extra) => {
        try {
          const commandArgs: any = {};
          if (args.creator !== undefined) commandArgs.creator = args.creator;
          if (args.title !== undefined) commandArgs.title = args.title;
          if (args.templateName !== undefined)
            commandArgs.templateName = args.templateName;
          if (args.accessPolicy !== undefined)
            commandArgs.accessPolicy = args.accessPolicy;
          const commands = [
            {
              command: "ReviewService.createReview",
              args: commandArgs,
            },
          ];
          const result = await this.call(commands);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    // rejectReview tool
    register(
      {
        title: "Reject Collaborator Review",
        summary:
          "Rejects a review in Collaborator by its review ID and reason.",
        inputSchema: z.object({
          reviewId: z
            .union([z.string(), z.number()])
            .describe("The Collaborator review ID to reject."),
          reason: z.string().describe("Reason for rejecting the review."),
        }),
      },
      async (args, _extra) => {
        try {
          const { reviewId, reason } = args;
          const commands = [
            {
              command: "ReviewService.reject",
              args: {
                reviewId,
                reason,
              },
            },
          ];
          const result = await this.call(commands);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    register(
      {
        title: "ReviewService Action",
        summary:
          "Invoke any ReviewService method by name and arguments. For finishReviewPhase and waitOnPhase, provide reviewId (required) and until (optional, defaults to 'ANY').",
        inputSchema: z.object({
          action: z.enum([
            "moveReviewToAnnotatePhase",
            "cancel",
            "reopen",
            "uncancel",
          ]),
          args: z.record(z.any()),
        }),
      },
      async (params, _extra) => {
        try {
          const { action, args } = params;
          const commands = [{ command: `ReviewService.${action}`, args }];
          const result = await this.call(commands);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    // getReviews tool
    register(
      {
        title: "Get Collaborator Reviews",
        summary:
          "Retrieves reviews from Collaborator using ReviewService.getReviews. All parameters are optional and only provided ones are sent.",
        inputSchema: z.object({
          login: z
            .string()
            .optional()
            .describe("Collaborator username to filter reviews."),
          role: z
            .string()
            .optional()
            .describe("Role to filter reviews (e.g., AUTHOR)."),
          creator: z
            .boolean()
            .optional()
            .describe("Whether to filter by creator."),
          reviewPhase: z
            .string()
            .optional()
            .describe("Review phase to filter (e.g., PLANNING)."),
          fullInfo: z
            .boolean()
            .optional()
            .describe("Whether to retrieve full review info."),
          fromDate: z
            .string()
            .optional()
            .describe('Minimal creation date in format "yyyy-MM-dd"'),
          toDate: z
            .string()
            .optional()
            .describe('Maximal creation date in format "yyyy-MM-dd"'),
        }),
      },
      async (args, _extra) => {
        try {
          // Only include provided fields in reviewArgs
          const reviewArgs: any = {};
          if (args.login !== undefined) reviewArgs.login = args.login;
          if (args.role !== undefined) reviewArgs.role = args.role;
          if (args.creator !== undefined) reviewArgs.creator = args.creator;
          if (args.reviewPhase !== undefined)
            reviewArgs.reviewPhase = args.reviewPhase;
          if (args.fullInfo !== undefined) reviewArgs.fullInfo = args.fullInfo;
          if (args.fromDate !== undefined) reviewArgs.fromDate = args.fromDate;
          if (args.toDate !== undefined) reviewArgs.toDate = args.toDate;
          const commands = [
            {
              command: "ReviewService.getReviews",
              args: reviewArgs,
            },
          ];
          const result = await this.call(commands);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    // createIntegration tool
    register(
      {
        title: "Create Collaborator Remote System Configuration",
        summary:
          "Creates a remote system configuration in Collaborator (e.g., Bitbucket, GitHub, etc).",
        inputSchema: z.object({
          token: z
            .string()
            .describe("Remote system token, e.g., BITBUCKET, GITHUB, etc."),
          title: z.string().describe("Remote system title."),
          config: z
            .string()
            .describe(
              "JSON string containing configuration parameters for the remote system.",
            ),
          reviewTemplateId: z
            .string()
            .optional()
            .describe(
              "Optional review template ID used by this remote system.",
            ),
        }),
      },
      async (args, _extra) => {
        try {
          const { token, title, config, reviewTemplateId } = args;
          const commandArgs: any = { token, title, config };
          if (reviewTemplateId) commandArgs.reviewTemplateId = reviewTemplateId;
          const commands = [
            {
              command: "AdminRemoteSystemService.createIntegration",
              args: commandArgs,
            },
          ];
          const result = await this.call(commands);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    // editIntegration tool
    register(
      {
        title: "Edit Collaborator Remote System Configuration",
        summary:
          "Edits parameters of an existing remote system configuration in Collaborator. Only title and config are editable after creation.",
        inputSchema: z.object({
          id: z
            .string()
            .describe("ID of the remote system Configuration to edit."),
          title: z.string().optional().describe("Remote system title."),
          config: z
            .string()
            .optional()
            .describe(
              "JSON string containing configuration parameters for the remote system.",
            ),
          reviewTemplateId: z
            .string()
            .optional()
            .describe(
              "Optional review template ID used by this remote system.",
            ),
        }),
      },
      async (args, _extra) => {
        try {
          const { id, title, config, reviewTemplateId } = args;
          const commandArgs: any = { id };
          if (title) commandArgs.title = title;
          if (config) commandArgs.config = config;
          if (reviewTemplateId) commandArgs.reviewTemplateId = reviewTemplateId;
          const commands = [
            {
              command: "AdminRemoteSystemService.editIntegration",
              args: commandArgs,
            },
          ];
          const result = await this.call(commands);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    // deleteIntegration tool
    register(
      {
        title: "Delete Collaborator Remote System Configuration",
        summary:
          "Deletes a remote system configuration in Collaborator by its ID.",
        inputSchema: z.object({
          id: z
            .union([z.string(), z.number()])
            .describe("ID of the remote system Configuration to delete."),
        }),
      },
      async (args, _extra) => {
        try {
          const commandArgs: any = {};
          if (args.id !== undefined)
            commandArgs.id =
              typeof args.id === "string" && !Number.isNaN(Number(args.id))
                ? Number(args.id)
                : args.id;
          const commands = [
            {
              command: "AdminRemoteSystemService.deleteIntegration",
              args: commandArgs,
            },
          ];
          const result = await this.call(commands);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    register(
      {
        title: "Update Collaborator Remote System Configuration Webhook",
        summary:
          "Updates the webhook for a remote system configuration in Collaborator by its ID.",
        inputSchema: z.object({
          id: z
            .union([z.string(), z.number()])
            .describe(
              "ID of the remote system Configuration to update the webhook for.",
            ),
        }),
      },
      async (args, _extra) => {
        try {
          const commandArgs: any = {};
          if (args.id !== undefined)
            commandArgs.id =
              typeof args.id === "string" && !Number.isNaN(Number(args.id))
                ? Number(args.id)
                : args.id;
          const commands = [
            {
              command: "AdminRemoteSystemService.updateWebhook",
              args: commandArgs,
            },
          ];
          const result = await this.call(commands);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );

    // Test connection tool
    register(
      {
        title: "Test Collaborator Remote System Configuration Connection",
        summary:
          "Tests the connection for a remote system configuration in Collaborator by its ID.",
        inputSchema: z.object({
          id: z
            .union([z.string(), z.number()])
            .describe(
              "ID of the remote system Configuration to test connection for.",
            ),
        }),
      },
      async (args, _extra) => {
        try {
          const commandArgs: any = {};
          if (args.id !== undefined)
            commandArgs.id =
              typeof args.id === "string" && !Number.isNaN(Number(args.id))
                ? Number(args.id)
                : args.id;
          const commands = [
            {
              command: "AdminRemoteSystemService.testConnection",
              args: commandArgs,
            },
          ];
          const result = await this.call(commands);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${err instanceof Error ? err.message : String(err)}`,
              },
            ],
            isError: true,
          };
        }
      },
    );
  }
}
