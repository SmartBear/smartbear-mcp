import type { ApiHubConfiguration } from "./configuration.js";
import type {
  ApiDefinitionParams,
  ApiProperty,
  ApiSearchParams,
  ApiSearchResponse,
  ApiSpecification,
  ApisJsonResponse,
  CreatePortalArgs,
  CreateProductBody,
  FallbackResponse,
  Portal,
  PortalsListResponse,
  Product,
  ProductsListResponse,
  SuccessResponse,
  UpdatePortalBody,
  UpdateProductBody,
} from "./types.js";

export class ApiHubAPI {
  private config: ApiHubConfiguration;
  private headers: Record<string, string>;

  constructor(config: ApiHubConfiguration, userAgent: string) {
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
        const jsonData = (await response.json()) as T;
        return jsonData;
      } catch (error) {
        console.warn("Failed to parse JSON response:", error);
        return defaultReturn;
      }
    }

    // Fallback for non-JSON responses
    const text = await response.text();
    return text ? { message: text } : defaultReturn;
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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
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

    return response.json() as Promise<PortalsListResponse>;
  }

  async createPortal(body: CreatePortalArgs): Promise<Portal> {
    const response = await fetch(`${this.config.portalBasePath}/portals`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json() as Promise<Portal>;
  }

  async getPortal(portalId: string): Promise<Portal> {
    const response = await fetch(
      `${this.config.portalBasePath}/portals/${portalId}`,
      {
        method: "GET",
        headers: this.headers,
      },
    );

    return response.json() as Promise<Portal>;
  }

  async deletePortal(portalId: string): Promise<void> {
    await fetch(`${this.config.portalBasePath}/portals/${portalId}`, {
      method: "DELETE",
      headers: this.headers,
    });
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

    return response.json() as Promise<ProductsListResponse>;
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

    return response.json() as Promise<Product>;
  }

  async getPortalProduct(productId: string): Promise<Product> {
    const response = await fetch(
      `${this.config.portalBasePath}/products/${productId}`,
      {
        method: "GET",
        headers: this.headers,
      },
    );

    return response.json() as Promise<Product>;
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

    // Custom error handling for updatePortalProduct
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new Error(
        `API Hub updatePortalProduct failed - status: ${response.status} ${response.statusText}${
          errorText ? ` - ${errorText}` : ""
        }`,
      );
    }

    // Use handleResponse but with custom default return value
    return this.handleResponseWithoutErrorCheck<Product, SuccessResponse>(
      response,
      { success: true },
    );
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
  private async handleResponseWithoutErrorCheck<
    T = unknown,
    D = Record<string, never>,
  >(
    response: Response,
    defaultReturn: D = {} as D,
  ): Promise<T | D | FallbackResponse> {
    return this.parseResponse<T, D>(response, defaultReturn);
  }

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
      throw new Error(
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

      // Extract owner and API name from the Swagger URL
      const swaggerUrl = getProperty("Swagger") || "";
      const urlMatch = swaggerUrl.match(/\/apis\/([^/]+)\/([^/]+)\/([^/]+)/);

      return {
        owner: urlMatch?.[1] || "",
        name: spec.name || "",
        description: spec.description || "",
        summary: spec.summary || "",
        version: getProperty("X-Version") || urlMatch?.[3] || "",
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
      throw new Error(
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
}
