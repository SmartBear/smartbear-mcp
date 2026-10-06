import type {
  ElicitRequest,
  ElicitResult,
  ReadResourceTemplateCallback,
  RegisteredPrompt,
  RegisteredResourceTemplate,
  RegisteredTool,
  RequestOptions,
} from "@modelcontextprotocol/server";
import type { ZodObject, ZodType } from "zod";
import type { PromptHandler } from "./prompts";
import type { SmartBearMcpServer } from "./server";
import type { ToolHandler } from "./tools";

export interface ToolParams {
  title: string;
  summary: string;
  toolset: string;
  inputSchema?: ZodType;
  /**
   * Specifies the type of object returned by the tool. <br>
   * When `outputSchema` is specified, make sure the tool returns `structuredContent` in its callback. <br>
   * To keep backwards compatibility, the tool's callback can still return a text `content`.
   *
   * https://modelcontextprotocol.io/specification/2025-06-18/server/tools#output-schema
   */
  outputSchema?: ZodType;
  purpose?: string;
  useCases?: string[];
  examples?: Array<{
    description: string;
    parameters: Record<string, any>;
    expectedOutput?: string;
  }>;
  hints?: string[];
  outputDescription?: string;
  readOnly?: boolean;
  destructive?: boolean;
  idempotent?: boolean;
  openWorld?: boolean;
}

export interface PromptParams {
  title: string;
  description?: string;
  argsSchema?: ZodType;
}

export interface ResourceParams {
  title: string;
  description?: string;
  path: string;
}

export type RegisterToolsFunction = (
  params: ToolParams,
  cb: ToolHandler,
) => RegisteredTool | null;

export type RegisterResourceFunction = (
  params: ResourceParams,
  cb: ReadResourceTemplateCallback,
) => RegisteredResourceTemplate;

export type RegisterPromptFunction = (
  params: PromptParams,
  cb: PromptHandler,
) => RegisteredPrompt;

export type GetInputFunction = (
  params: ElicitRequest["params"],
  options?: RequestOptions,
) => Promise<ElicitResult>;

export interface ClientInfo {
  name: string;
  version: string;
  title?: string;
}

/**
 * Usage-analytics declaration for the remote (HTTP) server. The shared
 * analytics module reads identity from the request's `Authorization` bearer
 * JWT; a product only says where its claims live. Everything is optional and
 * anything unresolvable is omitted from events, never guessed.
 */
export interface ClientAnalytics {
  /**
   * Amplitude `app_name`, one of the values registered in the shared
   * SmartBear project (Platform, Portal, Test, Explore, Design, Contract
   * Test, BugSnag). Leave unset until registered.
   */
  appName?: string;
  /**
   * Request header carrying this product's credential, for products that
   * receive it in a product-specific header (e.g. `Product-Api-Token`) rather
   * than `Authorization`. Tried before `Authorization`, which stays the
   * fallback; whichever candidate decodes as a JWT first is used. Read for
   * attribution claims only, never for an authorization decision, and only
   * worth setting when the credential is a JWT — an opaque token or API key
   * yields no claims and the product stays anonymous.
   */
  tokenHeader?: string;
  /**
   * Dot-separated claim paths holding a stable product user id, tried in
   * order. Used for `analytics_id` only when the token has no `email` claim.
   */
  userId?: string[];
  /** Claim paths holding the organization id, tried in order. */
  organizationId?: string[];
}

export interface Client {
  /** Human-readable name for the client - usually the product name */
  name: string;
  /** Prefix for tool, resource and prompt naming */
  capabilityPrefix: string;
  /** Prefix for configuration (environment variables and http headers) */
  configPrefix: string;
  /** Toolsets that should always be enabled, regardless of ruleset configuration */
  defaultToolsets?: string[];
  /**
   * Zod schema defining configuration fields for this client
   * Field names must use snake case to ensure they are mapped to environment variables and HTTP headers correctly.
   * e.g., `config.my_property` would refer to the environment variable `TOOL_MY_PROPERTY`, http header `Tool-My-Property`
   */
  config: ZodObject<{
    [key: string]: ZodType;
  }>;
  /**
   * Configure the client with the given server and configuration
   */
  configure: (server: SmartBearMcpServer, config: any) => Promise<void>;
  isConfigured: () => boolean;
  registerTools(
    register: RegisterToolsFunction,
    getInput: GetInputFunction,
  ): Promise<void>;
  registerResources?(register: RegisterResourceFunction): Promise<void>;
  registerPrompts?(register: RegisterPromptFunction): Promise<void>;
  /**
   * Optional method to retrieve the authentication token for the current request context.
   * This is used for request-level authentication where the token might change per request.
   */
  getAuthToken?(): string | null;
  cleanupSession?(mcpSessionId: string): Promise<void>;
  /** Usage-analytics declaration; see {@link ClientAnalytics}. */
  analytics?: ClientAnalytics;
}
