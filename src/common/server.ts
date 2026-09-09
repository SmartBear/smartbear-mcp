import type {
  CacheHint,
  CallToolResult,
  ToolAnnotations,
} from "@modelcontextprotocol/server";
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import { ZodObject, z } from "zod";
import Bugsnag, { type BugsnagEvent } from "../common/bugsnag";
import {
  CacheService,
  getConfiguredCacheTtlSeconds,
  isCachingEnabled,
} from "./cache";
import {
  getCurrentClientIdentity,
  type McpClientIdentity,
  toClientIdentity,
} from "./client-identity";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "./info";
import {
  executeElicitationOrPolyfill,
  InputRequiredSignal,
  isElicitationPolyfillResult,
  runWithElicitationScope,
} from "./pollyfills";
import {
  getRequestClientMeta,
  getRequestEra,
  type ProtocolEra,
} from "./request-context";
import { ToolError } from "./tools";
import type { Client, ClientInfo, ToolParams } from "./types";
import {
  getDefaultValue,
  getReadableTypeName,
  getTypeDescription,
  isOptionalType,
} from "./zod-utils";

/**
 * Cache hints for the cacheable modern-era (2026-07-28) result envelopes.
 * `ttlMs` follows the operator's CACHE_TTL (the same lifetime the in-process
 * {@link CacheService} uses); `cacheScope: "private"` because every listing is
 * derived from the caller's own configuration (auth headers, enabled
 * toolsets), so a shared cache must never serve one principal's results to
 * another.
 */
function buildCacheHints(): Partial<
  Record<
    | "tools/list"
    | "prompts/list"
    | "resources/list"
    | "resources/templates/list"
    | "resources/read",
    CacheHint
  >
> {
  const hint: CacheHint = {
    ttlMs: getConfiguredCacheTtlSeconds() * 1000,
    cacheScope: "private",
  };
  return {
    "tools/list": hint,
    "prompts/list": hint,
    "resources/list": hint,
    "resources/templates/list": hint,
    "resources/read": hint,
  };
}

export class SmartBearMcpServer extends McpServer {
  private cache: CacheService;
  private elicitationSupported = false;
  private clientInfo?: ClientInfo;
  private clients: Client[] = [];
  private enabledToolsets?: string[];
  private mcpClientIdentity?: McpClientIdentity;

