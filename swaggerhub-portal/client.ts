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

// Tool definitions for SwaggerHub Portal API client
export class SwaggerHubClient implements Client {
  private headers: { "Authorization": string; "Content-Type": string };

  constructor(token: string) {
    this.headers = {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    };
  }

  async getSwaggerHubPortals(): Promise<any> {
    const response = await fetch("https://api.portal.swaggerhub.com/v1/portals", {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async createSwaggerHubPortal(body: createPortalArgs): Promise<any> {
    const response = await fetch(`https://api.portal.swaggerhub.com/v1/portals`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );

    return response.json();
  }

  async getSwaggerHubPortal(portalId: string): Promise<any> {
    const response = await fetch(`https://api.portal.swaggerhub.com/v1/portals/${portalId}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async deleteSwaggerHubPortal(portalId: string): Promise<any> {
    await fetch(`https://api.portal.swaggerhub.com/v1/portals/${portalId}`, {
      method: "DELETE",
      headers: this.headers,
    });
  }

  async updateSwaggerHubPortal(portalId: string, body: updatePortalArgs): Promise<any> {
    const response = await fetch(`https://api.portal.swaggerhub.com/v1/portals/${portalId}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  async getSwaggerHubProducts(portalId: string): Promise<any> {
    const response = await fetch(`https://api.portal.swaggerhub.com/v1/portals/${portalId}/products`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async createSwaggerHubProduct(portalId: string, body: createProductArgs): Promise<any> {
    const response = await fetch(`https://api.portal.swaggerhub.com/v1/portals/${portalId}/products`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );

    return response.json();
  }

  async getSwaggerHubProduct(productId: string): Promise<any> {
    const response = await fetch(`https://api.portal.swaggerhub.com/v1/portals/${productId}`, {
      method: "GET",
      headers: this.headers,
    });

    return response.json();
  }

  async deleteSwaggerHubProduct(productId: string): Promise<any> {
    await fetch(`https://api.portal.swaggerhub.com/v1/portals/${productId}`, {
      method: "DELETE",
      headers: this.headers,
    });
  }

  async updateSwaggerHubProduct(productId: string, body: updateProductArgs): Promise<any> {
    const response = await fetch(`https://api.portal.swaggerhub.com/v1/portals/${productId}`, {
      method: "PATCH",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    return response.json();
  }

  registerTools(server: McpServer): void {
    server.tool(
      "list_swaggerhub_portals",
      "Search for available portals. Results are returned only for portals where you have a designer role, either at the product level or organization level.",
      {},
      async (_args, _extra) => {
        const response = await this.getSwaggerHubPortals();
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    server.tool(
      "create_swaggerhub_portal",
      "Create a new portal.",
      { 
        name: z.string().optional().describe("The portal name."), 
        subdomain: z.string().describe("The portal subdomain."), 
        offline: z.boolean().optional().describe("If set to true the portal will not be visible to customers."),
        routing: z.string().optional().describe("Determines the routing strategy ('browser' or 'proxy')."),
        credentialsEnabled: z.string().optional().describe("Indicates if credentials are enabled for the portal."),
        swaggerHubOrganizationId: z.string().describe("The corresponding SwaggerHub organization UUID."),
        openapiRenderer: z.string().optional().describe("Portal level setting for the OpenAPI renderer. SWAGGER_UI - Use the Swagger UI renderer. ELEMENTS - Use the Elements renderer. TOGGLE - Switch between the two renderers with elements set as the default."),
        pageContentFormat: z.string().optional().describe("The format of the page content.")
      },
      async (args: createPortalArgs, _extra) => {
        const response = await this.createSwaggerHubPortal(args);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    server.tool(
      "get_swaggerhub_portal",
      "Retrieve information about a portal.",
      { portalId: z.string().describe("Portal UUID or subdomain.") },
      async (args: portalArgs, _extra) => {
        const response = await this.getSwaggerHubPortal(args.portalId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    server.tool(
      "delete_swaggerhub_portal",
      "Delete a portal.",
      { portalId: z.string().describe("Portal UUID or subdomain.") },
      async (args: portalArgs, _extra) => {
        await this.deleteSwaggerHubPortal(args.portalId);
        return {
          content: [{ type: "text", text: "Portal deleted successfully." }],
        };
      },
    );
    server.tool(
      "update_swaggerhub_portal",
      "Update a portal.",
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
        const response = await this.updateSwaggerHubPortal(args.portalId, args);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    server.tool(
      "list_swaggerhub_products",
      "Get products for a specific portal that match your criteria.",
      { portalId: z.string().describe("Portal UUID or subdomain.") },
      async (args: portalArgs, _extra) => {
        const response = await this.getSwaggerHubProducts(args.portalId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    server.tool(
      "create_swaggerhub_product",
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
        const response = await this.createSwaggerHubProduct(args.portalId, args);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    server.tool(
      "get_swaggerhub_product",
      "Retrieve information about a specific product resource.",
      { productId: z.string().describe("Product UUID, or identifier in the format.") },
      async (args: productArgs, _extra) => {
        const response = await this.getSwaggerHubProduct(args.productId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    server.tool(
      "delete_swaggerhub_product",
      "Delete a specific product resource.",
      { productId: z.string().describe("Product UUID, or identifier in the format.") },
      async (args: productArgs, _extra) => {
        await this.deleteSwaggerHubProduct(args.productId);
        return {
          content: [{ type: "text", text: "Product deleted successfully." }],
        };
      },
    );
    server.tool(
      "update_swaggerhub_product",
      "Update a specific product resource.",
      {
        productId: z.string().describe("Product UUID, or identifier in the format."),
        name: z.string().optional().describe("Product name."),
        slug: z.string().optional().describe("URL component for this product. Must be unique within the portal."),
        description: z.string().optional().describe("Product description."),
        public: z.boolean().optional().describe("Indicates if the product is public."),
        hidden: z.string().optional().describe("Indicates if the product is hidden.")
      },
      async (args: updateProductArgs, _extra) => {
        const response = await this.updateSwaggerHubProduct(args.productId, args);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
  }
}