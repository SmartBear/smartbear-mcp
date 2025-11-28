import { ToolError } from "../../common/types.js";
import type { SwaggerConfiguration } from "./configuration.js";
import type {
  CreatePortalArgs,
  CreateProductBody,
  CreateTableOfContentsBody,
  DeleteTableOfContentsArgs,
  Document,
  FallbackResponse,
  GetDocumentArgs,
  GetProductSectionsArgs,
  GetTableOfContentsArgs,
  Portal,
  PortalsListResponse,
  Product,
  ProductsListResponse,
  SectionsListResponse,
  SuccessResponse,
  TableOfContentsItem,
  TableOfContentsListResponse,
  UpdateDocumentArgs,
  UpdatePortalBody,
  UpdateProductBody,
} from "./portal-types.js";
import type {
  ApiDefinitionParams,
  ApiProperty,
  ApiSearchParams,
  ApiSearchResponse,
  ApiSpecification,
  ApisJsonResponse,
  CreateApiFromTemplateParams,
  CreateApiFromTemplateResponse,
  CreateApiParams,
  CreateApiResponse,
  ScanStandardizationParams,
  StandardizationResult,
} from "./registry-types.js";
import type {
  OrganizationsListResponse,
  OrganizationsQueryParams,
} from "./user-management-types.js";

// Regex to extract owner, name, and version from SwaggerHub URLs.
// Matches /apis/owner/name/version, /domains/owner/name/version, or /templates/owner/name/version
// Example: /apis/acme/petstore/1.0.0
//   - group 1: type (apis|domains|templates)
//   - group 2: owner
//   - group 3: name
//   - group 4: version
const SWAGGER_URL_REGEX =
  /\/(apis|domains|templates)\/([^/]+)\/([^/]+)\/([^/]+)/;

export class SwaggerAPI {
  private config: SwaggerConfiguration;
  private headers: Record<string, string>;

  constructor(config: SwaggerConfiguration, userAgent: string) {
    this.config = config;
    this.headers = config.getHeaders(userAgent);
  }

  /**
   * Core response parsing logic shared between different response handlers.
   * Handles 204 No Content, empty responses, JSON parsing, and text fallbacks.
   * @template T - Expected JSON response data type
   * @template D - Default return type for empty responses
   * @param response - The fetch Response object
   * @param defaultReturn - Default value to return for empty responses
   * @returns Parsed response data or fallback value
   */
  private async parseResponse<T = unknown, D = Record<string, never>>(
    response: Response,
    defaultReturn: D = {} as D,
  ): Promise<T | D | FallbackResponse> {
    // Handle 204 No Content responses
    if (response.status === 204) {
      return defaultReturn;
    }

    // Check if response has content-length of 0 (empty body)
    const contentLength = response.headers.get("content-length");
    if (contentLength === "0") {
      return defaultReturn;
    }

    // Check if response is JSON
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      try {
        return (await response.json()) as T;
      } catch (error) {
        console.warn("Failed to parse JSON response (declared JSON):", error);
        return defaultReturn;
      }
    }

