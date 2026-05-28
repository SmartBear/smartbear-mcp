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
import Bugsnag, { type BugsnagEvent } from "../common/bugsnag";
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
  private enabledToolsets?: string[];

  constructor(enabledToolsets?: string) {
    super(
      {
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION,
      },
      {
        capabilities: {
          // resources and prompts are supported by some but not all clients
          tools: { listChanged: true }, // Server supports dynamic tool lists
          logging: {}, // Server supports logging messages
        },
      },
    );
    this.cache = new CacheService();
    if (enabledToolsets) {
      this.enabledToolsets = enabledToolsets
        .split(",")
        .map((s) => s.trim().toLowerCase());
    }
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
        if (!this.isToolEnabled(client, params.toolset)) {
          return null;
        }
        const toolName = this.getCapabilityName(client, params.title);
        const toolTitle = this.getCapabilityTitle(client, params.title);
        if (toolName.length > 64) {
          throw new ToolError(
            `The tool name "${toolName}" is too long. Tool names must be 64 characters or fewer for client compatibility. https://github.com/anthropics/claude-code/issues/34960`,
          );
        }
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
                Bugsnag.notify(e as unknown as Error, (event: BugsnagEvent) => {
                  event.addMetadata("app", { tool: toolName });
                  event.unhandled = true;
                });
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
      await client.registerResources((params, cb) => {
        const resourceName = this.getCapabilityName(client, params.title);
        const slug = params.title.replace(/\s+/g, "_").toLowerCase();
        const url = `${client.capabilityPrefix}://${slug}/${params.path}`;
        return super.registerResource(
          resourceName,
          new ResourceTemplate(url, {
            list: undefined,
          }),
          {
            title: this.getCapabilityTitle(client, params.title),
            description: params.description,
          },
          async (url: any, variables: any, extra: any) => {
            try {
              return await cb(url, variables, extra);
            } catch (e) {
              Bugsnag.notify(e as unknown as Error, (event: BugsnagEvent) => {
                event.addMetadata("app", {
                  resource: resourceName,
                  url: url,
                });
                event.unhandled = true;
              });
              throw e;
            }
          },
        );
      });
    }

    if (client.registerPrompts) {
      await client.registerPrompts((params, cb) => {
        return super.registerPrompt(
          this.getCapabilityName(client, params.title),
          {
            title: this.getCapabilityTitle(client, params.title),
            description: params.description,
            argsSchema: this.schemaToRawShape(params.argsSchema) || {},
          },
          async (args: any, extra: any) => {
            try {
              return await cb(args, extra);
            } catch (e) {
              Bugsnag.notify(e as unknown as Error, (event: BugsnagEvent) => {
                event.addMetadata("app", {
                  prompt: this.getCapabilityName(client, params.title),
                });
                event.unhandled = true;
              });
              throw e;
            }
          },
        );
      });
    }
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

  private getCapabilityTitle(client: Client, title: string): string {
    return `${client.name}: ${title}`;
  }

  private getCapabilityName(client: Client, title: string): string {
    return `${client.capabilityPrefix}_${title.replace(/\s+/g, "_").toLowerCase()}`;
  }

  /**
   * The tool is enabled if:
   * - No enabled toolsets are defined on the server, or
   * - The client is included in the enabled toolsets list, or
   * - The toolset is included in the enabled toolsets list, or
   * - The toolset is in the client's default list and there is at least one specific toolset enabled for the client
   * @param client
   * @param toolset
   * @returns whether to register the tool based on enabled toolsets configuration
   */
  isToolEnabled(client: Client, toolset: string): boolean {
    if (!this.enabledToolsets) {
      return true;
    }
    const clientPrefix = client.configPrefix.toLowerCase();
    const clientIsEnabled = this.enabledToolsets.some(
      (ts) => !ts.includes(":") && ts === clientPrefix,
    );
    if (clientIsEnabled) {
      return true;
    }

    const toolsetEntries = this.enabledToolsets.filter(
      (ts) => ts.includes(":") && ts.split(":")[0] === clientPrefix,
    );
    if (toolsetEntries.length === 0) {
      return false;
    }

    const toolsetName =
      `${clientPrefix}:${toolset.replace(/[\s\-_]/g, "")}`.toLowerCase();

    return (
      toolsetEntries.includes(toolsetName) ||
      (client.defaultToolsets || [])?.includes(toolset)
    );
  }

  private getDescription(params: ToolParams): string {
    const {
      summary,
      toolset,
      useCases,
      examples,
      inputSchema,
      hints,
      outputDescription,
    } = params;

    let description = summary;

    if (toolset) {
      description += `\n\n**Toolset:** ${toolset}`;
    }

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
