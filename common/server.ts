import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ToolAnnotations } from "@modelcontextprotocol/sdk/types.js";
import { ZodAny, ZodArray, ZodBoolean, ZodEnum, ZodLiteral, ZodNumber, ZodObject, ZodRawShape, ZodString, ZodType, ZodUnion, } from "zod";
import Bugsnag from "../common/bugsnag.js";

import { Client, ToolParams } from "./types.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./info.js";

export class SmartBearMcpServer extends McpServer {
    constructor() {
        super(
            {
                name: MCP_SERVER_NAME,
                version: MCP_SERVER_VERSION,
            },
            {
                capabilities: {
                    resources: { listChanged: true },   // Server supports dynamic resource lists
                    tools: { listChanged: true },       // Server supports dynamic tool lists
                },
            },
        );
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
                        annotations: this.getAnnotations(toolTitle, params),
                    },
                    async (args: any, extra: any) => {
                        try {
                            return await cb(args, extra);
                        } catch (e) {
                            Bugsnag.notify(e as unknown as Error);
                            throw e;
                        }
                    });
            },
            (params, options) => {
                return this.server.elicitInput(params, options);
            }
        );
        if (client.registerResources) {
            client.registerResources((name, path, cb) => {
                return super.registerResource(
                    name,
                    new ResourceTemplate(`${client.prefix}://${name}/${path}`, { list: undefined }),
                    {},
                    async (url: any, variables: any, extra: any) => {
                        try {
                            return await cb(url, variables, extra);
                        } catch (e) {
                            Bugsnag.notify(e as unknown as Error);
                            throw e;
                        }
                    });
            });
        }
    }
    
    private getAnnotations(toolTitle: string, params: ToolParams): any {
        const annotations: ToolAnnotations = {
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

        if (params.zodSchema && params.zodSchema instanceof ZodObject) {
            for (const key of Object.keys(params.zodSchema.shape)) {
                const field = params.zodSchema.shape[key];
                args[key] = field;
                if (field.description) {
                    args[key] = args[key].describe(field.description);
                }

                if (field.isOptional()) {
                    args[key] = args[key].optional();
                }
            }
        }

        return args;
    }

    private getDescription(params: ToolParams): string {
        const {
            summary,
            useCases,
            examples,
            parameters,
            zodSchema,
            hints,
            outputFormat
        } = params;

        let description = summary;

        // Parameters if available otherwise use zodSchema
        if ((parameters ?? []).length > 0) {
            description += `\n\n**Parameters:**\n${parameters?.map(p =>
                `- ${p.name} (${this.getReadableTypeName(p.type)})${p.required ? ' *required*' : ''}` +
                `${p.description ? `: ${p.description}` : ''}` +
                `${p.examples ? ` (e.g. ${p.examples.join(', ')})` : ''}` +
                `${p.constraints ? `\n  - ${p.constraints.join('\n  - ')}` : ''}`
            ).join('\n')}`;
        }
        
        if (zodSchema && zodSchema instanceof ZodObject) {
            description += "\n\n**Parameters:**\n";
            for (const key of Object.keys(zodSchema.shape)) {
                const field = zodSchema.shape[key];
                description += `- ${key} (${this.getReadableTypeName(field)})${field.isOptional() ? '' : ' *required*'}${field.description ? `: ${field.description}` : ''}${key === "examples" ? ` (e.g. ${Object.keys(field.enum).join(', ')})` : ''}${key === "constraints" ? `\n  - ${Object.keys(field.enum).join('\n  - ')}` : ''} \n`;
            }
        }

        if (outputFormat) {
            description += `\n\n**Output Format:** ${outputFormat}`;
        }

        // Use Cases
        if (useCases && useCases.length > 0) {
            description += `\n\n**Use Cases:** ${useCases.map((uc, i) => `${i + 1}. ${uc}`).join(' ')}`;
        }

        // Examples
        if (examples && examples.length > 0) {
            description += `\n\n**Examples:**\n` + examples.map((ex, idx) =>
                `${idx + 1}. ${ex.description}\n\`\`\`json\n${JSON.stringify(ex.parameters, null, 2)}\n\`\`\`${ex.expectedOutput ? `\nExpected Output: ${ex.expectedOutput}` : ''}`
            ).join('\n\n');
        }

        // Hints
        if (hints && hints.length > 0) {
            description += `\n\n**Hints:** ${hints.map((hint, i) => `${i + 1}. ${hint}`).join(' ')}`;
        }

        return description.trim();
    }

    private getReadableTypeName(zodType: ZodType): string {
        if (zodType instanceof ZodString) return 'string';
        if (zodType instanceof ZodNumber) return 'number';
        if (zodType instanceof ZodBoolean) return 'boolean';
        if (zodType instanceof ZodArray) return 'array';
        if (zodType instanceof ZodObject) return 'object';
        if (zodType instanceof ZodEnum) return 'enum';
        if (zodType instanceof ZodLiteral) return 'literal';
        if (zodType instanceof ZodUnion) return 'union';
        if (zodType instanceof ZodAny) return 'any';
        return 'any';
    }
}