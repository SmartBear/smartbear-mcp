import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  CallToolResult,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import {
  ZodAny,
  ZodArray,
  ZodBoolean,
  ZodDefault,
  ZodEnum,
  ZodIntersection,
  ZodLiteral,
  ZodNumber,
  ZodObject,
  ZodOptional,
  type ZodRawShape,
  ZodRecord,
  ZodString,
  type ZodType,
  ZodUnion,
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
import { unwrapZodType } from "./zod-utils";

export class SmartBearMcpServer extends McpServer {
  private cache: CacheService;
  private samplingSupported = false;
  private elicitationSupported = false;

  constructor() {
    super(
      {
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION,
      },
      {
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

  async addClient(client: Client): Promise<void> {
    await client.registerTools(
      (params, cb) => {
        const toolName = `${client.toolPrefix}_${params.title.replace(/\s+/g, "_").toLowerCase()}`;
        const toolTitle = `${client.name}: ${params.title}`;
        return super.registerTool(
          toolName,
          {
            title: toolTitle,
            description: this.getDescription(params),
            inputSchema: this.getInputSchema(params),
            outputSchema: this.getOutputSchema(params),
            annotations: this.getAnnotations(toolTitle, params),
            ...(params._meta && { _meta: params._meta }),
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
      client.registerResources((name, path, cb) => {
        const url = typeof path === 'string' ? `${client.toolPrefix}://${name}/${path}` : path.uri;
        return super.registerResource(
          name,
          new ResourceTemplate(url, {
            list: undefined,
          }),
          {},
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
                  event.addMetadata("app", { resource: name, url: url });
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
      client.registerPrompts((name, config, cb) => {
        return super.registerPrompt(name, config, cb);
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

  private getInputSchema(params: ToolParams): any {
    const args: Record<string, ZodType> = {};
    for (const param of params.parameters ?? []) {
      args[param.name] = param.type;
      if (param.description) {
        args[param.name] = args[param.name].describe(param.description);
      }
      if (!param.required) {
        args[param.name] = args[param.name].optional();
      }
    }

    return { ...args, ...this.schemaToRawShape(params.inputSchema) };
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

  private getOutputSchema(params: ToolParams): any {
    return this.schemaToRawShape(params.outputSchema);
  }

  private getDescription(params: ToolParams): string {
    const {
      summary,
      useCases,
      examples,
      parameters,
      inputSchema,
      hints,
      outputDescription,
    } = params;

    let description = summary;

    // Parameters if available otherwise use inputSchema
    if ((parameters ?? []).length > 0) {
      description += `\n\n**Parameters:**\n${parameters
        ?.map(
          (p) =>
            `- ${p.name} (${this.getReadableTypeName(p.type)})${p.required ? " *required*" : ""}` +
            `${p.description ? `: ${p.description}` : ""}` +
            `${p.examples ? ` (e.g. ${p.examples.join(", ")})` : ""}` +
            `${p.constraints ? `\n  - ${p.constraints.join("\n  - ")}` : ""}`,
        )
        .join("\n")}`;
    }

    if (inputSchema && inputSchema instanceof ZodObject) {
      description += "\n\n**Parameters:**\n";
      description += Object.keys(inputSchema.shape)
        .map((key) =>
          this.formatParameterDescription(key, inputSchema.shape[key]),
        )
        .join("\n");
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

  private formatParameterDescription(
    key: string,
    field: ZodType,
    description: string | null = null,
    isOptional = false,
    defaultValue: string | null = null,
  ): string {
    description = description ?? (field.description || null);
    if (field instanceof ZodOptional) {
      field = (field as ZodOptional<ZodType>).unwrap();
      return this.formatParameterDescription(
        key,
        field,
        description,
        true,
        defaultValue,
      );
    }
    if (field instanceof ZodDefault) {
      defaultValue = JSON.stringify(
        (field as ZodDefault<ZodType>).def.defaultValue,
      );
      field = (field as ZodDefault<ZodType>).unwrap();
      return this.formatParameterDescription(
        key,
        field,
        description,
        true,
        defaultValue,
      );
    }
    return (
      `- ${key} (${this.getReadableTypeName(field)})` +
      `${isOptional ? "" : " *required*"}` +
      `${description ? `: ${description}` : ""}` +
      `${defaultValue ? ` (default: ${defaultValue})` : ""}`
    );
  }

  private getReadableTypeName(zodType: ZodType): string {
    zodType = unwrapZodType(zodType);
    if (zodType instanceof ZodRecord) {
      const record = zodType as ZodRecord;
      return `record<${this.getReadableTypeName(record.def.keyType as ZodType)}, ${this.getReadableTypeName(record.def.valueType as ZodType)}>`;
    }
    if (zodType instanceof ZodString) return "string";
    if (zodType instanceof ZodNumber) return "number";
    if (zodType instanceof ZodBoolean) return "boolean";
    if (zodType instanceof ZodArray) return "array";
    if (zodType instanceof ZodObject) return "object";
    if (zodType instanceof ZodEnum) return "enum";
    if (zodType instanceof ZodLiteral) return "literal";
    if (zodType instanceof ZodUnion) return "union";
    if (zodType instanceof ZodAny) return "any";
    return "any";
  }
}
