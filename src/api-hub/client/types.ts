import { z } from "zod";

// Type definitions for tool arguments
export interface PortalArgs {
  portalId: string;
}

export interface ProductArgs {
  productId: string;
}

export interface CreatePortalArgs {
  name?: string;
  subdomain: string;
  offline?: boolean;
  routing?: string;
  credentialsEnabled?: boolean;
  swaggerHubOrganizationId: string;
  openapiRenderer?: string;
  pageContentFormat?: string;
}

export interface UpdatePortalArgs extends PortalArgs {
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

export interface CreateProductArgs extends PortalArgs {
  type: string;
  name: string;
  slug: string;
  description?: string;
  public?: boolean;
  hidden?: boolean;
  role?: boolean;
}

export interface UpdateProductArgs extends ProductArgs {
  name?: string;
  slug?: string;
  description?: string;
  public?: boolean;
  hidden?: boolean;
}

// API body types (without IDs - IDs are passed in URL path)
export type UpdatePortalBody = Omit<UpdatePortalArgs, "portalId">;
export type CreateProductBody = Omit<CreateProductArgs, "portalId">;
export type UpdateProductBody = Omit<UpdateProductArgs, "productId">;

// Zod schemas for validation
export const PortalArgsSchema = z.object({
  portalId: z
    .string()
    .describe(
      "Portal UUID or subdomain - unique identifier for the portal instance",
    ),
});

export const ProductArgsSchema = z.object({
  productId: z
    .string()
    .describe(
      "Product UUID or identifier in the format 'portal-subdomain:product-slug' - unique identifier for the product",
    ),
});

export const CreatePortalArgsSchema = z.object({
  name: z
    .string()
    .optional()
    .describe(
      "The display name for the portal - shown to users and in branding (3-40 characters)",
    ),
  subdomain: z
    .string()
    .describe(
      "The portal subdomain - used in the portal URL (e.g., 'myportal' for myportal.example.com). Must be unique, lowercase, 3-20 characters, alphanumeric with hyphens",
    ),
  offline: z
    .boolean()
    .optional()
    .describe(
      "If true, the portal will not be visible to customers - useful for development/staging environments. Defaults to false",
    ),
  routing: z
    .string()
    .optional()
    .describe(
      "Routing strategy for the portal - either 'browser' (client-side routing) or 'proxy' (server-side routing). Defaults to 'browser'",
    ),
  credentialsEnabled: z
    .boolean()
    .optional()
    .describe(
      "Whether authentication credentials are enabled for accessing the portal. When true, users can authenticate to access private content. Defaults to true",
    ),
  swaggerHubOrganizationId: z
    .string()
    .describe(
      "The corresponding SwaggerHub organization UUID - required for portal creation. This links the portal to your SwaggerHub organization",
    ),
  openapiRenderer: z
    .string()
    .optional()
    .describe(
      "OpenAPI renderer type: 'SWAGGER_UI' (Swagger UI), 'ELEMENTS' (Stoplight Elements), or 'TOGGLE' (allows switching between both with Elements as default). Defaults to 'TOGGLE'",
    ),
  pageContentFormat: z
    .string()
    .optional()
    .describe(
      "Format for page content rendering - determines how documentation pages are processed: 'HTML', 'MARKDOWN', or 'BOTH'. Defaults to 'HTML'",
    ),
});

export const UpdatePortalArgsSchema = PortalArgsSchema.extend({
  name: z
    .string()
    .optional()
    .describe(
      "Update the portal display name - shown to users and in branding (3-40 characters)",
    ),
  subdomain: z
    .string()
    .optional()
    .describe(
      "Update the portal subdomain - changes the portal URL. Must remain unique across all portals (3-20 characters, lowercase, alphanumeric with hyphens)",
    ),
  customDomain: z
    .boolean()
    .optional()
    .describe(
      "Enable/disable custom domain for the portal - allows using your own domain instead of the default subdomain",
    ),
  gtmKey: z
    .string()
    .optional()
    .describe(
      "Google Tag Manager key for analytics tracking - format: GTM-XXXXXX (max 25 characters)",
    ),
  offline: z
    .boolean()
    .optional()
    .describe(
      "Set portal visibility - true hides portal from customers (useful for maintenance or development)",
    ),
  routing: z
    .string()
    .optional()
    .describe(
      "Update routing strategy - 'browser' for client-side routing or 'proxy' for server-side routing",
    ),
  credentialsEnabled: z
    .boolean()
    .optional()
    .describe(
      "Enable/disable authentication credentials for portal access - controls whether users can authenticate to view private content",
    ),
  openapiRenderer: z
    .string()
    .optional()
    .describe(
      "Change OpenAPI renderer: 'SWAGGER_UI' (Swagger UI), 'ELEMENTS' (Stoplight Elements), or 'TOGGLE' (switch between both)",
    ),
  pageContentFormat: z
    .string()
    .optional()
    .describe(
      "Update page content format for documentation rendering: 'HTML', 'MARKDOWN', or 'BOTH'",
    ),
});

export const CreateProductArgsSchema = PortalArgsSchema.extend({
  type: z
    .string()
    .describe(
      "Product creation type - 'new' to create from scratch or 'copy' to duplicate an existing product",
    ),
  name: z
    .string()
    .describe(
      "Product display name - will be shown to users in the portal navigation and product listings (3-40 characters)",
    ),
  slug: z
    .string()
    .describe(
      "URL-friendly identifier for the product - must be unique within the portal, used in URLs (e.g., 'my-api' becomes /my-api). 3-22 characters, lowercase, alphanumeric with hyphens, underscores, or dots",
    ),
  description: z
    .string()
    .optional()
    .describe(
      "Product description - explains what the API/product does, shown in product listings and cards (max 110 characters)",
    ),
  public: z
    .boolean()
    .optional()
    .describe(
      "Whether the product is publicly visible to all portal visitors - false means only authenticated users with appropriate roles can access it",
    ),
  hidden: z
    .boolean()
    .optional()
    .describe(
      "Whether the product is hidden from the portal landing page navigation menus - useful for internal or draft products",
    ),
  role: z
    .boolean()
    .optional()
    .describe(
      "Whether the product has role-based access restrictions - controls if specific user roles are required to access the product",
    ),
});

export const UpdateProductArgsSchema = ProductArgsSchema.extend({
  name: z
    .string()
    .optional()
    .describe(
      "Update product display name - changes how it appears to users in navigation and listings (3-40 characters)",
    ),
  slug: z
    .string()
    .optional()
    .describe(
      "Update URL-friendly identifier - must remain unique within the portal, affects product URLs (3-22 characters, lowercase, alphanumeric with hyphens/underscores/dots)",
    ),
  description: z
    .string()
    .optional()
    .describe(
      "Update product description - explains the API/product functionality, shown in listings (max 110 characters)",
    ),
  public: z
    .boolean()
    .optional()
    .describe(
      "Change product visibility - true makes it publicly accessible to all visitors, false restricts to authenticated users with roles",
    ),
  hidden: z
    .boolean()
    .optional()
    .describe(
      "Change navigation visibility - true hides from portal landing page menus while keeping the product accessible via direct links",
    ),
});
