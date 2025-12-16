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
  type ZodTypeAny,
  ZodUnion,
} from "zod";
import Bugsnag, { getTracer } from "../common/bugsnag.js";
import { CacheService } from "./cache.js";
import { getServerName, getServerVersion } from "./config.js";
import { ToolError } from "./tools.js";
import type { Client, ToolParams } from "./types.js";

export class SmartBearMcpServer extends McpServer {
  private cache: CacheService;

  constructor() {
    super(
      {
        name: getServerName(),
        version: getServerVersion(),
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
    const executeWithInstrumentation = async (name: string, tool: any) => {
      return await getTracer().startActiveSpan(name, async (span) => {
        span.setAttribute("bugsnag.span.first_class", true);
        span.setAttribute("mcp.client", client.name);
        span.setAttribute("mcp.tool", name);
        span.setAttribute(
          "mcp.organization",
          client.getUserId?.() || "unknown",
        );
        try {
          if (!client.isConfigured()) {
            throw new ToolError(
              `The tool is not configured - configuration options for ${client.name} are missing or invalid.`,
            );
          }
          return await tool();
        } catch (e) {
          span.recordException(e as Error);
          // ToolErrors are expected errors from tool execution - return these to the user
          // Otherwise report to Bugsnag as unhandled exceptions
          if (e instanceof ToolError) {
            return {
              isError: true,
              content: [
                {
                  type: "text" as const,
                  text: `Error executing ${name}: ${e.message}`,
                },
              ],
            };
          } else {
            Bugsnag.notify(e as unknown as Error, (event) => {
              event.addMetadata("app", {
                tool: name,
                client: client.name,
              });
              event.unhandled = true;
              event.setUser(client.getUserId?.() || undefined);
            });
            throw e;
          }
        } finally {
          span.end();
        }
      });
    };

    client.registerTools(
      (params, cb) => {
        const toolName = this.getToolName(client, params.title);
        return super.registerTool(
          toolName,
          {
            title: `${client.name}: ${params.title}`,
            description: this.getToolDescription(params),
            inputSchema: this.getInputSchema(params),
            outputSchema: this.getOutputSchema(params),
            annotations: this.getAnnotations(client, params),
          },
          async (args: any, extra: any) => {
            return await executeWithInstrumentation(toolName, async () => {
              const result = await cb(args, extra);
              this.validateCallbackResult(result, params);
              this.addStructuredContentAsText(result);
              return result;
            });
          },
        );
      },
      (params, options) => {
        return this.server.elicitInput(params, options);
      },
    );

    if (client.registerResources) {
      client.registerResources((name, path, cb) => {
        const templateUrl = `${client.toolPrefix}://${name}/${path}`;
        return super.registerResource(
          this.getToolName(client, name),
          new ResourceTemplate(templateUrl, { list: undefined }),
          {
            title: name,
          },
          async (url: any, variables: any, extra: any) => {
            return await executeWithInstrumentation(
              this.getToolName(client, name),
              async () => {
                return await cb(url, variables, extra);
              },
            );
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

  private getAnnotations(client: Client, params: ToolParams): ToolAnnotations {
    const annotations = {
      title: `${client.name}: ${params.title}`,
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
    if (schema) {
      if (schema instanceof ZodObject) {
        return schema.shape;
      }
      if (schema instanceof ZodIntersection) {
        const leftShape = this.schemaToRawShape(schema._def.left);
        const rightShape = this.schemaToRawShape(schema._def.right);
        return { ...leftShape, ...rightShape };
      }
    }
    return undefined;
  }

  private getOutputSchema(params: ToolParams): any {
    return this.schemaToRawShape(params.outputSchema);
  }

  private getToolName(client: Client, name: string): string {
    return `${client.toolPrefix}_${name.replace(/\s+/g, "_").toLowerCase()}`;
  }

  private getToolDescription(params: ToolParams): string {
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
      field = (field as ZodOptional<ZodTypeAny>).unwrap();
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
        (field as ZodDefault<ZodTypeAny>)._def.defaultValue(),
      );
      field = (field as ZodDefault<ZodTypeAny>).removeDefault();
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
    if (zodType instanceof ZodOptional) {
      return this.getReadableTypeName(
        (zodType as ZodOptional<ZodTypeAny>).unwrap(),
      );
    }
    if (zodType instanceof ZodDefault) {
      return this.getReadableTypeName(
        (zodType as ZodDefault<ZodTypeAny>).removeDefault(),
      );
    }
    if (zodType instanceof ZodRecord) {
      return `record<${this.getReadableTypeName((zodType as ZodRecord).keySchema)}, ${this.getReadableTypeName((zodType as ZodRecord).valueSchema)}>`;
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
