import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";
import {
  ApiHubAPI,
  ApiHubConfiguration,
  type CreatePortalArgs,
  type CreateProductArgs,
  TOOLS,
  type UpdatePortalArgs,
  type UpdateProductArgs,
} from "./client/index.js";

// Tool definitions for API Hub API client
export class ApiHubClient implements Client {
  private config: ApiHubConfiguration;
  private api: ApiHubAPI;

  name = "API Hub";
  prefix = "api_hub";

  constructor(token: string) {
    this.config = new ApiHubConfiguration({ token });
    this.api = new ApiHubAPI(
      this.config,
      `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
    );
  }

  // Delegate API methods to the ApiHubAPI instance
  async getPortals(): Promise<any> {
    return this.api.getPortals();
  }

  async createPortal(body: CreatePortalArgs): Promise<any> {
    return this.api.createPortal(body);
  }

  async getPortal(args: { portalId: string }): Promise<any> {
    return this.api.getPortal(args.portalId);
  }

  async deletePortal(args: { portalId: string }): Promise<any> {
    return this.api.deletePortal(args.portalId);
  }

  async updatePortal(args: UpdatePortalArgs): Promise<any> {
    const { portalId, ...body } = args;
    return this.api.updatePortal(portalId, body);
  }

  async getPortalProducts(args: { portalId: string }): Promise<any> {
    return this.api.getPortalProducts(args.portalId);
  }

  async createPortalProduct(args: CreateProductArgs): Promise<any> {
    const { portalId, ...body } = args;
    return this.api.createPortalProduct(portalId, body);
  }

  async getPortalProduct(args: { productId: string }): Promise<any> {
    return this.api.getPortalProduct(args.productId);
  }

  async deletePortalProduct(args: { productId: string }): Promise<any> {
    return this.api.deletePortalProduct(args.productId);
  }

  async updatePortalProduct(args: UpdateProductArgs): Promise<any> {
    const { productId, ...body } = args;
    return this.api.updatePortalProduct(productId, body);
  }

  registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): void {
    TOOLS.forEach((tool) => {
      const { handler, formatResponse, ...toolParams } = tool;
      register(toolParams, async (args, _extra) => {
        try {
          // Dynamic method invocation
          const handlerFn = (this as any)[handler];
          if (typeof handlerFn !== "function") {
            throw new Error(`Handler '${handler}' not found on ApiHubClient`);
          }

          const result = await handlerFn.call(this, args);

          // Use custom formatter if available, otherwise return JSON
          const formattedResult = formatResponse
            ? formatResponse(result)
            : result;
          const responseText =
            typeof formattedResult === "string"
              ? formattedResult
              : JSON.stringify(formattedResult);

          return {
            content: [{ type: "text", text: responseText }],
          };
        } catch (error) {
          return {
            content: [
              {
                type: "text",
                text: `Error: ${error instanceof Error ? error.message : String(error)}`,
              },
            ],
          };
        }
      });
    });
  }
}
