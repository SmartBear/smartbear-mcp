import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";
import { OrganizationsListResponse } from "./client/core-types.js";
import {
  type ApiDefinitionParams,
  ApiHubAPI,
  ApiHubConfiguration,
  type ApiSearchParams,
  type ApiSearchResponse,
  type CreateApiFromTemplateParams,
  type CreateApiFromTemplateResponse,
  type CreateApiParams,
  type CreateApiResponse,
  type CreatePortalArgs,
  type CreateProductArgs,
  type CreateTableOfContentsArgs,
  type DeleteDocumentArgs,
  type DeleteTableOfContentsArgs,
  type Document,
  type FallbackResponse,
  type GetDocumentArgs,
  type GetProductSectionsArgs,
  type GetTableOfContentsArgs,
  type Portal,
  type PortalsListResponse,
  type Product,
  type ProductsListResponse,
  type PublishProductArgs,
  type SectionsListResponse,
  type SuccessResponse,
  type TableOfContentsItem,
  type TableOfContentsListResponse,
  TOOLS,
  type UpdateDocumentArgs,
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

  async getPortalProducts(args: { portalId: string }): Promise<ProductsListResponse | FallbackResponse> {
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

  async publishPortalProduct(
    args: PublishProductArgs,
  ): Promise<SuccessResponse | FallbackResponse> {
    const { productId, preview } = args;
    return this.api.publishPortalProduct(productId, preview);
  }

  async getPortalProductSections(
    args: GetProductSectionsArgs,
  ): Promise<SectionsListResponse | SuccessResponse | FallbackResponse> {
    const { productId, ...params } = args;
    return this.api.getPortalProductSections(productId, params);
  }

  async createTableOfContents(
    args: CreateTableOfContentsArgs,
  ): Promise<TableOfContentsItem | FallbackResponse> {
    const { sectionId, ...body } = args;
    return this.api.createTableOfContents(sectionId, body);
  }

  async getTableOfContents(
    args: GetTableOfContentsArgs,
  ): Promise<TableOfContentsListResponse | FallbackResponse> {
    return this.api.getTableOfContents(args);
  }

  async getDocument(
    args: GetDocumentArgs,
  ): Promise<Document | FallbackResponse> {
    return this.api.getDocument(args);
  }

  async updateDocument(
    args: UpdateDocumentArgs,
  ): Promise<SuccessResponse | FallbackResponse> {
    return this.api.updateDocument(args);
  }

  async deleteDocument(
    args: DeleteDocumentArgs,
  ): Promise<SuccessResponse | FallbackResponse> {
    return this.api.deleteDocument(args);
  }

  async deleteTableOfContents(
    args: DeleteTableOfContentsArgs,
  ): Promise<SuccessResponse | FallbackResponse> {
    return this.api.deleteTableOfContents(args);
  }

  // Registry API methods for SwaggerHub Design functionality

  async searchApis(
    args: ApiSearchParams = {},
  ): Promise<ApiSearchResponse | FallbackResponse> {
    return this.api.searchApis(args);
  }

  async getApiDefinition(
    args: ApiDefinitionParams,
  ): Promise<unknown | FallbackResponse> {
    return this.api.getApiDefinition(args);
  }

  async createOrUpdateApi(
    args: CreateApiParams,
  ): Promise<CreateApiResponse | FallbackResponse> {
    return this.api.createOrUpdateApi(args);
  }

  async createApiFromTemplate(
    args: CreateApiFromTemplateParams,
  ): Promise<CreateApiFromTemplateResponse | FallbackResponse> {
    return this.api.createApiFromTemplate(args);
  }

  // Core API methods
  async getOrganizations(): Promise<OrganizationsListResponse | FallbackResponse> {
    return this.api.getOrganizations();
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
