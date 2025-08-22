import { ReadResourceTemplateCallback, RegisteredResourceTemplate, RegisteredTool, ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import { ElicitRequest, ElicitResult } from "@modelcontextprotocol/sdk/types.js";
import { ZodRawShape, ZodType, ZodTypeAny } from "zod";
import { RequestOptions } from "@modelcontextprotocol/sdk/shared/protocol.js";

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

export type RegisterToolsFunction = <InputArgs extends ZodRawShape>(
    params: ToolParams,
    cb: ToolCallback<InputArgs>
) => RegisteredTool;

export type RegisterResourceFunction = (
    name: string,
    path: string,
    cb: ReadResourceTemplateCallback
) => RegisteredResourceTemplate;

export type GetInputFunction = (
    params: ElicitRequest["params"],
    options?: RequestOptions
) => Promise<ElicitResult>

export type Parameters = Array<{
  name: string;
  type: ZodType;
  required: boolean;
  description?: string;
  examples?: string[];
  constraints?: string[];
}>;

export interface Client {
    name: string;
    prefix: string;
    registerTools(register: RegisterToolsFunction, getInput: GetInputFunction): void;
    registerResources?(register: RegisterResourceFunction): void;
}
