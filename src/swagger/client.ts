import { z } from "zod";
import { USER_AGENT } from "../common/info";
import { getRequestHeader } from "../common/request-context";
import type { SmartBearMcpServer } from "../common/server";
import { ToolError } from "../common/tools";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types";
// Apply backward compatibility for API_HUB_API_KEY
import "./config-utils";
import {
  FUNCTIONAL_TESTING_API_KEY_HEADER,
  FunctionalTestingAPI,
} from "./client/functional-testing-api";
import type {
  GetFunctionalTestingExecutionTestParams,
  RunFunctionalTestingTestParams,
} from "./client/functional-testing-types";
import {
  type ApiDefinitionParams,
  type ApiSearchParams,
  type ApiSearchResponse,
  type CreateApiFromPromptParams,
  type CreateApiFromPromptResponse,
  type CreateApiParams,
  type CreateApiResponse,
  type CreateDocumentationPageArgs,
  type CreateDocumentationPageResult,
  type CreatePortalArgs,
  type CreateProductArgs,
  type CreateTableOfContentsArgs,
  type CreateTableOfContentsItemResponse,
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
  type PublishPortalProductResponse,
  type PublishProductArgs,
  type ResolveOrganizationPortalArgs,
  type ResolveOrganizationPortalResponse,
  type ScanApiStandardizationFromRegistryParams,
  type ScanApiStandardizationFromRegistryResult,
  type ScanStandardizationParams,
  type SectionsListResponse,
  type StandardizationResult,
  type StandardizeApiParams,
  type StandardizeApiResponse,
  type SuccessResponse,
  SwaggerAPI,
  SwaggerConfiguration,
  type TableOfContentsListResponse,
  TOOLS,
  type UpdateDocumentArgs,
  type UpdatePortalArgs,
  type UpdateProductArgs,
} from "./client/index";
import type {
  OrganizationsListResponse,
  OrganizationsQueryParams,
} from "./client/user-management-types";

const ConfigurationSchema = z.object({
  api_key: z.string().optional().describe("Swagger API key for authentication"),
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
  functional_testing_api_token: z
    .string()
    .optional()
    .describe(
      "Swagger Functional Testing API token. Leave empty to disable Functional Testing tools.",
    ),
  functional_testing_base_path: z
    .string()
    .optional()
    .describe(
      "Base URL for Swagger Functional Testing API requests (optional)",
    ),
});

// Tool definitions for API Hub API client
export class SwaggerClient implements Client {
  private api: SwaggerAPI | undefined;
  private _apiKey: string | undefined;
  private ftApi: FunctionalTestingAPI | undefined;
  private _ftApiToken: string | undefined;

  name = "Swagger";
  capabilityPrefix = "swagger";
  configPrefix = "Swagger";
  config = ConfigurationSchema;

  async configure(
    _server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
    _cache?: any,
  ): Promise<void> {
    // The Swagger API key can be supplied directly as config (env var /
    // Swagger-Api-Key header) or via an OAuth bearer token on the request's
    // Authorization header. The bearer token is only available per-request and
    // is resolved lazily in getAuthToken(), so check the request context here to
    // decide whether to enable the Portal/Studio API. Without this, an
    // OAuth-only request would leave this.api undefined and no Swagger tools
    // would be registered.
    const hasSwaggerAuth =
      !!config.api_key ||
      !!getRequestHeader("Swagger-Api-Key") ||
      !!getRequestHeader("Authorization");

    if (hasSwaggerAuth) {
      this._apiKey = config.api_key;
      this.api = new SwaggerAPI(
        new SwaggerConfiguration({
          token: () => this.getAuthToken(),
          portalBasePath: config.portal_base_path,
          registryBasePath: config.registry_base_path,
          uiBasePath: config.ui_base_path,
        }),
        USER_AGENT,
      );
    }

    if (config.functional_testing_api_token) {
      this._ftApiToken = config.functional_testing_api_token;
      this.ftApi = new FunctionalTestingAPI(
        () => this.getFtAuthToken(),
        USER_AGENT,
        config.functional_testing_base_path,
      );
    }
  }

