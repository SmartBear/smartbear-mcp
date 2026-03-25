import type {
  PromptCallback,
  ReadResourceTemplateCallback,
  RegisteredPrompt,
  RegisteredResourceTemplate,
  RegisteredTool,
  ToolCallback,
} from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RequestOptions } from "@modelcontextprotocol/sdk/shared/protocol.js";
import type {
  ElicitRequest,
  ElicitResult,
} from "@modelcontextprotocol/sdk/types.js";
import type { ZodObject, ZodRawShape, ZodType } from "zod";
import type { SmartBearMcpServer } from "./server";
import type { ToolHandler, TypesafeTool } from "./tools.ts";

/**
 * Replace all occurrences of a substring.
 * StringReplace<"hello world", "l", "y"> // "heyyo woryd"
 */
export type StringReplace<
  TString extends string,
  TToReplace extends string,
  TReplacement extends string,
> = TString extends `${infer TPrefix}${TToReplace}${infer TSuffix}`
  ? `${TPrefix}${TReplacement}${StringReplace<TSuffix, TToReplace, TReplacement>}`
  : TString;

/**
 * SnakeCase<"Hello World !"> // "hello_world_!"
 */
export type SnakeCase<Str extends string> = StringReplace<
  Lowercase<Str>,
  " ",
  "_"
>;

export type ToolParams<
  Title extends string = string,
  InputSchema extends ZodType = ZodType,
  OutputSchema extends ZodType = ZodType,
> = {
  title: Title;
  summary: string;
  /** @deprecated Use `inputSchema` instead to define structured input parameters */
  parameters?: Parameters; // either 'parameters' or an 'inputSchema' should be present
  inputSchema?: InputSchema;
  /**
   * Specifies the type of object returned by the tool. <br>
   * When `outputSchema` is specified, make sure the tool returns `structuredContent` in its callback. <br>
   * To keep backwards compatibility, the tool's callback can still return a text `content`.
   *
   * https://modelcontextprotocol.io/specification/2025-06-18/server/tools#output-schema
   */
  outputSchema?: OutputSchema;
  purpose?: string;
  useCases?: string[];
  examples?: Array<{
    description: string;
    parameters: Record<string, any>;
    expectedOutput?: string;
  }>;
  hints?: string[];
  outputDescription?: string;
  readOnly?: boolean;
  destructive?: boolean;
  idempotent?: boolean;
  openWorld?: boolean;
};

export type ToolParamsWithInputSchema<
  Title extends string = string,
  InputSchema extends ZodType = ZodType,
  OutputSchema extends ZodType = ZodType,
> = Omit<ToolParams<Title, InputSchema, OutputSchema>, "parameters"> & {
  inputSchema: InputSchema;
};

export interface PromptParams {
  name: string;
  callback: any;
  params: {
    description?: string;
    argsSchema?: ZodRawShape;
    title?: string;
  };
}

export type RegisterToolsFunction = <InputArgs extends ZodRawShape>(
  params: ToolParams,
  cb: ToolCallback<InputArgs>,
) => RegisteredTool;

export type RegisterResourceFunction = (
  name: string,
  path: string,
  cb: ReadResourceTemplateCallback,
) => RegisteredResourceTemplate;

export type RegisterPromptFunction = <Args extends ZodRawShape>(
  name: string,
  config: {
    title?: string;
    description?: string;
    argsSchema?: Args;
  },
  cb: PromptCallback<Args>,
) => RegisteredPrompt;

export type GetInputFunction = (
  params: ElicitRequest["params"],
  options?: RequestOptions,
) => Promise<ElicitResult>;

export type Parameters = Array<{
  name: string;
  type: ZodType;
  required: boolean;
  description?: string;
  examples?: string[];
  constraints?: string[];
}>;

export abstract class Client {
  /** Human-readable name for the client - usually the product name - used to prefix tool names */
  abstract name: string;
  /** Prefix for tool IDs */
  abstract toolPrefix: string;
  /** Prefix for configuration (environment variables and http headers) */
  abstract configPrefix: string;
  /**
   * Zod schema defining configuration fields for this client
   * Field names must use snake case to ensure they are mapped to environment variables and HTTP headers correctly.
   * e.g., `config.my_property` would refer to the environment variable `TOOL_MY_PROPERTY`, http header `Tool-My-Property`
   */
  abstract config: ZodObject<{
    [key: string]: ZodType;
  }>;
  /**
   * Configure the client with the given server and configuration
   */
  abstract configure(server: SmartBearMcpServer, config: any): Promise<void>;
  abstract isConfigured(): boolean;
  abstract registerTools(
    register: RegisterToolsFunction,
    getInput: GetInputFunction,
  ): Promise<void>;
  registerResources?(register: RegisterResourceFunction): void;
  registerPrompts?(register: RegisterPromptFunction): void;
  cleanupSession?(mcpSessionId: string): Promise<void>;

  /**
   * Create a new type-safe tool that can be registered to the MCP server.
   *
   * @example
   * ```typescript
   * const myTool = MyClient.createTool(
   *   {
   *     title: "My Tool",
   *     summary: "Does something useful",
   *     inputSchema: z.object({ id: z.string() }),
   *   },
   *   async ({ client, args }) => {
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
   * type Input = ToolInput<typeof myTool>;   // { id: string }
   * type Output = ToolOutput<typeof myTool>; // typeof result
   * ```
   */
  static createTool<
    T extends InstanceType<typeof Client>,
    const Config extends ToolParamsWithInputSchema,
    Handler extends ToolHandler<T, Config["inputSchema"]>,
  >(this: new (...args: any[]) => T, config: Config, handle: Handler): TypesafeTool<T, Config, Handler> {
    return {
      name: config.title.toLowerCase().replaceAll(/\s+/g, "_") as SnakeCase<
        Config["title"]
      >,
      config,
      handle,

      register(
        client: T,
        register: RegisterToolsFunction,
        getInput: GetInputFunction,
      ) {
        register(config, async (args, extra) => {
          const parsedArgs = config.inputSchema.parse(args);
          return handle({ client, getInput, args: parsedArgs, extra });
        });
      },
    };
  }
}
