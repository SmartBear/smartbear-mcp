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

/**
 * Authentication requirement for a client
 */
export interface AuthRequirement {
  /** Environment variable name (e.g., 'BUGSNAG_AUTH_TOKEN') */
  key: string;
  /** Whether this auth value is required */
  required: boolean;
  /** Description of this auth value */
  description: string;
}

/**
 * Authentication configuration for a client
 */
export interface ClientAuthConfig {
  /** List of authentication requirements */
  requirements: AuthRequirement[];
  /** Description of how authentication works for this client */
  description?: string;
}

export interface Client {
  name: string;
  prefix: string;
  registerTools(
    register: RegisterToolsFunction,
    getInput: GetInputFunction,
  ): void;
  registerResources?(register: RegisterResourceFunction): void;
  registerPrompts?(register: RegisterPromptFunction): void;
}