    // Fallback: read text and attempt heuristic JSON parse
    const text = await response.text();
    if (!text) return defaultReturn;
    const trimmed = text.trim();
    const firstChar = trimmed[0];
    if (firstChar === "{" || firstChar === "[") {
      try {
        return JSON.parse(trimmed) as T;
      } catch (error) {
        console.warn("Heuristic JSON parse failed:", error);
        return { message: text };
      }
    }
    return { message: text };
  }

  /**
   * Handles HTTP responses with smart JSON parsing and fallback handling.
   * Includes HTTP error checking before parsing.
   * @template T - Expected response data type
   * @param response - The fetch Response object
   * @param defaultReturn - Default value to return for empty responses
   * @returns Parsed response data or fallback value
   */
  private async handleResponse<T = unknown>(
    response: Response,
    defaultReturn: T | Record<string, never> = {} as T,
  ): Promise<T | FallbackResponse> {
    if (!response.ok) {
      throw new ToolError(`HTTP ${response.status}: ${response.statusText}`);
    }

    return this.parseResponse<T, T | Record<string, never>>(
      response,
      defaultReturn,
    );
  }

  async getPortals(): Promise<PortalsListResponse> {
    const response = await fetch(`${this.config.portalBasePath}/portals`, {
      method: "GET",
      headers: this.headers,
    });
    const result = await this.handleResponse<PortalsListResponse>(
      response,
      [] as unknown as PortalsListResponse,
    );
    return result as PortalsListResponse;
  }

  async getOrganizations(
    params?: OrganizationsQueryParams,
  ): Promise<OrganizationsListResponse> {
    // Build query string if parameters are provided
    const searchParams = new URLSearchParams();
    if (params?.q) searchParams.append("q", params.q);
    if (params?.sortBy) searchParams.append("sortBy", params.sortBy);
    if (params?.order) searchParams.append("order", params.order);
    if (params?.page !== undefined)
      searchParams.append("page", params.page.toString());
    if (params?.pageSize)
      searchParams.append("pageSize", params.pageSize.toString());

    const queryString = searchParams.toString();
    const url = `${this.config.userManagementBasePath}/orgs${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    const defaultResponse: OrganizationsListResponse = {
      items: [],
      totalCount: 0,
      pageSize: 50,
      page: 0,
    };

    const result = await this.handleResponse<OrganizationsListResponse>(
      response,
      defaultResponse,
    );
    return result as OrganizationsListResponse;
  }

  async createPortal(body: CreatePortalArgs): Promise<Portal> {
    const response = await fetch(`${this.config.portalBasePath}/portals`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });
    const result = await this.handleResponse<Portal>(response);
    if (!("id" in (result as any))) {
      throw new Error("Unexpected empty response creating portal");
    }
    return result as Portal;
  }

  async getPortal(portalId: string): Promise<Portal> {
    const response = await fetch(
      `${this.config.portalBasePath}/portals/${portalId}`,
      {
        method: "GET",
        headers: this.headers,
      },
    );
    const result = await this.handleResponse<Portal>(response);
    if (!("id" in (result as any))) {
      throw new ToolError("Portal not found or empty response");
    }
    return result as Portal;
  }

  async updatePortal(
    portalId: string,
    body: UpdatePortalBody,
  ): Promise<Portal | FallbackResponse> {
    const response = await fetch(
      `${this.config.portalBasePath}/portals/${portalId}`,
      {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );

    return this.handleResponse<Portal>(response);
  }

  async getPortalProducts(portalId: string): Promise<ProductsListResponse> {
    const response = await fetch(
      `${this.config.portalBasePath}/portals/${portalId}/products`,
      {
        method: "GET",
        headers: this.headers,
      },
    );
    const result = await this.handleResponse<ProductsListResponse>(
      response,
      [] as unknown as ProductsListResponse,
    );
    return result as ProductsListResponse;
  }

  async createPortalProduct(
    portalId: string,
    body: CreateProductBody,
  ): Promise<Product> {
    const response = await fetch(
      `${this.config.portalBasePath}/portals/${portalId}/products`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );
    const result = await this.handleResponse<Product>(response);
    if (!("id" in (result as any))) {
      throw new Error("Unexpected empty response creating product");
    }
    return result as Product;
  }

  async getPortalProduct(productId: string): Promise<Product> {
    const response = await fetch(
      `${this.config.portalBasePath}/products/${productId}`,
      {
        method: "GET",
        headers: this.headers,
      },
    );
    const result = await this.handleResponse<Product>(response);
    if (!("id" in (result as any))) {
      throw new ToolError("Product not found or empty response");
    }
    return result as Product;
  }

  async deletePortalProduct(
    productId: string,
  ): Promise<Record<string, never> | FallbackResponse> {
    const response = await fetch(
      `${this.config.portalBasePath}/products/${productId}`,
      {
        method: "DELETE",
        headers: this.headers,
      },
    );
    return this.handleResponse(response);
  }

  async updatePortalProduct(
    productId: string,
    body: UpdateProductBody,
  ): Promise<Product | SuccessResponse | FallbackResponse> {
    const response = await fetch(
      `${this.config.portalBasePath}/products/${productId}`,
      {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );
    return this.handleResponse<Product | SuccessResponse>(response, {
      success: true,
    } as SuccessResponse);
  }

  async publishPortalProduct(
    productId: string,
    preview: boolean = false,
  ): Promise<SuccessResponse | FallbackResponse> {
    const response = await fetch(
      `${this.config.portalBasePath}/products/${productId}/published-content?preview=${preview}`,
      {
        method: "PUT",
        headers: this.headers,
      },
    );
    return this.handleResponse<SuccessResponse>(response, {
      success: true,
    } as SuccessResponse);
  }

  async getPortalProductSections(
    productId: string,
    params: Omit<GetProductSectionsArgs, "productId">,
  ): Promise<SectionsListResponse> {
    const queryParameters = new URLSearchParams();

    if (params.embed) {
      for (const item of params.embed) {
        queryParameters.append("embed", item);
      }
    }
    if (params.page !== undefined) {
      queryParameters.append("page", params.page.toString());
    }
    if (params.size !== undefined) {
      queryParameters.append("size", params.size.toString());
    }

    const url = `${this.config.portalBasePath}/products/${productId}/sections${queryParameters.toString() ? `?${queryParameters.toString()}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    const result = await this.handleResponse<SectionsListResponse>(
      response,
      [] as SectionsListResponse,
    );
    return result as SectionsListResponse;
  }

  /**
   * Create a new table of contents item in a portal product section
   * @param sectionId - Section ID where the table of contents item will be created
   * @param body - Table of contents creation parameters
   * @returns Created table of contents item with metadata
   */
  async createTableOfContents(
    sectionId: string,
    body: CreateTableOfContentsBody,
  ): Promise<TableOfContentsItem> {
    const url = `${this.config.portalBasePath}/sections/${sectionId}/table-of-contents`;

    const response = await fetch(url, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API Hub createTableOfContents failed - status: ${response.status} ${response.statusText}. Response: ${errorText}`,
      );
    }

    const result = await response.json();
    return result as TableOfContentsItem;
  }

  /**
   * Get table of contents for a section
   * @param args - Parameters for retrieving table of contents
   * @returns List of table of contents items
   */
  async getTableOfContents(
    args: GetTableOfContentsArgs,
  ): Promise<TableOfContentsListResponse> {
    const { sectionId, embed, page, size } = args;

    const searchParams = new URLSearchParams();
    if (embed) {
      for (const item of embed) {
        searchParams.append("embed", item);
      }
    }
    if (page !== undefined) {
      searchParams.set("page", page.toString());
    }
    if (size !== undefined) {
      searchParams.set("size", size.toString());
    }

    const url = `${this.config.portalBasePath}/sections/${sectionId}/table-of-contents${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API Hub getTableOfContents failed - status: ${response.status} ${response.statusText}. Response: ${errorText}`,
      );
    }

    const result = await response.json();

    // The API returns a paginated response, so we extract the items array
    return result.items as TableOfContentsListResponse;
  }

  /**
   * Get document content and metadata
   * @param args - Parameters for retrieving document
   * @returns Document with content and metadata
   */
  async getDocument(args: GetDocumentArgs): Promise<Document> {
    const { documentId } = args;

    const url = `${this.config.portalBasePath}/documents/${documentId}`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API Hub getDocument failed - status: ${response.status} ${response.statusText}. Response: ${errorText}`,
      );
    }

    const result = await response.json();

    return result as Document;
  }

  /**
   * Update document content
   * @param args - Parameters for updating document
   * @returns Success response
   */
  async updateDocument(args: UpdateDocumentArgs): Promise<SuccessResponse> {
    const { documentId, ...body } = args;

    const url = `${this.config.portalBasePath}/documents/${documentId}`;

    const response = await fetch(url, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API Hub updateDocument failed - status: ${response.status} ${response.statusText}. Response: ${errorText}`,
      );
    }

    return { success: true };
  }

  /**
   * Delete table of contents entry
   * @param args - Parameters for deleting table of contents entry
   * @returns Success response
   */
  async deleteTableOfContents(
    args: DeleteTableOfContentsArgs,
  ): Promise<SuccessResponse> {
    const { tableOfContentsId, recursive } = args;

    const searchParams = new URLSearchParams();
    if (recursive !== undefined) {
      searchParams.set("recursive", recursive.toString());
    }

    const url = `${this.config.portalBasePath}/table-of-contents/${tableOfContentsId}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    const response = await fetch(url, {
      method: "DELETE",
      headers: this.headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `API Hub deleteTableOfContents failed - status: ${response.status} ${response.statusText}. Response: ${errorText}`,
      );
    }

    return { success: true };
  }

  /**
   * Helper method for handling responses when error checking is already done.
   * Delegates to parseResponse for the actual parsing logic.
   * @template T - Expected response data type
   * @template D - Default return type
   * @param response - The fetch Response object
   * @param defaultReturn - Default value to return for empty responses
   * @returns Parsed response data or fallback value
   */

  // Registry API methods for SwaggerHub Design functionality

  /**
   * Search APIs and Domains in SwaggerHub Registry using /specs endpoint
   * @param params Search parameters
   * @returns Array of processed API metadata
   */
  async searchApis(params: ApiSearchParams = {}): Promise<ApiSearchResponse> {
    const searchParams = new URLSearchParams();

    if (params.query) searchParams.append("query", params.query);
    if (params.state) searchParams.append("state", params.state);
    if (params.tag) searchParams.append("tag", params.tag);
    if (params.offset !== undefined)
      searchParams.append("offset", params.offset.toString());
    if (params.limit !== undefined)
      searchParams.append("limit", params.limit.toString());
    if (params.sort) searchParams.append("sort", params.sort);
    if (params.order) searchParams.append("order", params.order);
    if (params.owner) searchParams.append("owner", params.owner);
    if (params.specType) searchParams.append("specType", params.specType);

    const url = `${this.config.registryBasePath}/specs${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    if (!response.ok) {
      throw new ToolError(
        `SwaggerHub Registry API searchApis failed - status: ${response.status} ${response.statusText}`,
      );
    }

    const apisJsonResponse = (await response.json()) as ApisJsonResponse;

    // Transform APIs.json response to our ApiMetadata format
    return this.transformApisJsonToMetadata(apisJsonResponse.apis);
  }

  /**
   * Transform APIs.json specifications to our ApiMetadata format
   * @param specs Array of API specifications from APIs.json
   * @returns Array of processed API metadata
   */
  private transformApisJsonToMetadata(
    specs: ApiSpecification[],
  ): ApiSearchResponse {
    return specs.map((spec) => {
      // Extract useful properties from the properties array
      const properties = spec.properties || [];
      const getProperty = (type: string) => {
        const property = properties.find((p: ApiProperty) => p.type === type);
        return property?.value || property?.url;
      };

      // Extract owner, name, and version from the Swagger URL using the regex constant
      const swaggerUrl = getProperty("Swagger") || "";
      const urlMatch = RegExp(SWAGGER_URL_REGEX).exec(swaggerUrl);

      return {
        owner: urlMatch?.[2] || "",
        name: spec.name || "",
        description: spec.description || "",
        summary: spec.summary || "",
        version: getProperty("X-Version") || urlMatch?.[4] || "",
        specification: getProperty("X-Specification") || "",
        created: getProperty("X-Created"),
        modified: getProperty("X-Modified"),
        published: getProperty("X-Published"),
        private: getProperty("X-Private"),
        oasVersion: getProperty("X-OASVersion"),
        url: swaggerUrl,
      };
    });
  }

  /**
   * Get API definition from SwaggerHub Registry
   * @param params Parameters including owner, api name, version, and options
   * @returns API definition (OpenAPI/Swagger specification)
   */
  async getApiDefinition(params: ApiDefinitionParams): Promise<unknown> {
    const searchParams = new URLSearchParams();

    if (params.resolved !== undefined)
      searchParams.append("resolved", params.resolved.toString());
    if (params.flatten !== undefined)
      searchParams.append("flatten", params.flatten.toString());

    const url = `${this.config.registryBasePath}/apis/${encodeURIComponent(params.owner)}/${encodeURIComponent(params.api)}/${encodeURIComponent(params.version)}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    const response = await fetch(url, {
      method: "GET",
      headers: this.headers,
    });

    if (!response.ok) {
      throw new ToolError(
        `SwaggerHub Registry API getApiDefinition failed - status: ${response.status} ${response.statusText}`,
      );
    }

    // Return the raw API definition (could be JSON or YAML)
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      return response.json();
    } else {
      return response.text();
    }
  }

  /**
   * Create or Update API in SwaggerHub Registry
   * @param params Parameters for creating or updating the API including owner, name, version, specification, and definition
   * @returns Created or updated API metadata with URL. HTTP 201 indicates creation, HTTP 200 indicates update
   */
  async createOrUpdateApi(params: CreateApiParams): Promise<CreateApiResponse> {
    // Determine the format of the definition
    let contentType: string;
    let requestBody: string;

    // Auto-detect format from the definition content
    const format = this.detectDefinitionFormat(params.definition);

    if (format === "yaml") {
      contentType = "application/yaml";
      requestBody = params.definition; // Send YAML as-is
    } else {
      contentType = "application/json";
      // For JSON, parse and stringify to ensure valid JSON
      try {
        const parsedDefinition = JSON.parse(params.definition);
        requestBody = JSON.stringify(parsedDefinition);
      } catch (error) {
        throw new ToolError(
          `Invalid JSON format in definition: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    }

    // Construct the URL with query parameters
    // Fixed values: visibility=private, automock=false, version=1.0.0
    const searchParams = new URLSearchParams();
    searchParams.append("isPrivate", "true");

    const url = `${this.config.registryBasePath}/apis/${encodeURIComponent(
      params.owner,
    )}/${encodeURIComponent(params.apiName)}?${searchParams.toString()}`;

    // Use POST method with the appropriate content type
    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": contentType,
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new ToolError(
        `SwaggerHub Registry API createOrUpdateApi failed - status: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}. URL: ${url}`,
      );
    }

    // Determine operation type based on HTTP status code
    const operation = response.status === 201 ? "create" : "update";

    // Return formatted response with the required fields
    // Fixed version is always 1.0.0
    return {
      owner: params.owner,
      apiName: params.apiName,
      version: "1.0.0",
      url: `https://app.swaggerhub.com/apis/${params.owner}/${params.apiName}/1.0.0`,
      operation,
    };
  }

  /**
   * Create API from Template in SwaggerHub Registry
   * @param params Parameters for creating API from template including owner, api name, and template
   * @returns Created API metadata with URL. HTTP 201 indicates creation, HTTP 200 indicates update
   */
  async createApiFromTemplate(
    params: CreateApiFromTemplateParams,
  ): Promise<CreateApiFromTemplateResponse> {
    // Construct the URL with query parameters
    // Fixed values: visibility=private, no project, noReconcile=false
    const searchParams = new URLSearchParams();
    searchParams.append("isPrivate", "true");
    searchParams.append("template", params.template);

    const url = `${this.config.registryBasePath}/apis/${encodeURIComponent(
      params.owner,
    )}/${encodeURIComponent(params.apiName)}/.template?${searchParams.toString()}`;

    // Use POST method for template creation
    const response = await fetch(url, {
      method: "POST",
      headers: this.headers,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new ToolError(
        `SwaggerHub Registry API createApiFromTemplate failed - status: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}. URL: ${url}`,
      );
    }

    // Determine operation type based on HTTP status code
    const operation = response.status === 201 ? "create" : "update";

    // Return formatted response with the required fields
    return {
      owner: params.owner,
      apiName: params.apiName,
      template: params.template,
      url: `https://app.swaggerhub.com/apis/${params.owner}/${params.apiName}`,
      operation,
    };
  }

  /**
   * Auto-detect the format of an API definition string
   * @param definition The API definition content
   * @returns 'json' or 'yaml'
   */
  private detectDefinitionFormat(definition: string): "json" | "yaml" {
    const trimmed = definition.trim();
    if (!trimmed) {
      throw new ToolError("Empty definition content provided");
    }

    try {
      JSON.parse(trimmed);
      return "json";
    } catch {
      return "yaml";
    }
  }

  /**
   * Run a standardization scan against an API definition
   * @param params Parameters including organization name and API definition
   * @returns Standardization result with validation errors
   */
  async scanStandardization(
    params: ScanStandardizationParams,
  ): Promise<StandardizationResult> {
    // Auto-detect format from the definition content
    const format = this.detectDefinitionFormat(params.definition);

    let contentType: string;
    let requestBody: string;

    if (format === "yaml") {
      contentType = "application/yaml";
      requestBody = params.definition; // Send YAML as-is
    } else {
      contentType = "application/json";
      // For JSON, parse and stringify to ensure valid JSON
      try {
        const parsedDefinition = JSON.parse(params.definition);
        requestBody = JSON.stringify(parsedDefinition);
      } catch (error) {
        throw new Error(
          `Invalid JSON format in definition: ${
            error instanceof Error ? error.message : "Unknown error"
          }`,
        );
      }
    }

    const url = `${this.config.registryBasePath}/standardization/${encodeURIComponent(
      params.orgName,
    )}/scan`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        ...this.headers,
        "Content-Type": contentType,
      },
      body: requestBody,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `SwaggerHub Registry API scanStandardization failed - status: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}. URL: ${url}`,
      );
    }

    return await this.handleResponse<StandardizationResult>(response);
  }
}
