import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  type CallToolResult,
  ListToolsRequestSchema,
  type ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import {
  ZodDiscriminatedUnion,
  ZodIntersection,
  ZodObject,
  type ZodRawShape,
  type ZodType,
  ZodUnion,
  z,
} from "zod";
import Bugsnag, { type BugsnagEvent } from "../common/bugsnag";
import { CacheService } from "./cache";
import { type McpClientIdentity, toClientIdentity } from "./client-identity";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./info";
import {
  executeElicitationOrPolyfill,
  isElicitationPolyfillResult,
} from "./pollyfills";
import { ToolError } from "./tools";
import type { Client, ClientInfo, ToolParams } from "./types";
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
  private clientInfo?: ClientInfo;
  private clients: Client[] = [];
  private enabledToolsets?: string[];
  private mcpClientIdentity?: McpClientIdentity;
  private listToolsDialectPatched = false;

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

  setClientInfo(info: ClientInfo): void {
    this.clientInfo = info;
  }

  getClientInfo(): ClientInfo | undefined {
    return this.clientInfo;
  }

  getClients(): Client[] {
    return this.clients;
  }

  /**
   * Record the MCP client identity reported in the `initialize` handshake.
   * Captured once per session by the transport layer.
   */
  setMcpClientIdentity(identity: McpClientIdentity): void {
    this.mcpClientIdentity = identity;
  }

  /**
   * Return the MCP client identity for this session. Prefers the value captured
   * at `initialize`; falls back to the SDK's `getClientVersion()` so callers
   * still get an answer if the explicit capture was skipped.
   */
  getMcpClientIdentity(): McpClientIdentity {
    return (
      this.mcpClientIdentity ?? toClientIdentity(this.server.getClientVersion())
    );
  }

  /**
   * Attach MCP client attribution to a Bugsnag event so errors can be segmented
   * by originating client/marketplace.
   */
  private addClientMetadata(event: BugsnagEvent): void {
    const identity = this.getMcpClientIdentity();
    event.addMetadata("mcpClient", {
      mcp_client_name: identity.name ?? null,
      mcp_client_version: identity.version ?? null,
      mcp_protocol_version: identity.protocolVersion ?? null,
    });
  }

  async cleanupSession(mcpSessionId: string): Promise<void> {
    for (const client of this.clients) {
      await client.cleanupSession?.(mcpSessionId);
    }
  }

  // The SDK's tools/list handler always declares "$schema": draft-07 for tool input/output schemas
  // built from Zod (see `toJsonSchemaCompat` in @modelcontextprotocol/sdk/server/zod-json-schema-compat.js,
  // which hardcodes `target: 'draft-7'` whenever no override is supplied — and McpServer's built-in
  // tools/list handler never supplies one). Claude Desktop's client-side schema validator only accepts
  // the 2020-12 dialect and rejects any tool whose schema declares a different one, so we rewrite the
  // dialect on the way out rather than upstream in the SDK. Reaches into `Server`'s internal request
  // handler map (not part of its public API) since there's no supported hook for this.
  private patchListToolsDialect(): void {
    if (this.listToolsDialectPatched) return;
    const internalServer = this.server as any;
    const originalHandler = internalServer._requestHandlers?.get("tools/list");
    if (!originalHandler) return;

    this.listToolsDialectPatched = true;
    const DIALECT_2020_12 = "https://json-schema.org/draft/2020-12/schema";
    const fixDialect = (schema: unknown) => {
      if (schema && typeof schema === "object" && "$schema" in schema) {
        (schema as Record<string, unknown>).$schema = DIALECT_2020_12;
      }
    };

    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async (request, extra) => {
        const result = await originalHandler(request, extra);
        for (const tool of result.tools ?? []) {
          fixDialect(tool.inputSchema);
          fixDialect(tool.outputSchema);
        }
        return result;
      },
    );
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
            // Pass ZodObject-based schemas through as-is (rather than via schemaToRawShape)
            // so that z.looseObject()'s additionalProperties:true is preserved in the JSON
            // schema sent to clients — extracting `.shape` would rebuild a strict object and
            // cause "additional properties" validation errors on real API responses.
            outputSchema:
              params.outputSchema instanceof ZodObject
                ? params.outputSchema
                : this.schemaToRawShape(params.outputSchema),
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
                  this.addClientMetadata(event);
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
    this.patchListToolsDialect();

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
                this.addClientMetadata(event);
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
                this.addClientMetadata(event);
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
      // The MCP tool `inputSchema`/`outputSchema` config must reduce to a single flat
      // object shape — a top-level `oneOf` isn't representable there. So for a union of
      // object schemas (e.g. `z.discriminatedUnion`), flatten its branches into one shape:
      // each key becomes the union of that key's type across branches, and is made
      // optional if it isn't present in every branch. This is looser than the original
      // per-branch validation, but far better than the schema silently becoming `{}`.
      if (
        schema instanceof ZodUnion ||
        schema instanceof ZodDiscriminatedUnion
      ) {
        const options = (schema as ZodUnion<ZodType[]>).options;
        const shapes = options.map(
          (option) => this.schemaToRawShape(option) ?? {},
        );
        const keys = new Set<string>();
        for (const shape of shapes) {
          for (const key of Object.keys(shape)) {
            keys.add(key);
          }
        }
        const merged: Record<string, ZodType> = {};
        for (const key of keys) {
          const variants = shapes
            .map((shape) => shape[key])
            .filter((variant): variant is ZodType => variant !== undefined);
          const presentInEveryBranch = variants.length === shapes.length;
          let fieldSchema =
            variants.length === 1
              ? variants[0]
              : z.union(variants as [ZodType, ZodType, ...ZodType[]]);
          if (!presentInEveryBranch && !fieldSchema.isOptional()) {
            fieldSchema = fieldSchema.optional();
          }
          merged[key] = fieldSchema;
        }
        return merged;
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
