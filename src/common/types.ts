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
import type { ZodRawShape, ZodType, ZodTypeAny } from "zod";
import type { SmartBearMcpServer } from "./server.js";
import type { ZodObject } from "zod";

export interface ToolParams {
  title: string;
  summary: string;
  parameters?: Parameters; // either parameters or a zodSchema should be present
  zodSchema?: ZodTypeAny;
  purpose?: string;
  useCases?: string[];
  examples?: Array<{
    description: string;
    parameters: Record<string, any>;
    expectedOutput?: string;
  }>;
  hints?: string[];
  outputFormat?: string;
  readOnly?: boolean;
  destructive?: boolean;
  idempotent?: boolean;
  openWorld?: boolean;
}

/**
 * Error class for tool-specific errors – these result in a response to the LLM with `isError: true`
 * and are not reported to BugSnag
 */
export class ToolError extends Error {}

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
  prefix: string;
  /** Zod schema defining configuration fields for this client */
  config: ZodObject<any>;
  configure: (server: SmartBearMcpServer, config: any) => Promise<boolean>;
  registerTools(
    register: RegisterToolsFunction,
    getInput: GetInputFunction,
  ): void;
  registerResources?(register: RegisterResourceFunction): void;
  registerPrompts?(register: RegisterPromptFunction): void;
}
