import type { PromptCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type {
  GetPromptResult,
  ServerContext,
} from "@modelcontextprotocol/server";
import type { ZodRawShape } from "zod";
import type { Client, PromptParams } from "./types";

/**
 * Handler signature for a prompt's callback. In SDK v2 the request context is a
 * single {@link ServerContext} argument (replacing the v1 `extra`); `args` is
 * loosely typed because each prompt validates against its own `argsSchema`.
 */
export type PromptHandler = (
  args: any,
  ctx: ServerContext,
) => GetPromptResult | Promise<GetPromptResult>;

/**
 * Base class encapsulating a prompt's configuration and callback, with reference to its client.
 *
 * `callback` accepts either the new SDK v2 {@link PromptHandler} or the legacy
 * SDK v1 `PromptCallback` while products are migrated incrementally; drop the
 * `PromptCallback` arm once every product has switched to `PromptHandler`.
 */
export abstract class Prompt<T extends Client> {
  protected readonly client: T;
  constructor(client: T) {
    this.client = client;
  }
  abstract specification: PromptParams;
  abstract callback: PromptHandler | PromptCallback<ZodRawShape>;
}