  getAuthToken(): string | null {
    // 1. Try request context
    const contextHeader =
      getRequestHeader("Swagger-Api-Key") || getRequestHeader("Authorization");

    if (contextHeader) {
      let token = Array.isArray(contextHeader)
        ? contextHeader[0]
        : contextHeader;

      // Handle Bearer or token prefix if present
      if (token.startsWith("Bearer ")) {
        token = token.substring(7);
      }
      return token;
    }

    // 2. Fallback to configured token
    return this._apiKey || null;
  }

  getFtAuthToken(): string | null {
    if (!this.ftApi) return null;
    const contextHeader = getRequestHeader(FUNCTIONAL_TESTING_API_KEY_HEADER);
    if (contextHeader) {
      return Array.isArray(contextHeader) ? contextHeader[0] : contextHeader;
    }
    return this._ftApiToken || null;
  }

  isConfigured(): boolean {
    return this.api !== undefined || this.ftApi !== undefined;
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

  async resolveOrganizationPortal(
    args: ResolveOrganizationPortalArgs,
  ): Promise<ResolveOrganizationPortalResponse | FallbackResponse> {
    return this.getApi().resolveOrganizationPortal(args);
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
  ): Promise<PublishPortalProductResponse | FallbackResponse> {
    const { productId, preview, tableOfContentsId } = args;
    return this.getApi().publishPortalProduct(
      productId,
      preview,
      tableOfContentsId ?? null,
    );
  }

  async getPortalProductSections(
    args: GetProductSectionsArgs,
  ): Promise<SectionsListResponse | SuccessResponse | FallbackResponse> {
    const { productId, ...params } = args;
    return this.getApi().getPortalProductSections(productId, params);
  }

  async createTableOfContents(
    args: CreateTableOfContentsArgs,
  ): Promise<CreateTableOfContentsItemResponse | FallbackResponse> {
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

  async createDocumentationPage(
    args: CreateDocumentationPageArgs,
  ): Promise<CreateDocumentationPageResult> {
    return this.getApi().createDocumentationPage(args);
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

  async scanApiStandardizationFromRegistry(
    args: ScanApiStandardizationFromRegistryParams,
  ): Promise<ScanApiStandardizationFromRegistryResult | FallbackResponse> {
    return this.getApi().scanApiStandardizationFromRegistry(args);
  }

  async standardizeApi(
    args: StandardizeApiParams,
  ): Promise<StandardizeApiResponse | FallbackResponse> {
    return this.getApi().standardizeApi(args);
  }

  // Functional Testing methods

  async listFunctionalTestingTests(): Promise<unknown> {
    return this.withFunctionalTesting((ftApi) => ftApi.listTests());
  }

  async runFunctionalTestingTest(
    args: RunFunctionalTestingTestParams,
  ): Promise<unknown> {
    return this.withFunctionalTesting((ftApi) => ftApi.runTest(args));
  }

  async getFunctionalTestingExecution(
    args: GetFunctionalTestingExecutionTestParams,
  ): Promise<unknown> {
    return this.withFunctionalTesting((ftApi) => ftApi.getTestExecution(args));
  }

  /**
   * Perform an operation with the Functional Testing API.
   * Throws a ToolError if Functional Testing is not configured
   */
  private async withFunctionalTesting<T>(
    fn: (ftApi: FunctionalTestingAPI) => Promise<T>,
  ): Promise<T> {
    if (!this.ftApi) {
      throw new ToolError("Functional Testing API not configured");
    }

    return fn(this.ftApi);
  }

  async listFunctionalTestingSuites(): Promise<unknown> {
    return this.withFunctionalTesting((ftApi) => ftApi.listSuites());
  }

  async registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): Promise<void> {
    TOOLS.forEach((tool) => {
      if (tool.toolset === "Functional Testing" && !this.ftApi) {
        return;
      }
      if (
        tool.toolset !== "Functional Testing" &&
        !this.api &&
        this.isConfigured()
      ) {
        return;
      }

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
