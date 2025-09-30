import type { ApiHubConfiguration } from "./configuration";
import type {
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
} from "./types";

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
    const response = await fetch(`${this.config.basePath}/portals`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json() as Promise<PortalsListResponse>;
  }

  async createPortal(body: CreatePortalArgs): Promise<Portal> {
    const response = await fetch(`${this.config.basePath}/portals`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json() as Promise<Portal>;
  }

  async getPortal(portalId: string): Promise<Portal> {
    const response = await fetch(
      `${this.config.basePath}/portals/${portalId}`,
      {
        method: "GET",
        headers: this.headers,
      },
    );

    return response.json() as Promise<Portal>;
  }

  async deletePortal(portalId: string): Promise<void> {
    await fetch(`${this.config.basePath}/portals/${portalId}`, {
      method: "DELETE",
      headers: this.headers,
    });
  }

  async updatePortal(
    portalId: string,
    body: UpdatePortalBody,
  ): Promise<Portal | FallbackResponse> {
    const response = await fetch(
      `${this.config.basePath}/portals/${portalId}`,
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
      `${this.config.basePath}/portals/${portalId}/products`,
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
      `${this.config.basePath}/portals/${portalId}/products`,
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
      `${this.config.basePath}/products/${productId}`,
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
      `${this.config.basePath}/products/${productId}`,
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
      `${this.config.basePath}/products/${productId}`,
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
}
