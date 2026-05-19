import type { PromptCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import type { Client, PromptParams } from "./types";

/**
 * Base class encapsulating a prompt's configuration and callback, with reference to its client.
 */
export abstract class Prompt<T extends Client> {
  protected readonly client: T;
  constructor(client: T) {
    this.client = client;
  }
  abstract specification: PromptParams;
  abstract callback: PromptCallback<ZodRawShape>;
}