  constructor(enabledToolsets?: string, era: ProtocolEra = "legacy") {
    super(
      {
        name: MCP_SERVER_NAME,
        version: MCP_SERVER_VERSION,
      },
      {
        capabilities:
          era === "modern"
            ? {
                // resources and prompts are supported by some but not all clients.
                // No `logging`: deprecated by SEP-2577 as of 2026-07-28 (our
                // diagnostics already go to stderr). `listChanged` stays
                // advertised: on the modern era it tells clients which
                // notification types a `subscriptions/listen` filter may
                // request, and the SDK's serving entries implement
                // `subscriptions/listen` themselves — no server-side work.
                tools: { listChanged: true },
              }
            : {
                // Legacy (2025-era) capabilities, unchanged for the
                // deprecation window.
                tools: { listChanged: true }, // Server supports dynamic tool lists
                logging: {}, // Server supports logging messages
              },
        // Cache hints stamped onto the cacheable modern-era (2026-07-28)
        // results (tools/list, prompts/list, resources/list,
        // resources/templates/list, resources/read). Lifetime follows the
        // operator's CACHE_TTL; scope is `private` because every result is
        // derived from the caller's own configuration (auth headers,
        // toolsets) and must not be served to other principals from a shared
        // cache. Legacy responses are never affected, and with caching
        // disabled the SDK default (`ttlMs: 0`) stands.
        ...(isCachingEnabled() ? { cacheHints: buildCacheHints() } : {}),
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

  setElicitationSupported(supported: boolean): void {
    this.elicitationSupported = supported;
  }

  /**
   * Whether the current caller supports server-initiated elicitation.
   *
   * Modern era: read from the capabilities this request declared in `_meta`.
   * In practice modern clients do not declare `elicitation` — the 2026-07-28
   * revision replaces server-initiated elicitation with MRTR — so this
   * resolves false and callers fall back to the polyfill until MRTR lands.
   * Legacy era: the per-connection flag captured at `initialize`.
   */
  isElicitationSupported(): boolean {
    if (getRequestEra() === "modern") {
      const capabilities = getRequestClientMeta()?.clientCapabilities;
      return !!capabilities && Object.hasOwn(capabilities, "elicitation");
    }
    return this.elicitationSupported;
  }

  setClientInfo(info: ClientInfo): void {
    this.clientInfo = info;
  }

  /**
   * Client info for the current caller: from this request's `_meta` envelope in
   * the modern era, falling back to the value captured at `initialize` for
   * legacy connections.
   */
  getClientInfo(): ClientInfo | undefined {
    return getRequestClientMeta()?.clientInfo ?? this.clientInfo;
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
   * Return the MCP client identity for the current caller.
   *
   * Resolution order: the metadata this request carried in `_meta` (modern
   * era over HTTP, per request), then the value captured at `initialize`
   * (legacy era, per connection), then the process-wide identity (which is how
   * modern-era stdio records its single client), then the SDK's
   * `getClientVersion()` so callers still get an answer if every capture was
   * skipped.
   */
  getMcpClientIdentity(): McpClientIdentity {
    const modernMeta = getRequestClientMeta();
    if (modernMeta) {
      return toClientIdentity(
        modernMeta.clientInfo,
        modernMeta.protocolVersion,
      );
    }
    return (
      this.mcpClientIdentity ??
      getCurrentClientIdentity() ??
      toClientIdentity(this.server.getClientVersion())
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
        // In SDK v2, registerTool accepts Standard Schema objects directly.
        // Passing the Zod schemas through as-is (rather than extracting a raw
        // `.shape`) preserves z.looseObject()'s additionalProperties:true in the
        // JSON schema sent to clients — otherwise real API responses would fail
        // "additional properties" validation.
        return super.registerTool(
          toolName,
          {
            title: toolTitle,
            description: this.getDescription(params),
            inputSchema: params.inputSchema ?? z.object({}),
            outputSchema: params.outputSchema,
            annotations: this.getAnnotations(toolTitle, params),
          },
          async (args: any, ctx: any) => {
            try {
              if (!client.isConfigured()) {
                throw new ToolError(
                  `The tool is not configured - configuration options for ${client.name} are missing or invalid.`,
                );
              }
              // Elicitation state (era, MRTR answers) is per invocation, but
              // the getInput callback handed to clients is per registration —
              // the scope bridges the two.
              const result = await runWithElicitationScope(ctx, () =>
                cb(args, ctx),
              );
              if (result) {
                this.validateCallbackResult(result, params);
                this.addStructuredContentAsText(result);
              }
              return result;
            } catch (e) {
              // MRTR (2026-07-28): the tool needs client input before it can
              // finish. Not an error — return the input_required result and
              // let the client retry with the collected input.
              if (e instanceof InputRequiredSignal) {
                return e.result;
              }
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
          async (url: any, variables: any, ctx: any) => {
            try {
              return await cb(url, variables, ctx);
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
            argsSchema: params.argsSchema,
          },
          async (args: any, ctx: any) => {
            try {
              return await cb(args, ctx);
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

    this.sortToolsDeterministically();
  }

  /**
   * Re-key the SDK's tool registry alphabetically so `tools/list` output is
   * deterministic regardless of client registration order.
   *
   * The SDK's `tools/list` handler enumerates its registry in insertion
   * order and offers no ordering hook, so this reaches into the private
   * `_registeredTools` map. `server.test.ts` asserts the resulting order, so
   * an SDK upgrade that changes the storage shape fails loudly there.
   */
  private sortToolsDeterministically(): void {
    const registry = (
      this as unknown as {
        _registeredTools: Record<string, unknown>;
      }
    )._registeredTools;
    const sorted = Object.fromEntries(
      Object.entries(registry).sort(([a], [b]) => a.localeCompare(b)),
    );
    for (const key of Object.keys(registry)) {
      delete registry[key];
    }
    Object.assign(registry, sorted);
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
