import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import {
  ZodIntersection,
  ZodObject,
  type ZodRawShape,
  type ZodType,
} from "zod";
import Bugsnag from "../common/bugsnag";
import { CacheService } from "./cache";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./info";
import {
  executeElicitationOrPolyfill,
  isElicitationPolyfillResult,
} from "./pollyfills";
import { ToolError } from "./tools";
import type { Client, ToolParams } from "./types";
import {
  getDefaultValue,
  getReadableTypeName,
  getTypeDescription,
  isOptionalType,
} from "./zod-utils";

export class SmartBearMcpServer extends McpServer {
  private cache: CacheService;
  private samplingSupported = false;
  private elicitationSupported = false;
  private clients: Client[] = [];

  constructor() {
    super(
      {
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION,
      },
      {
        instructions: `When creating or editing a Reflect test using a connected recording session, follow these guidelines:

1. After connecting to a session, get the list of segments for the session's platform type so you know what actions could be added via segments vs needing to create new steps. Do not list tests, only list segments.
2. Before performing an action, take a screenshot to understand the current state of the application.
3. Each add_prompt_step request should perform a single action or assertion. Do not combine multiple actions or assertions into a single step.
4. Only perform one action at a time unless you're sure the action won't move the application to a different screen. For example, you can send multiple add_prompt_step requests to fill out individual form fields if those fields are visible on the current screen.
5. Check the list of existing Segments to see if a Segment exists that achieves a similar goal to what you're trying to do next. If so, add the segment instead of creating new steps.
6. If a step fails, use delete_previous_step to remove it and try a different approach.
7. After completing a task, if the task required multiple prompt steps, add a final prompt step that validates the current state of the page based on what you see on the screen. In your validation, do not reference information that can change from run to run.`,
        capabilities: {
          resources: { listChanged: true }, // Server supports dynamic resource lists
          tools: { listChanged: true }, // Server supports dynamic tool lists
          logging: {}, // Server supports logging messages
          prompts: {}, // Server supports sending prompts to Host
        },
      },
    );
    this.cache = new CacheService();
  }

  getCache(): CacheService {
    return this.cache;
  }

  setSamplingSupported(supported: boolean): void {
    this.samplingSupported = supported;
  }

  isSamplingSupported(): boolean {
    return this.samplingSupported;
  }

  setElicitationSupported(supported: boolean): void {
    this.elicitationSupported = supported;
  }

  isElicitationSupported(): boolean {
    return this.elicitationSupported;
  }

  getClients(): Client[] {
    return this.clients;
  }

  async cleanupSession(mcpSessionId: string): Promise<void> {
    for (const client of this.clients) {
      await client.cleanupSession?.(mcpSessionId);
    }
  }

  async addClient(client: Client): Promise<void> {
    this.clients.push(client);
    await client.registerTools(
      (params, cb) => {
        const toolName = this.getToolName(client, params.title);
        const toolTitle = this.getToolTitle(client, params.title);
        return super.registerTool(
          toolName,
          {
            title: toolTitle,
            description: this.getDescription(params),
            inputSchema: params.inputSchema
              ? this.schemaToRawShape(params.inputSchema)
              : {},
            outputSchema: this.schemaToRawShape(params.outputSchema),
            annotations: this.getAnnotations(toolTitle, params),
          },
          async (args: any, extra: any) => {
            try {
              if (!client.isConfigured()) {
                throw new ToolError(
                  `The tool is not configured - configuration options for ${client.name} are missing or invalid.`,
                );
              }
              const result = await cb(args, extra);
              if (result) {
                this.validateCallbackResult(result, params);
                this.addStructuredContentAsText(result);
              }
              return result;
            } catch (e) {
              // ToolErrors should not be reported to BugSnag
              if (e instanceof ToolError) {
                return {
                  isError: true,
                  content: [
                    {
                      type: "text" as const,
                      text: `Error executing ${toolTitle}: ${e.message}`,
                    },
                  ],
                };
              } else {
                Bugsnag.notify(
                  e as unknown as Error,
                  (event: {
                    addMetadata: (arg0: string, arg1: { tool: string }) => void;
                    unhandled: boolean;
                  }) => {
                    event.addMetadata("app", { tool: toolName });
                    event.unhandled = true;
                  },
                );
              }
              throw e;
            }
          },
        );
      },
      async (params, options) => {
        const result = await executeElicitationOrPolyfill(
          this,
          params,
          options,
        );

        if (isElicitationPolyfillResult(result)) {
          const schemaStr =
            "requestedSchema" in result.inputRequest
              ? `\n\nSchema: ${JSON.stringify(result.inputRequest.requestedSchema, null, 2)}`
              : "";
          throw new ToolError(
            `Input collection required: ${result.inputRequest.message}${schemaStr}\n\n${result.instructions}`,
          );
        }

        return result;
      },
    );

    if (client.registerResources) {
      client.registerResources((params, cb) => {
        const url = `${client.toolPrefix}://${params.name}/${params.path}`;
        return super.registerResource(
          this.getToolName(client, params.name),
          new ResourceTemplate(url, {
            list: undefined,
          }),
          {
            title: this.getToolTitle(client, params.name),
            description: params.description,
          },
          async (url: any, variables: any, extra: any) => {
            try {
              return await cb(url, variables, extra);
            } catch (e) {
              Bugsnag.notify(
                e as unknown as Error,
                (event: {
                  addMetadata: (
                    arg0: string,
                    arg1: { resource: string; url: any },
                  ) => void;
                  unhandled: boolean;
                }) => {
                  event.addMetadata("app", {
                    resource: this.getToolName(client, params.name),
                    url: url,
                  });
                  event.unhandled = true;
                },
              );
              throw e;
            }
          },
        );
      });
    }

    if (client.registerPrompts) {
      client.registerPrompts((params, cb) => {
        return super.registerPrompt(
          this.getToolName(client, params.title),
          {
            title: this.getToolTitle(client, params.title),
            description: params.description,
            argsSchema: this.schemaToRawShape(params.argsSchema) || {},
          },
          (args: any, extra: any) => cb(args, extra),
        );
      });
    }
  }

