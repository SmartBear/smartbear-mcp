import type { ApiHubConfiguration } from "./configuration.js";
import type {
  CreatePortalArgs,
  CreateProductBody,
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
   * Handles HTTP responses with smart JSON parsing and fallback handling.
   * Supports 204 No Content, empty responses, and non-JSON content.
   */
  private async handleResponse(
    response: Response,
    defaultReturn: any = {},
  ): Promise<any> {
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

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
        return await response.json();
      } catch (error) {
        console.warn("Failed to parse JSON response:", error);
        return defaultReturn;
      }
    }

    // Fallback for non-JSON responses
    const text = await response.text();
    return text ? { message: text } : defaultReturn;
  }

  async getPortals(): Promise<any> {
    const response = await fetch(`${this.config.basePath}/portals`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async createPortal(body: CreatePortalArgs): Promise<any> {
    const response = await fetch(`${this.config.basePath}/portals`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async getPortal(portalId: string): Promise<any> {
    const response = await fetch(
      `${this.config.basePath}/portals/${portalId}`,
      {
        method: "GET",
        headers: this.headers,
      },
    );

    return response.json();
  }

  async deletePortal(portalId: string): Promise<any> {
    await fetch(`${this.config.basePath}/portals/${portalId}`, {
      method: "DELETE",
      headers: this.headers,
    });
  }

  async updatePortal(portalId: string, body: UpdatePortalBody): Promise<any> {
    const response = await fetch(
      `${this.config.basePath}/portals/${portalId}`,
      {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );

    return this.handleResponse(response);
  }

  async getPortalProducts(portalId: string): Promise<any> {
    const response = await fetch(
      `${this.config.basePath}/portals/${portalId}/products`,
      {
        method: "GET",
        headers: this.headers,
      },
    );

    return response.json();
  }

  async createPortalProduct(
    portalId: string,
    body: CreateProductBody,
  ): Promise<any> {
    const response = await fetch(
      `${this.config.basePath}/portals/${portalId}/products`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );

    return response.json();
  }

  async getPortalProduct(productId: string): Promise<any> {
    const response = await fetch(
      `${this.config.basePath}/products/${productId}`,
      {
        method: "GET",
        headers: this.headers,
      },
    );

    return response.json();
  }

  async deletePortalProduct(productId: string): Promise<any> {
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
  ): Promise<any> {
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
    return this.handleResponseWithoutErrorCheck(response, { success: true });
  }

  /**
   * Helper method for handling responses when error checking is already done
   */
  private async handleResponseWithoutErrorCheck(
    response: Response,
    defaultReturn: any = {},
  ): Promise<any> {
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
        return await response.json();
      } catch (error) {
        console.warn("Failed to parse JSON response:", error);
        return defaultReturn;
      }
    }

    // Fallback for non-JSON responses
    const text = await response.text();
    return text ? { message: text } : defaultReturn;
  }
}
