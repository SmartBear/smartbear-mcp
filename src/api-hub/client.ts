import { z } from "zod";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import type {
  Client,
  GetInputFunction,
  RegisterToolsFunction,
} from "../common/types.js";

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
  pageContentFormat?: string;
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
  private headers: {
    Authorization: string;
    "Content-Type": string;
    "User-Agent": string;
  };

  name = "API Hub";
  prefix = "api_hub";

  constructor(token: string) {
    this.headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
    };
  }

  async getPortals(): Promise<any> {
    const response = await fetch(
      "https://api.portal.swaggerhub.com/v1/portals",
      {
        method: "GET",
        headers: this.headers,
      },
    );

    return response.json();
  }

  async createPortal(body: createPortalArgs): Promise<any> {
    const response = await fetch(
      `https://api.portal.swaggerhub.com/v1/portals`,
      {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );

    return response.json();
  }

  async getPortal(portalId: string): Promise<any> {
    const response = await fetch(
      `https://api.portal.swaggerhub.com/v1/portals/${portalId}`,
      {
        method: "GET",
        headers: this.headers,
      },
    );

    return response.json();
  }

  async deletePortal(portalId: string): Promise<any> {
    await fetch(`https://api.portal.swaggerhub.com/v1/portals/${portalId}`, {
      method: "DELETE",
      headers: this.headers,
    });
  }

  async updatePortal(portalId: string, body: updatePortalArgs): Promise<any> {
    const response = await fetch(
      `https://api.portal.swaggerhub.com/v1/portals/${portalId}`,
      {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );

    return response.json();
  }

  async getPortalProducts(portalId: string): Promise<any> {
    const response = await fetch(
      `https://api.portal.swaggerhub.com/v1/portals/${portalId}/products`,
      {
        method: "GET",
        headers: this.headers,
      },
    );

    return response.json();
  }

  async createPortalProduct(
    portalId: string,
    body: createProductArgs,
  ): Promise<any> {
    const response = await fetch(
      `https://api.portal.swaggerhub.com/v1/portals/${portalId}/products`,
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
      `https://api.portal.swaggerhub.com/v1/products/${productId}`,
      {
        method: "GET",
        headers: this.headers,
      },
    );

    return response.json();
  }

  async deletePortalProduct(productId: string): Promise<any> {
    await fetch(`https://api.portal.swaggerhub.com/v1/products/${productId}`, {
      method: "DELETE",
      headers: this.headers,
    });
  }

  async updatePortalProduct(
    productId: string,
    body: updateProductArgs,
  ): Promise<any> {
    const response = await fetch(
      `https://api.portal.swaggerhub.com/v1/products/${productId}`,
      {
        method: "PATCH",
        headers: this.headers,
        body: JSON.stringify(body),
      },
    );

    return response.json();
  }

  registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): void {
    register(
      {
        title: "List Portals",
        summary:
          "Search for available portals within API Hub. Only portals where you have at least a designer role, either at the product level or organization level, are returned.",
        parameters: [],
      },
      async (_args, _extra) => {
        const response = await this.getPortals();
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    register(
      {
        title: "Create Portal",
        summary: "Create a new portal within API Hub.",
        parameters: [
          {
            name: "name",
            type: z.string(),
            required: false,
            description: "The portal name.",
          },
          {
            name: "subdomain",
            type: z.string(),
            required: true,
            description: "The portal subdomain.",
          },
          {
            name: "offline",
            type: z.boolean(),
            required: false,
            description:
              "If set to true the portal will not be visible to customers.",
          },
          {
            name: "routing",
            type: z.string(),
            required: false,
            description:
              "Determines the routing strategy ('browser' or 'proxy').",
          },
          {
            name: "credentialsEnabled",
            type: z.string(),
            required: false,
            description: "Indicates if credentials are enabled for the portal.",
          },
          {
            name: "swaggerHubOrganizationId",
            type: z.string(),
            required: true,
            description:
              "The corresponding API Hub (formerly SwaggerHub) organization UUID.",
          },
          {
            name: "openapiRenderer",
            type: z.string(),
            required: false,
            description:
              "Portal level setting for the OpenAPI renderer. SWAGGER_UI - Use the Swagger UI renderer. ELEMENTS - Use the Elements renderer. TOGGLE - Switch between the two renderers with elements set as the default.",
          },
          {
            name: "pageContentFormat",
            type: z.string(),
            required: false,
            description: "The format of the page content.",
          },
        ],
      },
      async (args, _extra) => {
        const createPortalArgs = args as createPortalArgs;
        const response = await this.createPortal(createPortalArgs);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    register(
      {
        title: "Get Portal",
        summary: "Retrieve information about a specific portal.",
        parameters: [
          {
            name: "portalId",
            type: z.string(),
            description: "Portal UUID or subdomain.",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        const portalArgs = args as portalArgs;
        const response = await this.getPortal(portalArgs.portalId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    register(
      {
        title: "Delete Portal",
        summary: "Delete a specific portal.",
        parameters: [
          {
            name: "portalId",
            type: z.string(),
            description: "Portal UUID or subdomain.",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        const portalArgs = args as portalArgs;
        await this.deletePortal(portalArgs.portalId);
        return {
          content: [{ type: "text", text: "Portal deleted successfully." }],
        };
      },
    );
    register(
      {
        title: "Update Portal",
        summary: "Update a specific portal's configuration.",
        parameters: [
          {
            name: "portalId",
            type: z.string(),
            description: "Portal UUID or subdomain.",
            required: true,
          },
          {
            name: "name",
            type: z.string(),
            description: "The portal name.",
            required: false,
          },
          {
            name: "subdomain",
            type: z.string(),
            description: "The portal subdomain.",
            required: false,
          },
          {
            name: "customDomain",
            type: z.boolean(),
            description: "Indicates if the portal has a custom domain.",
            required: false,
          },
          {
            name: "gtmKey",
            type: z.string(),
            description: "Google Tag Manager key for the portal.",
            required: false,
          },
          {
            name: "offline",
            type: z.boolean(),
            description:
              "If set to true the portal will not be visible to customers.",
            required: false,
          },
          {
            name: "routing",
            type: z.string(),
            description:
              "Determines the routing strategy ('browser' or 'proxy').",
            required: false,
          },
          {
            name: "credentialsEnabled",
            type: z.boolean(),
            description: "Indicates if credentials are enabled for the portal.",
            required: false,
          },
          {
            name: "openapiRenderer",
            type: z.string(),
            description:
              "Portal level setting for the OpenAPI renderer. SWAGGER_UI - Use the Swagger UI renderer. ELEMENTS - Use the Elements renderer. TOGGLE - Switch between the two renderers with elements set as the default.",
            required: false,
          },
          {
            name: "pageContentFormat",
            type: z.string(),
            description: "The format of the page content.",
            required: false,
          },
        ],
      },
      async (args, _extra) => {
        const updatePortalArgs = args as updatePortalArgs;
        const response = await this.updatePortal(
          updatePortalArgs.portalId,
          updatePortalArgs,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    register(
      {
        title: "List Portal Products",
        summary: "Get products for a specific portal that match your criteria.",
        parameters: [
          {
            name: "portalId",
            type: z.string(),
            description: "Portal UUID or subdomain.",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        const portalArgs = args as portalArgs;
        const response = await this.getPortalProducts(portalArgs.portalId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    register(
      {
        title: "Create Portal Product",
        summary: "Create a new product for a specific portal.",
        parameters: [
          {
            name: "portalId",
            type: z.string(),
            description: "Portal UUID or subdomain.",
            required: true,
          },
          {
            name: "type",
            type: z.string(),
            description: "Product type (Allowed values: 'new', 'copy').",
            required: true,
          },
          {
            name: "name",
            type: z.string(),
            description: "Product name.",
            required: true,
          },
          {
            name: "slug",
            type: z.string(),
            description:
              "URL component for this product. Must be unique within the portal.",
            required: true,
          },
          {
            name: "description",
            type: z.string(),
            description: "Product description.",
            required: false,
          },
          {
            name: "public",
            type: z.boolean(),
            description: "Indicates if the product is public.",
            required: false,
          },
          {
            name: "hidden",
            type: z.string(),
            description: "Indicates if the product is hidden.",
            required: false,
          },
          {
            name: "role",
            type: z.boolean(),
            description: "Indicates if the product has a role.",
            required: false,
          },
        ],
      },
      async (args, _extra) => {
        const createProductArgs = args as createProductArgs;
        const response = await this.createPortalProduct(
          createProductArgs.portalId,
          createProductArgs,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    register(
      {
        title: "Get Portal Product",
        summary: "Retrieve information about a specific product resource.",
        parameters: [
          {
            name: "productId",
            type: z.string(),
            description: "Product UUID, or identifier in the format.",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        const productArgs = args as productArgs;
        const response = await this.getPortalProduct(productArgs.productId);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
    register(
      {
        title: "Delete Portal Product",
        summary: "Delete a product from a specific portal",
        parameters: [
          {
            name: "productId",
            type: z.string(),
            description: "Product UUID, or identifier in the format.",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        const productArgs = args as productArgs;
        await this.deletePortalProduct(productArgs.productId);
        return {
          content: [{ type: "text", text: "Product deleted successfully." }],
        };
      },
    );
    register(
      {
        title: "Update Portal Product",
        summary: "Update a product's settings within a specific portal.",
        parameters: [
          {
            name: "productId",
            type: z.string(),
            description: "Product UUID, or identifier in the format.",
            required: true,
          },
          {
            name: "name",
            type: z.string(),
            description: "Product name.",
            required: false,
          },
          {
            name: "slug",
            type: z.string(),
            description:
              "URL component for this product. Must be unique within the portal.",
            required: false,
          },
          {
            name: "description",
            type: z.string(),
            description: "Product description.",
            required: false,
          },
          {
            name: "public",
            type: z.boolean(),
            description: "Indicates if the product is public.",
            required: false,
          },
          {
            name: "hidden",
            type: z.string(),
            description: "Indicates if the product is hidden.",
            required: false,
          },
        ],
      },
      async (args, _extra) => {
        const updateProductArgs = args as updateProductArgs;
        const response = await this.updatePortalProduct(
          updateProductArgs.productId,
          updateProductArgs,
        );
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
  }
}
