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
  ZodEnum,
  ZodLiteral,
  ZodNumber,
  ZodObject,
  ZodOptional,
  type ZodRawShape,
  ZodString,
  type ZodType,
  type ZodTypeAny,
  ZodUnion,
} from "zod";
import Bugsnag from "../common/bugsnag.js";
import { CacheService } from "./cache.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./info.js";
import { type Client, ToolError, type ToolParams } from "./types.js";

export class SmartBearMcpServer extends McpServer {
  private cache: CacheService;

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
          sampling: {}, // Server supports sampling requests to Host
          elicitation: {}, // Server supports eliciting input from the user
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

  addClient(client: Client): void {
    client.registerTools(
      (params, cb) => {
        const toolName = `${client.prefix}_${params.title.replace(/\s+/g, "_").toLowerCase()}`;
        const toolTitle = `${client.name}: ${params.title}`;
        return super.registerTool(
          toolName,
          {
            title: toolTitle,
            description: this.getDescription(params),
            inputSchema: this.getInputSchema(params),
            outputSchema: this.getOutputSchema(params),
            annotations: this.getAnnotations(toolTitle, params),
          },
          async (args: any, extra: any) => {
            try {
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
                      type: "text",
                      text: `Error executing ${toolTitle}: ${e.message}`,
                    },
                  ],
                };
              } else {
                Bugsnag.notify(e as unknown as Error, (event) => {
                  event.addMetadata("app", { tool: toolName });
                  event.unhandled = true;
                });
              }
              throw e;
            }
          },
        );
      },
      (params, options) => {
        return this.server.elicitInput(params, options);
      },
    );

    if (client.registerResources) {
      client.registerResources((name, path, cb) => {
        const url = `${client.prefix}://${name}/${path}`;
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
              Bugsnag.notify(e as unknown as Error, (event) => {
                event.addMetadata("app", { resource: name, url: url });
                event.unhandled = true;
              });
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
    const args: ZodRawShape = {};
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
    schema: ZodTypeAny | undefined,
  ): ZodRawShape | undefined {
    if (schema && schema instanceof ZodObject) {
      return schema.shape;
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

  private formatParameterDescription(key: string, field: any) {
    return (
      `- ${key} (${this.getReadableTypeName(field)})` +
      `${field.isOptional() ? "" : " *required*"}` +
      `${field.description ? `: ${field.description}` : ""}` +
      `${key === "examples" && field instanceof ZodEnum ? ` (e.g. ${Object.keys(field.enum).join(", ")})` : ""}` +
      `${key === "constraints" && field instanceof ZodEnum ? `\n  - ${Object.keys(field.enum).join("\n  - ")}` : ""}`
    );
  }

  private getReadableTypeName(zodType: ZodType): string {
    if (zodType instanceof ZodOptional) {
      zodType = zodType._def.innerType;
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
