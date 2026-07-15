import type {
  PromptCallback,
  ReadResourceTemplateCallback,
  RegisteredPrompt,
  RegisteredResourceTemplate,
  RegisteredTool,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestOptions } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ElicitRequest,
  ElicitResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { ZodObject, ZodRawShape, ZodType } from "zod";
import type { SmartBearMcpServer } from "./server.ts";

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
    parameters: Record<string, unknown>;
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

export type RegisterToolsFunction = <InputArgs extends ZodRawShape>(
  params: ToolParams,
  cb: ToolCallback<InputArgs>,
) => RegisteredTool | null;

export type RegisterResourceFunction = (
  params: ResourceParams,
  cb: ReadResourceTemplateCallback,
) => RegisteredResourceTemplate;

export type RegisterPromptFunction = <Args extends ZodRawShape>(
  params: PromptParams,
  cb: PromptCallback<Args>,
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
  // Each client implementation declares its own concrete config shape (with
  // required/optional properties specific to that client), which is incompatible
  // with a single narrower shared type here (e.g. Record<string, string>) under
  // strict parameter contravariance.
  // biome-ignore lint/suspicious/noExplicitAny: shared cross-directory interface; see above
  configure: (server: SmartBearMcpServer, config: any) => Promise<void>;
  isConfigured: () => boolean;
  registerTools: (
    register: RegisterToolsFunction,
    getInput: GetInputFunction,
  ) => Promise<void>;
  registerResources?: (register: RegisterResourceFunction) => Promise<void>;
  registerPrompts?: (register: RegisterPromptFunction) => Promise<void>;
  /**
   * Optional method to retrieve the authentication token for the current request context.
   * This is used for request-level authentication where the token might change per request.
   */
  getAuthToken?: () => string | null;
  cleanupSession?: (mcpSessionId: string) => Promise<void>;
}
