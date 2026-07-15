// This is the core, single-class server implementation extending McpServer;
// its private helper methods are already extracted as far as reasonably
// possible while keeping cohesive access to `this`. Splitting further into
// separate files would fragment a tightly-coupled class across modules with
// little readability benefit, for a rule whose only concern is line count.
// biome-ignore-all lint/style/noExcessiveLinesPerFile: see above
import type {
  PromptCallback,
  ReadResourceTemplateCallback,
  RegisteredPrompt,
  RegisteredResourceTemplate,
  RegisteredTool,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  McpServer,
  ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  RequestHandlerExtra,
  RequestOptions,
} from "@modelcontextprotocol/sdk/shared/protocol.js";
import type { Variables } from "@modelcontextprotocol/sdk/shared/uriTemplate.js";
import type {
  CallToolResult,
  ElicitRequest,
  ElicitResult,
  ServerNotification,
  ServerRequest,
  ToolAnnotations,
} from "@modelcontextprotocol/sdk/types.js";
import {
  ZodIntersection,
  ZodObject,
  type ZodRawShape,
  type ZodType,
} from "zod";
import Bugsnag, { type BugsnagEvent } from "../common/bugsnag.ts";
import { CacheService } from "./cache.ts";
import { type McpClientIdentity, toClientIdentity } from "./client-identity.ts";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./info.ts";
import {
  executeElicitationOrPolyfill,
  isElicitationPolyfillResult,
} from "./pollyfills.ts";
import { ToolError } from "./tools.ts";
import type {
  Client,
  ClientInfo,
  PromptParams,
  ResourceParams,
  ToolParams,
} from "./types.ts";
import {
  getDefaultValue,
  getReadableTypeName,
  getTypeDescription,
  isOptionalType,
} from "./zod-utils.ts";

// Tool names must be 64 characters or fewer for client compatibility.
// https://github.com/anthropics/claude-code/issues/34960
const MAX_TOOL_NAME_LENGTH = 64;

export class SmartBearMcpServer extends McpServer {
  private readonly cache: CacheService;
  private samplingSupported = false;
  private elicitationSupported = false;
  private clientInfo?: ClientInfo;
  private readonly clients: Client[] = [];
  private readonly enabledToolsets?: string[];
  private mcpClientIdentity?: McpClientIdentity;

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
    // Per-client cleanup is independent, so these can run concurrently.
    await Promise.all(
      this.clients.map((client) => client.cleanupSession?.(mcpSessionId)),
    );
  }

  async addClient(client: Client): Promise<void> {
    this.clients.push(client);
    await client.registerTools(
      (params, cb) => this.registerClientTool(client, params, cb),
      (params, options) => this.getInputOrPolyfill(params, options),
    );

    if (client.registerResources) {
      await client.registerResources((params, cb) =>
        this.registerClientResource(client, params, cb),
      );
    }

    if (client.registerPrompts) {
      await client.registerPrompts((params, cb) =>
        this.registerClientPrompt(client, params, cb),
      );
    }
  }

  /**
   * Elicitation `getInput` implementation passed to each client's
   * `registerTools`, falling back to a polyfill instruction when the host
   * doesn't support elicitation.
   */
  private async getInputOrPolyfill(
    params: ElicitRequest["params"],
    options?: RequestOptions,
  ): Promise<ElicitResult> {
    const result = await executeElicitationOrPolyfill(this, params, options);

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
  }

  private registerClientTool(
    client: Client,
    params: ToolParams,
    cb: ToolCallback<ZodRawShape>,
  ): RegisteredTool | null {
    if (!this.isToolEnabled(client, params.toolset)) {
      return null;
    }
    const toolName = this.getCapabilityName(client, params.title);
    const toolTitle = this.getCapabilityTitle(client, params.title);
    if (toolName.length > MAX_TOOL_NAME_LENGTH) {
      throw new ToolError(
        `The tool name "${toolName}" is too long. Tool names must be ${MAX_TOOL_NAME_LENGTH} characters or fewer for client compatibility. https://github.com/anthropics/claude-code/issues/34960`,
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
      (
        args: Record<string, unknown>,
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
      ) =>
        this.handleToolCall(
          { client, params, cb, toolName, toolTitle },
          args,
          extra,
        ),
    );
  }

  private async handleToolCall(
    context: {
      client: Client;
      params: ToolParams;
      cb: ToolCallback<ZodRawShape>;
      toolName: string;
      toolTitle: string;
    },
    args: Record<string, unknown>,
    extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
  ): Promise<CallToolResult> {
    const { client, params, cb, toolName, toolTitle } = context;
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
      }
      Bugsnag.notify(e as unknown as Error, (event: BugsnagEvent) => {
        event.addMetadata("app", { tool: toolName });
        this.addClientMetadata(event);
        event.unhandled = true;
      });
      throw e;
    }
  }

  private registerClientResource(
    client: Client,
    params: ResourceParams,
    cb: ReadResourceTemplateCallback,
  ): RegisteredResourceTemplate {
    const resourceName = this.getCapabilityName(client, params.title);
    const slug = params.title.replace(/\s+/g, "_").toLowerCase();
    const urlTemplate = `${client.capabilityPrefix}://${slug}/${params.path}`;
    return super.registerResource(
      resourceName,
      new ResourceTemplate(urlTemplate, {
        list: undefined,
      }),
      {
        title: this.getCapabilityTitle(client, params.title),
        description: params.description,
      },
      async (
        url: URL,
        variables: Variables,
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
      ) => {
        try {
          return await cb(url, variables, extra);
        } catch (e) {
          Bugsnag.notify(e as unknown as Error, (event: BugsnagEvent) => {
            event.addMetadata("app", {
              resource: resourceName,
              url,
            });
            this.addClientMetadata(event);
            event.unhandled = true;
          });
          throw e;
        }
      },
    );
  }

  private registerClientPrompt(
    client: Client,
    params: PromptParams,
    cb: PromptCallback<ZodRawShape>,
  ): RegisteredPrompt {
    return super.registerPrompt(
      this.getCapabilityName(client, params.title),
      {
        title: this.getCapabilityTitle(client, params.title),
        description: params.description,
        argsSchema: this.schemaToRawShape(params.argsSchema) || {},
      },
      async (
        args: Record<string, unknown>,
        extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
      ) => {
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
    if (result.structuredContent && (result.content?.length ?? 0) === 0) {
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
      (client.defaultToolsets || []).includes(toolset)
    );
  }

  /**
   * Format the `**Parameters:**` section listing each field of an input schema.
   */
  private formatParametersSection(inputSchema: ZodType | undefined): string {
    if (!(inputSchema && inputSchema instanceof ZodObject)) {
      return "";
    }
    let parameters = Object.keys(inputSchema.shape)
      .map((key) => {
        const field = inputSchema.shape[key];
        const fieldDescription = getTypeDescription(field);
        const defaultValue = getDefaultValue(field);
        return (
          `- ${key} (${getReadableTypeName(field)})` +
          `${isOptionalType(field) ? "" : " *required*"}` +
          `${fieldDescription ? `: ${fieldDescription}` : ""}` +
          `${defaultValue === null ? "" : ` (default: ${JSON.stringify(defaultValue)})`}`
        );
      })
      .join("\n");
    if (parameters.length === 0) {
      parameters = "None";
    }
    return `\n\n**Parameters:**\n${parameters}`;
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

    description += this.formatParametersSection(inputSchema);

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
        "\n\n**Examples:**\n" +
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
