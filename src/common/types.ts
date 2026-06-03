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
import type { SmartBearMcpServer } from "./server";

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

export type GetEnvFn = (key: string, client?: Client) => string | undefined;

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
   * Zod schema defining authentication fields for this client
   * Field names must use snake case to ensure they are mapped to environment variables and HTTP headers correctly.
   * e.g., `authenticationFields.my_property` would refer to the http header `Tool-My-Property`
   */
  authenticationFields: ZodObject<{
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
   * Whether the client is currently authorized to make API requests.
   */
  hasAuth(): boolean;
  cleanupSession?(mcpSessionId: string): Promise<void>;
}
