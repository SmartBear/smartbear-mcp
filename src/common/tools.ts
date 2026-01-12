import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import type { Client, ToolParams } from "./types";

/**
 * Error class for tool-specific errors – these result in a response to the LLM with `isError: true`
 * and are not reported to BugSnag
 */
export class ToolError extends Error {
  // can be used to set misc properties like response status code, etc.
  public metadata?: Map<string, any> | undefined;

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
