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
export type ExtractPathParams<T extends string> =
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

export type ResourceTemplateCallback<
  T extends Client,
  Path extends string,
> = (args: {
  client: T;
  uri: URL;
  variables: ExtractPathParams<Path>;
  extra: RequestHandlerExtra<ServerRequest, ServerNotification>;
}) => ReadResourceResult | Promise<ReadResourceResult>;

/**
 * A resource that can be registered to the MCP server
 */
export interface Resource<
  T extends Client,
  Config extends ResourceConfig<string, string>,
> {
  config: Config;
  handle: ResourceTemplateCallback<T, Config["path"]>;
  register(client: T, register: RegisterResourceFunction): void;
}