  private getToolTitle(client: Client, title: string): string {
    return `${client.name}: ${title}`;
  }

  private getToolName(client: Client, title: string): string {
    return `${client.toolPrefix}_${title.replace(/\s+/g, "_").toLowerCase()}`;
  }

  private validateCallbackResult(result: CallToolResult, params: ToolParams) {
    if (result.isError) {
      return;
    }
    if (params.outputSchema && !result.structuredContent) {
      throw new Error(
        `The result of the tool '${params.title}' must include 'structuredContent'`,
      );
    }
  }

  private addStructuredContentAsText(result: CallToolResult) {
    if (result.structuredContent && !result.content?.length) {
      result.content = [
        {
          type: "text",
          text: JSON.stringify(result.structuredContent),
        },
      ];
    }
  }

  private getAnnotations(
    toolTitle: string,
    params: ToolParams,
  ): ToolAnnotations {
    const annotations = {
      title: toolTitle,
      readOnlyHint: params.readOnly ?? true,
      destructiveHint: params.destructive ?? false,
      idempotentHint: params.idempotent ?? true,
      openWorldHint: params.openWorld ?? false,
    };
    return annotations;
  }

  private schemaToRawShape(
    schema: ZodType | undefined,
  ): ZodRawShape | undefined {
    if (schema) {
      if (schema instanceof ZodObject) {
        return schema.shape;
      }
      if (schema instanceof ZodIntersection) {
        const leftShape = this.schemaToRawShape(
          (schema as ZodIntersection<ZodType, ZodType>).def.left,
        );
        const rightShape = this.schemaToRawShape(
          (schema as ZodIntersection<ZodType, ZodType>).def.right,
        );
        return { ...leftShape, ...rightShape };
      }
    }
    return undefined;
  }

  private getDescription(params: ToolParams): string {
    const {
      summary,
      useCases,
      examples,
      inputSchema,
      hints,
      outputDescription,
    } = params;

    let description = summary;

    if (inputSchema && inputSchema instanceof ZodObject) {
      let parameters = Object.keys(inputSchema.shape)
        .map((key) => {
          const field = inputSchema.shape[key];
          const description = getTypeDescription(field);
          const defaultValue = getDefaultValue(field);
          return (
            `- ${key} (${getReadableTypeName(field)})` +
            `${isOptionalType(field) ? "" : " *required*"}` +
            `${description ? `: ${description}` : ""}` +
            `${defaultValue !== null ? ` (default: ${JSON.stringify(defaultValue)})` : ""}`
          );
        })
        .join("\n");
      if (parameters.length === 0) {
        parameters = "None";
      }
      description += `\n\n**Parameters:**\n${parameters}`;
    }

    if (outputDescription) {
      description += `\n\n**Output Description:** ${outputDescription}`;
    }

    // Use Cases
    if (useCases && useCases.length > 0) {
      description += `\n\n**Use Cases:** ${useCases.map((uc, i) => `${i + 1}. ${uc}`).join(" ")}`;
    }

    // Examples
    if (examples && examples.length > 0) {
      description +=
        `\n\n**Examples:**\n` +
        examples
          .map(
            (ex, idx) =>
              `${idx + 1}. ${ex.description}\n\`\`\`json\n${JSON.stringify(ex.parameters, null, 2)}\n\`\`\`${ex.expectedOutput ? `\nExpected Output: ${ex.expectedOutput}` : ""}`,
          )
          .join("\n\n");
    }

    // Hints
    if (hints && hints.length > 0) {
      description += `\n\n**Hints:** ${hints.map((hint, i) => `${i + 1}. ${hint}`).join(" ")}`;
    }

    return description.trim();
  }
}
