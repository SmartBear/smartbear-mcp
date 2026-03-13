import type { ToolCallback } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape, z } from "zod";
import type {
  Client,
  RegisterToolsFunction,
  SnakeCase,
  ToolParams,
  ToolParamsWithInputSchema,
} from "./types";

/**
 * Error class for tool-specific errors – these result in a response to the LLM with `isError: true`
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
type ExtractStructuredContent<T> =
  T extends Promise<infer U>
    ? U extends { structuredContent?: infer S }
      ? S
      : never
    : T extends { structuredContent?: infer S }
      ? S
      : never;

/**
 * Create a new type-safe tool that can be registered to the MCP server.
 *
 * @example
 * ```typescript
 * const myTool = new TypesafeTool(
 *   {
 *     title: "My Tool",
 *     summary: "Does something useful",
 *     inputSchema: z.object({ id: z.string() }),
 *   },
 *   (client: MyClient) => async (args) => {
 *     const result = await client.doSomething(args.id);
 *     return {
 *       content: [{ type: "text", text: JSON.stringify(result) }],
 *       structuredContent: result, // This type is automatically inferred
 *     };
 *   }
 * );
 *
 * // Access inferred types:
 * type Name = typeof myTool.name;     // "my_tool"
 * type Input = typeof myTool.input;   // { id: string }
 * type Output = typeof myTool.output; // typeof result
 * ```
 */
export class TypesafeTool<
  const Config extends ToolParamsWithInputSchema,
  Handler extends (client: any) => ToolCallback<Config["inputSchema"]> = (
    client: any,
  ) => ToolCallback<Config["inputSchema"]>,
> {
  name!: SnakeCase<Config["title"]>;
  input!: z.infer<Config["inputSchema"]>;
  output!: ExtractStructuredContent<ReturnType<ReturnType<Handler>>>;

  private readonly config: Config;
  private readonly handler: Handler;

  constructor(config: Config, handle: Handler) {
    this.config = config;
    this.handler = handle;
  }

  public register<T extends Client>(
    client: T,
    register: RegisterToolsFunction,
  ): void {
    register(this.config, this.handler(client) as ToolCallback<ZodRawShape>);
  }
}
