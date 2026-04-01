import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { ZodRawShape, ZodType, z } from "zod";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
  SnakeCase,
  ToolParams,
  ToolParamsWithInputSchema,
} from "./types";

/**
 * Error class for tool-specific errors – these result in a response to the LLM with `isError: true`
 * and are not reported to BugSnag
 */
export class ToolError extends Error {
  // can be used to set misc properties like response status code, etc.
  public metadata: Map<string, any> | undefined;

  constructor(
    cause?: string | undefined,
    options?: ErrorOptions | undefined,
    metadata?: Map<string, any> | undefined,
  ) {
    super(cause, options);
    this.metadata = metadata;
    Object.setPrototypeOf(this, ToolError.prototype);
  }
}

/**
 * Base class encapsulating a tool's parameter format and the action, with reference to it's client.
 */
export abstract class Tool<T extends Client> {
  protected readonly client: T;
  constructor(client: T) {
    this.client = client;
  }
  abstract specification: ToolParams;
  abstract handle: ToolCallback<ZodRawShape>;
}

/**
 * Extract the structuredContent type from a CallToolResult
 */
type ExtractStructuredContent<T> = T extends Promise<infer U>
  ? U extends { structuredContent?: infer S }
    ? S
    : never
  : T extends { structuredContent?: infer S }
    ? S
    : never;

export type ToolInput<T> = T extends TypesafeTool<any, infer C, any>
  ? C extends { inputSchema: infer I }
    ? z.infer<I>
    : never
  : never;

export type ToolOutput<T> = T extends TypesafeTool<any, infer C, infer H>
  ? C extends { outputSchema: infer O }
    ? z.infer<O>
    : H extends (...args: any[]) => infer R
      ? ExtractStructuredContent<R>
      : never
  : never;

export interface ToolArgs<T extends Client, I extends ZodType> {
  client: T;
  getInput: GetInputFunction;
  args: Parameters<ToolCallback<I>>[0];
  extra: Parameters<ToolCallback<I>>[1];
}

/**
 * Make the structuredContent inferable
 */
interface Result<T extends { [x: string]: unknown } | undefined = any>
  extends CallToolResult {
  structuredContent?: T;
}

export type ToolHandler<T extends Client, I extends ZodType> = (
  args: ToolArgs<T, I>,
) => Promise<Result>;

/**
 * Represents a type-safe tool that can be registered to the MCP server via a client.
 */
export interface TypesafeTool<
  T extends Client,
  Config extends ToolParamsWithInputSchema,
  Handler extends ToolHandler<T, Config["inputSchema"]>,
> {
  name: SnakeCase<Config["title"]>;
  config: Config;
  handle: Handler;
  register(
    client: T,
    register: RegisterToolsFunction,
    getInput: GetInputFunction,
  ): void;
}
