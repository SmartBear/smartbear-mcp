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
import type { ZodObject, ZodRawShape, ZodType, ZodTypeAny } from "zod";
import type { SmartBearMcpServer } from "./server.js";

export interface ToolParams {
  title: string;
  summary: string;
  parameters?: Parameters; // either 'parameters' or an 'inputSchema' should be present
  inputSchema?: ZodTypeAny;
  /**
   * Specifies the type of object returned by the tool. <br>
   * When `outputSchema` is specified, make sure the tool returns `structuredContent` in its callback. <br>
   * To keep backwards compatibility, the tool's callback can still return a text `content`.
   *
   * https://modelcontextprotocol.io/specification/2025-06-18/server/tools#output-schema
   */
  outputSchema?: ZodTypeAny;
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
  name: string;
  callback: any;
  params: {
    description?: string;
    argsSchema?: ZodRawShape;
    title?: string;
  };
}

export type RegisterToolsFunction = <InputArgs extends ZodRawShape>(
  params: ToolParams,
  cb: ToolCallback<InputArgs>,
) => RegisteredTool;

export type RegisterResourceFunction = (
  name: string,
  path: string,
  cb: ReadResourceTemplateCallback,
) => RegisteredResourceTemplate;

export type RegisterPromptFunction = <Args extends ZodRawShape>(
  name: string,
  config: {
    title?: string;
    description?: string;
    argsSchema?: Args;
  },
  cb: PromptCallback<Args>,
) => RegisteredPrompt;

export type GetInputFunction = (
  params: ElicitRequest["params"],
  options?: RequestOptions,
) => Promise<ElicitResult>;

export type Parameters = Array<{
  name: string;
  type: ZodType;
  required: boolean;
  description?: string;
  examples?: string[];
  constraints?: string[];
}>;

export interface Client {
  /** Human-readable name for the client - usually the product name - used to prefix tool names */
  name: string;
  /** Prefix for tool IDs */
  toolPrefix: string;
  /** Prefix for configuration (environment variables and http headers) */
  configPrefix: string;
  /**
   * Zod schema defining configuration fields for this client
   * Field names must use snake case to ensure they are mapped to environment variables and HTTP headers correctly.
   * e.g., `config.my_property` would refer to the environment variable `TOOL_MY_PROPERTY`, http header `Tool-My-Property`
   */
  config: ZodObject<ZodRawShape>;
  /**
   * Configure the client with the given server and configuration
   */
  configure: (server: SmartBearMcpServer, config: any) => Promise<void>;
  isConfigured: () => boolean;
  registerTools(
    register: RegisterToolsFunction,
    getInput: GetInputFunction,
  ): void;
  registerResources?(register: RegisterResourceFunction): void;
  registerPrompts?(register: RegisterPromptFunction): void;
}
