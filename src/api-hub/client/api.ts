import { ApiHubConfiguration } from "./configuration.js";
import {
  CreatePortalArgs,
  UpdatePortalArgs,
  CreateProductArgs,
  UpdateProductArgs
} from "./types.js";

export class ApiHubAPI {
  private config: ApiHubConfiguration;
  private headers: Record<string, string>;

  constructor(config: ApiHubConfiguration, userAgent: string) {
    this.config = config;
    this.headers = config.getHeaders(userAgent);
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
    const response = await fetch(`${this.config.basePath}/portals/${portalId}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async deletePortal(portalId: string): Promise<any> {
    await fetch(`${this.config.basePath}/portals/${portalId}`, {
      method: "DELETE",
      headers: this.headers,
    });
  }

  async updatePortal(portalId: string, body: UpdatePortalArgs): Promise<any> {
    const response = await fetch(`${this.config.basePath}/portals/${portalId}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async getPortalProducts(portalId: string): Promise<any> {
    const response = await fetch(`${this.config.basePath}/portals/${portalId}/products`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async createPortalProduct(portalId: string, body: CreateProductArgs): Promise<any> {
    const response = await fetch(`${this.config.basePath}/portals/${portalId}/products`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async getPortalProduct(productId: string): Promise<any> {
    const response = await fetch(`${this.config.basePath}/products/${productId}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async deletePortalProduct(productId: string): Promise<any> {
    await fetch(`${this.config.basePath}/products/${productId}`, {
      method: "DELETE",
      headers: this.headers,
    });
  }

  async updatePortalProduct(productId: string, body: UpdateProductArgs): Promise<any> {
    const response = await fetch(`${this.config.basePath}/products/${productId}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }
}