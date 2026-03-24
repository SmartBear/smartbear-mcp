import type { ReadResourceTemplateCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestHandlerExtra } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ReadResourceResult,
  ServerNotification,
  ServerRequest,
} from "@modelcontextprotocol/sdk/types.js";
import type { Client, RegisterResourceFunction } from "./types";

/**
 * Turn a path template into an object type of the path parameters
 * @example
 * type T = ExtractPathParams<'/foo/{bar}'>;
 * // => { bar: string }
 */
type ExtractPathParams<T extends string> =
  T extends `${string}{${infer Param}}/${infer Rest}`
    ? ExtractPathParams<Rest> extends void
      ? { [k in Param]: string }
      : { [k in Param | keyof ExtractPathParams<Rest>]: string }
    : T extends `${string}{${infer Param}}`
      ? { [k in Param]: string }
      : undefined;

export interface ResourceConfig<Name extends string, Path extends string> {
  name: Name;
  path: Path;
}

export type ResourceTemplateCallback<Path extends string> = (
  uri: URL,
  variables: ExtractPathParams<Path>,
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>,
) => ReadResourceResult | Promise<ReadResourceResult>;

/**
 * Create a new resource that can be registered to the MCP server
 */
export class Resource<
  T extends Client,
  const Config extends ResourceConfig<string, string>,
> {
  variables!: ExtractPathParams<Config["path"]>;

  private readonly config: Config;
  private readonly handler: (
    client: T,
  ) => ResourceTemplateCallback<Config["path"]>;

  constructor(
    config: Config,
    handle: (client: T) => ResourceTemplateCallback<Config["path"]>,
  ) {
    this.config = config;
    this.handler = handle;
  }

  public register(client: T, register: RegisterResourceFunction): void {
    register(
      this.config.name,
      this.config.path,
      this.handler(client) as ReadResourceTemplateCallback,
    );
  }
}
