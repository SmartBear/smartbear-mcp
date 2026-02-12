import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  type McpUiResourceMeta,
  type McpUiToolMeta,
  RESOURCE_MIME_TYPE,
} from "@modelcontextprotocol/ext-apps";
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

export interface ToolParams {
  title: string;
  summary: string;
  parameters?: Parameters; // either 'parameters' or an 'inputSchema' should be present
  inputSchema?: ZodType;
  /**
   * Specifies the type of object returned by the tool. <br>
   * When `outputSchema` is specified, make sure the tool returns `structuredContent` in its callback. <br>
   * To keep backwards compatibility, the tool's callback can still return a text `content`.
   *
   * https://modelcontextprotocol.io/specification/2025-06-18/server/tools#output-schema
   */
  outputSchema?: ZodType;
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
  _meta?: {
    ui?: McpUiToolMeta;
  };
}

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
  path:
    | string
    | {
        uri: string;
      } /* replace the default uri construction with a full uri string (may include template variables) */,
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

  protected createAppUri(tool: string = "{tool}") {
    return `ui://${this.toolPrefix}/app/${tool}`;
  }

  protected registerUIResource(
    register: RegisterResourceFunction,
    config?: {
      name?: string;
      uri?: string;
      /**
       * Path to html entry relative to the src directory
       * @default `${toolPrefix}/ui/app.html`
       * @example "bugsnag/ui/app.html"
       */
      filePath?: string;
      /**
       * Not required if filePath is provided
       * @default "app.html"
       */
      htmlFile?: string;
    },
  ) {
    const {
      name = `${this.toolPrefix}-ui`,
      uri = this.createAppUri(),
      htmlFile = "app.html",
      filePath = `${this.toolPrefix}/ui/${htmlFile}`,
    } = config || {};

    let html: string;
    const isDev = process.env.UI_DEV;
    const toolPlaceholder = "{{tool}}";

    register(name, { uri }, async (uri, variables, _extra) => {
      if (isDev || !html) {
        html = await (isDev
          ? // always re-fetch from the vite dev server
            fetch(`http://localhost:3001/${filePath}`).then((res) => res.text())
          : // only read the file once when served from the dist folder rather than the vite dev server
            readFile(
              join(dirname(fileURLToPath(import.meta.url)), "..", filePath),
              "utf-8",
            ));

        if (!html.includes(toolPlaceholder)) {
          throw new Error(
            `expected meta tag mcp-tool-id with content placeholder ${toolPlaceholder} but was not found`,
          );
        }
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: RESOURCE_MIME_TYPE,
            text: html.replace(toolPlaceholder, variables.tool as string),
            _meta: {
              ui: {
                csp: {
                  resourceDomains: isDev
                    ? ["http://localhost:3001"]
                    : ["http://localhost:3000"],
                  connectDomains: isDev
                    ? ["http://localhost:3001", "ws://localhost:3001"]
                    : [],
                },
              } satisfies McpUiResourceMeta,
            },
          },
        ],
      };
    });
  }
}
