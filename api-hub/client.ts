import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "../common/types.js";

// Type definitions for tool arguments
export interface portalArgs {
  portalId: string;
}

export interface productArgs {
  productId: string;
}

export interface createPortalArgs {
  name?: string;
  subdomain: string;
  offline?: boolean;
  routing?: string;
  credentialsEnabled?: string;
  swaggerHubOrganizationId: string;
  openapiRenderer?: string;
  pageContentFormat?: string
}

export interface updatePortalArgs extends portalArgs {
  name?: string;
  subdomain?: string;
  customDomain?: boolean;
  gtmKey?: string;
  offline?: boolean;
  routing?: string;
  credentialsEnabled?: boolean;
  openapiRenderer?: string;
  pageContentFormat?: string;
}

export interface createProductArgs extends portalArgs {
  type: string;
  name: string;
  slug: string;
  description?: string;
  public?: boolean;
  hidden?: string;
  role?: boolean;
}

export interface updateProductArgs extends productArgs {
  name?: string;
  slug?: string;
  description?: string;
  public?: boolean;
  hidden?: string;
}

// Tool definitions for API Hub API client
export class ApiHubClient implements Client {
  private headers: { "Authorization": string; "Content-Type": string };

  constructor(token: string) {
    this.headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async getPortals(): Promise<any> {
    const response = await fetch("https://api.portal.swaggerhub.com/v1/portals", {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async createPortal(body: createPortalArgs): Promise<any> {
    const response = await fetch(`https://api.portal.swaggerhub.com/v1/portals`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );

    return response.json();
  }

  async getPortal(portalId: string): Promise<any> {
    const response = await fetch(`https://api.portal.swaggerhub.com/v1/portals/${portalId}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async deletePortal(portalId: string): Promise<any> {
    await fetch(`https://api.portal.swaggerhub.com/v1/portals/${portalId}`, {
      method: "DELETE",
      headers: this.headers,
    });
  }

  async updatePortal(portalId: string, body: updatePortalArgs): Promise<any> {
    const response = await fetch(`https://api.portal.swaggerhub.com/v1/portals/${portalId}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async getPortalProducts(portalId: string): Promise<any> {
    const response = await fetch(`https://api.portal.swaggerhub.com/v1/portals/${portalId}/products`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async createPortalProduct(portalId: string, body: createProductArgs): Promise<any> {
    const response = await fetch(`https://api.portal.swaggerhub.com/v1/portals/${portalId}/products`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );

    return response.json();
  }

  async getPortalProduct(productId: string): Promise<any> {
    const response = await fetch(`https://api.portal.swaggerhub.com/v1/products/${productId}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async deletePortalProduct(productId: string): Promise<any> {
    await fetch(`https://api.portal.swaggerhub.com/v1/products/${productId}`, {
      method: "DELETE",
      headers: this.headers,
    });
  }

  async updatePortalProduct(productId: string, body: updateProductArgs): Promise<any> {
    const response = await fetch(`https://api.portal.swaggerhub.com/v1/products/${productId}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  registerTools(server: McpServer): void {
    server.tool(
      "list_portals",
      "Search for available portals within API Hub. Only portals where you have at least a designer role, either at the product level or organization level, are returned.",
      {},
      async (_args, _extra) => {
        const response = await this.getPortals();
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    server.tool(
      "create_portal",
      "Create a new portal within API Hub.",
      { 
        name: z.string().optional().describe("The portal name."), 
        subdomain: z.string().describe("The portal subdomain."), 
        offline: z.boolean().optional().describe("If set to true the portal will not be visible to customers."),
        routing: z.string().optional().describe("Determines the routing strategy ('browser' or 'proxy')."),
        credentialsEnabled: z.string().optional().describe("Indicates if credentials are enabled for the portal."),
        swaggerHubOrganizationId: z.string().describe("The corresponding API Hub (formerly SwaggerHub) organization UUID."),
        openapiRenderer: z.string().optional().describe("Portal level setting for the OpenAPI renderer. SWAGGER_UI - Use the Swagger UI renderer. ELEMENTS - Use the Elements renderer. TOGGLE - Switch between the two renderers with elements set as the default."),
        pageContentFormat: z.string().optional().describe("The format of the page content.")
      },
      async (args: createPortalArgs, _extra) => {
        const response = await this.createPortal(args);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    server.tool(
      "get_portal",
      "Retrieve information about a specific portal.",
      { portalId: z.string().describe("Portal UUID or subdomain.") },
      async (args: portalArgs, _extra) => {
        const response = await this.getPortal(args.portalId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    server.tool(
      "delete_portal",
      "Delete a portal.",
      { portalId: z.string().describe("Portal UUID or subdomain.") },
      async (args: portalArgs, _extra) => {
        await this.deletePortal(args.portalId);
        return {
          content: [{ type: "text", text: "Portal deleted successfully." }],
        };
      },
    );
    server.tool(
      "update_portal",
      "Update a specific portal's configuration",
      {
        portalId: z.string().describe("Portal UUID or subdomain."),
        name: z.string().optional().describe("The portal name."),
        subdomain: z.string().optional().describe("The portal subdomain."),
        customDomain: z.boolean().optional().describe("Indicates if the portal has a custom domain."),
        gtmKey: z.string().optional().describe("Google Tag Manager key for the portal."),
        offline: z.boolean().optional().describe("If set to true the portal will not be visible to customers."),
        routing: z.string().optional().describe("Determines the routing strategy ('browser' or 'proxy')."),
        credentialsEnabled: z.boolean().optional().describe("Indicates if credentials are enabled for the portal."),
        openapiRenderer: z.string().optional().describe("Portal level setting for the OpenAPI renderer. SWAGGER_UI - Use the Swagger UI renderer. ELEMENTS - Use the Elements renderer. TOGGLE - Switch between the two renderers with elements set as the default."),
        pageContentFormat: z.string().optional().describe("The format of the page content.")
      },
      async (args: updatePortalArgs, _extra) => {
        const response = await this.updatePortal(args.portalId, args);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    server.tool(
      "list_portal_products",
      "Get products for a specific portal that match your criteria.",
      { portalId: z.string().describe("Portal UUID or subdomain.") },
      async (args: portalArgs, _extra) => {
        const response = await this.getPortalProducts(args.portalId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    server.tool(
      "create_portal_product",
      "Create a new product for a specific portal.",
      {
        portalId: z.string().describe("Portal UUID or subdomain."),
        type: z.string().describe("Product type (Allowed values: 'new', 'copy')."),
        name: z.string().describe("Product name."),
        slug: z.string().describe("URL component for this product. Must be unique within the portal."),
        description: z.string().optional().describe("Product description."),
        public: z.boolean().optional().describe("Indicates if the product is public."),
        hidden: z.string().optional().describe("Indicates if the product is hidden."),
        role: z.boolean().optional().describe("Indicates if the product has a role.")
      },
      async (args: createProductArgs, _extra) => {
        const response = await this.createPortalProduct(args.portalId, args);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    server.tool(
      "get_portal_product",
      "Retrieve information about a specific product resource.",
      { productId: z.string().describe("Product UUID, or identifier in the format.") },
      async (args: productArgs, _extra) => {
        const response = await this.getPortalProduct(args.productId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    server.tool(
      "delete_portal_product",
      "Delete a product from a specific portal",
      { productId: z.string().describe("Product UUID, or identifier in the format.") },
      async (args: productArgs, _extra) => {
        await this.deletePortalProduct(args.productId);
        return {
          content: [{ type: "text", text: "Product deleted successfully." }],
        };
      },
    );
    server.tool(
      "update_portal_product",
      "Update a product's settings within a specific portal.",
      {
        productId: z.string().describe("Product UUID, or identifier in the format."),
        name: z.string().optional().describe("Product name."),
        slug: z.string().optional().describe("URL component for this product. Must be unique within the portal."),
        description: z.string().optional().describe("Product description."),
        public: z.boolean().optional().describe("Indicates if the product is public."),
        hidden: z.string().optional().describe("Indicates if the product is hidden.")
      },
      async (args: updateProductArgs, _extra) => {
        const response = await this.updatePortalProduct(args.productId, args);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
  }
}