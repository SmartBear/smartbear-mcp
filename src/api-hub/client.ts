import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.ts";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.ts";
import {
  ApiHubAPI,
  ApiHubConfiguration,
  type CreatePortalArgs,
  type CreateProductArgs,
  type FallbackResponse,
  type Portal,
  type PortalsListResponse,
  type Product,
  type ProductsListResponse,
  type SuccessResponse,
  TOOLS,
  type UpdatePortalArgs,
  type UpdateProductArgs,
} from "./client/index.ts";

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
  async getPortals(): Promise<PortalsListResponse | FallbackResponse> {
    return this.api.getPortals();
  }

  async createPortal(
    body: CreatePortalArgs,
  ): Promise<Portal | FallbackResponse> {
    return this.api.createPortal(body);
  }

  async getPortal(args: {
    portalId: string;
  }): Promise<Portal | FallbackResponse> {
    return this.api.getPortal(args.portalId);
  }

  async deletePortal(args: { portalId: string }): Promise<void> {
    return this.api.deletePortal(args.portalId);
  }

  async updatePortal(
    args: UpdatePortalArgs,
  ): Promise<Portal | FallbackResponse> {
    const { portalId, ...body } = args;
    return this.api.updatePortal(portalId, body);
  }

  async getPortalProducts(args: {
    portalId: string;
  }): Promise<ProductsListResponse | FallbackResponse> {
    return this.api.getPortalProducts(args.portalId);
  }

  async createPortalProduct(
    args: CreateProductArgs,
  ): Promise<Product | FallbackResponse> {
    const { portalId, ...body } = args;
    return this.api.createPortalProduct(portalId, body);
  }

  async getPortalProduct(args: {
    productId: string;
  }): Promise<Product | FallbackResponse> {
    return this.api.getPortalProduct(args.productId);
  }

  async deletePortalProduct(args: {
    productId: string;
  }): Promise<Record<string, never> | FallbackResponse> {
    return this.api.deletePortalProduct(args.productId);
  }

  async updatePortalProduct(
    args: UpdateProductArgs,
  ): Promise<Product | SuccessResponse | FallbackResponse> {
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
