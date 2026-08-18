import type {
  GetPromptResult,
  ServerContext,
} from "@modelcontextprotocol/server";
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
 */
export abstract class Prompt<T extends Client> {
  protected readonly client: T;
  constructor(client: T) {
    this.client = client;
  }
  abstract specification: PromptParams;
  abstract callback: PromptHandler;
}
