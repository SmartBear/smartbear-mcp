import { z } from "zod";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import type { SmartBearMcpServer } from "../common/server.js";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";
// Apply backward compatibility for API_HUB_API_KEY
import "./config-utils.js";
import {
  type ApiDefinitionParams,
  type ApiSearchParams,
  type ApiSearchResponse,
  type CreateApiFromPromptParams,
  type CreateApiFromPromptResponse,
  type CreateApiParams,
  type CreateApiResponse,
  type CreatePortalArgs,
  type CreateProductArgs,
  type CreateTableOfContentsArgs,
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
  type ScanStandardizationParams,
  type SectionsListResponse,
  type StandardizationResult,
  type StandardizeApiParams,
  type StandardizeApiResponse,
  type SuccessResponse,
  SwaggerAPI,
  SwaggerConfiguration,
  type TableOfContentsItem,
  type TableOfContentsListResponse,
  TOOLS,
  type UpdateDocumentArgs,
  type UpdatePortalArgs,
  type UpdateProductArgs,
} from "./client/index.js";

import type {
  OrganizationsListResponse,
  OrganizationsQueryParams,
} from "./client/user-management-types.js";

const ConfigurationSchema = z.object({
  api_key: z.string().describe("Swagger API key for authentication"),
  portal_base_path: z
    .string()
    .optional()
    .describe("Base path for Portal API requests (optional)"),
  registry_base_path: z
    .string()
    .optional()
    .describe("Base path for Registry API requests (optional)"),
  ui_base_path: z
    .string()
    .optional()
    .describe("Base URL for the SwaggerHub UI (optional)"),
});

// Tool definitions for API Hub API client
export class SwaggerClient implements Client {
  private api: SwaggerAPI | undefined;

  name = "Swagger";
  toolPrefix = "swagger";
  configPrefix = "Swagger";
  config = ConfigurationSchema;

  async configure(
    _server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
    _cache?: any,
  ): Promise<void> {
    this.api = new SwaggerAPI(
      new SwaggerConfiguration({
        token: config.api_key,
        portalBasePath: config.portal_base_path,
        registryBasePath: config.registry_base_path,
        uiBasePath: config.ui_base_path,
      }),
      `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
    );
  }

  isConfigured(): boolean {
    return this.api !== undefined;
  }

  getApi(): SwaggerAPI {
    if (!this.api) throw new Error("Client not configured");
    return this.api;
  }

  // Delegate API methods to the SwaggerAPI instance
  async getPortals(): Promise<PortalsListResponse | FallbackResponse> {
    return this.getApi().getPortals();
  }

  async createPortal(
    body: CreatePortalArgs,
  ): Promise<Portal | FallbackResponse> {
    return this.getApi().createPortal(body);
  }

  async getPortal(args: {
    portalId: string;
  }): Promise<Portal | FallbackResponse> {
    return this.getApi().getPortal(args.portalId);
  }

  async updatePortal(
    args: UpdatePortalArgs,
  ): Promise<Portal | FallbackResponse> {
    const { portalId, ...body } = args;
    return this.getApi().updatePortal(portalId, body);
  }

  async getPortalProducts(args: {
    portalId: string;
  }): Promise<ProductsListResponse | FallbackResponse> {
    return this.getApi().getPortalProducts(args.portalId);
  }

  async createPortalProduct(
    args: CreateProductArgs,
  ): Promise<Product | FallbackResponse> {
    const { portalId, ...body } = args;
    return this.getApi().createPortalProduct(portalId, body);
  }

  async getPortalProduct(args: {
    productId: string;
  }): Promise<Product | FallbackResponse> {
    return this.getApi().getPortalProduct(args.productId);
  }

  async deletePortalProduct(args: {
    productId: string;
  }): Promise<Record<string, never> | FallbackResponse> {
    return this.getApi().deletePortalProduct(args.productId);
  }

  async updatePortalProduct(
    args: UpdateProductArgs,
  ): Promise<Product | SuccessResponse | FallbackResponse> {
    const { productId, ...body } = args;
    return this.getApi().updatePortalProduct(productId, body);
  }

  async publishPortalProduct(
    args: PublishProductArgs,
  ): Promise<SuccessResponse | FallbackResponse> {
    const { productId, preview } = args;
    return this.getApi().publishPortalProduct(productId, preview);
  }

  async getPortalProductSections(
    args: GetProductSectionsArgs,
  ): Promise<SectionsListResponse | SuccessResponse | FallbackResponse> {
    const { productId, ...params } = args;
    return this.getApi().getPortalProductSections(productId, params);
  }

  async createTableOfContents(
    args: CreateTableOfContentsArgs,
  ): Promise<TableOfContentsItem | FallbackResponse> {
    const { sectionId, ...body } = args;
    return this.getApi().createTableOfContents(sectionId, body);
  }

  async getTableOfContents(
    args: GetTableOfContentsArgs,
  ): Promise<TableOfContentsListResponse | FallbackResponse> {
    return this.getApi().getTableOfContents(args);
  }

  async getDocument(
    args: GetDocumentArgs,
  ): Promise<Document | FallbackResponse> {
    return this.getApi().getDocument(args);
  }

  async updateDocument(
    args: UpdateDocumentArgs,
  ): Promise<SuccessResponse | FallbackResponse> {
    return this.getApi().updateDocument(args);
  }

  async deleteTableOfContents(
    args: DeleteTableOfContentsArgs,
  ): Promise<SuccessResponse | FallbackResponse> {
    return this.getApi().deleteTableOfContents(args);
  }

  // Registry API methods for SwaggerHub Design functionality

  async searchApis(
    args: ApiSearchParams = {},
  ): Promise<ApiSearchResponse | FallbackResponse> {
    return this.getApi().searchApis(args);
  }

  async getApiDefinition(
    args: ApiDefinitionParams,
  ): Promise<unknown | FallbackResponse> {
    return this.getApi().getApiDefinition(args);
  }

  async createOrUpdateApi(
    args: CreateApiParams,
  ): Promise<CreateApiResponse | FallbackResponse> {
    return this.getApi().createOrUpdateApi(args);
  }

  // User Management API methods
  async getOrganizations(
    args?: OrganizationsQueryParams,
  ): Promise<OrganizationsListResponse | FallbackResponse> {
    return this.getApi().getOrganizations(args);
  }

  async createApiFromPrompt(
    args: CreateApiFromPromptParams,
  ): Promise<CreateApiFromPromptResponse | FallbackResponse> {
    return this.getApi().createApiFromPrompt(args);
  }

  async scanStandardization(
    args: ScanStandardizationParams,
  ): Promise<StandardizationResult | FallbackResponse> {
    return this.getApi().scanStandardization(args);
  }

  async standardizeApi(
    args: StandardizeApiParams,
  ): Promise<StandardizeApiResponse | FallbackResponse> {
    return this.getApi().standardizeApi(args);
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
            throw new Error(`Handler '${handler}' not found on SwaggerClient`);
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
