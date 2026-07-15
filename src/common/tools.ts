// biome-ignore-all lint/style/noExcessiveClassesPerFile: ToolError and Tool are small,
// tightly-related exports (a tool's base class and its dedicated error type) that are
// both imported from this single module throughout every client directory; splitting
// them into separate files would ripple import paths repo-wide for no functional benefit.
import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import type { Client, ToolParams } from "./types.ts";

/**
 * Error class for tool-specific errors – these result in a response to the LLM with `isError: true`
 * and are not reported to BugSnag
 */
export class ToolError extends Error {
  // can be used to set misc properties like response status code, etc.
  metadata?: Map<string, unknown> | undefined;

  constructor(
    cause?: string | undefined,
    options?: ErrorOptions | undefined,
    metadata?: Map<string, unknown> | undefined,
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
