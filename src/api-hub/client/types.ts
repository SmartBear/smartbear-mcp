import { z } from "zod";

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

// Registry API types for SwaggerHub Design functionality - generated from Zod schemas
export type ApiSearchParams = z.infer<typeof ApiSearchParamsSchema>;
export type ApiDefinitionParams = z.infer<typeof ApiDefinitionParamsSchema>;

// Type definitions for tool arguments - generated from Zod schemas
export type PortalArgs = z.infer<typeof PortalArgsSchema>;
export type ProductArgs = z.infer<typeof ProductArgsSchema>;
export type CreatePortalArgs = z.infer<typeof CreatePortalArgsSchema>;
export type UpdatePortalArgs = z.infer<typeof UpdatePortalArgsSchema>;
export type CreateProductArgs = z.infer<typeof CreateProductArgsSchema>;
export type UpdateProductArgs = z.infer<typeof UpdateProductArgsSchema>;

// API body types (without IDs - IDs are passed in URL path)
export type UpdatePortalBody = Omit<UpdatePortalArgs, "portalId">;
export type CreateProductBody = Omit<CreateProductArgs, "portalId">;
export type UpdateProductBody = Omit<UpdateProductArgs, "productId">;

// Response types for better type safety
export type FallbackResponse =
  | {
      message: string;
    }
  | Record<string, never>;

export type SuccessResponse = {
  success: boolean;
};

// Common API Hub response entities
export interface Portal {
  id: string;
  name: string;
  subdomain?: string;
  [key: string]: unknown;
}

export interface Product {
  id: string;
  name: string;
  [key: string]: unknown;
}

// Response collection types
export type PortalsListResponse = Portal[];
export type ProductsListResponse = Product[];

// APIs.json format response types
export interface ApiProperty {
  type: string;
  value?: string;
  url?: string;
}

export interface ApiSpecification {
  name: string;
  description: string;
  summary: string;
  tags: string[];
  properties: ApiProperty[];
}

export interface ApisJsonResponse {
  name: string;
  description: string;
  url: string;
  offset: number;
  totalCount: number;
  blocked: boolean;
  apis: ApiSpecification[];
}

// Processed API metadata for easier consumption
export interface ApiMetadata {
  owner: string;
  name: string;
  description: string;
  summary: string;
  version: string;
  specification: string;
  created?: string;
  modified?: string;
  published?: string;
  private?: string;
  oasVersion?: string;
  url?: string;
}


export type ApiSearchResponse = ApiMetadata[];

// Zod schemas for Registry API validation
export const ApiSearchParamsSchema = z.object({
  query: z
    .string()
    .optional()
    .describe("Search query to filter APIs by name, description, or content"),
  state: z
    .enum(["ALL", "PUBLISHED", "UNPUBLISHED"])
    .optional()
    .describe(
      "Filter APIs by publication state - ALL (default), PUBLISHED, or UNPUBLISHED",
    ),
  tag: z.string().optional().describe("Filter APIs by tag"),
  offset: z
    .number()
    .min(0)
    .optional()
    .describe("Offset for pagination (0-based, default 0)"),
  limit: z
    .number()
    .min(1)
    .max(100)
    .optional()
    .describe("Number of results per page (1-100, default 20)"),
  sort: z
    .enum(["NAME", "UPDATED", "CREATED"])
    .optional()
    .describe("Sort field - NAME, UPDATED, or CREATED (default NAME)"),
  order: z
    .enum(["ASC", "DESC"])
    .optional()
    .describe("Sort order - ASC or DESC (default ASC)"),
  owner: z
    .string()
    .optional()
    .describe("Filter APIs by owner (organization or user)"),
  specType: z
    .enum(["API", "DOMAIN"])
    .optional()
    .describe(
      "Filter by specification type - API or DOMAIN (default all types)",
    ),
});

export const ApiDefinitionParamsSchema = z.object({
  owner: z
    .string()
    .describe("API owner (organization or user, case-sensitive)"),
  api: z.string().describe("API name (case-sensitive)"),
  version: z.string().describe("Version identifier"),
  resolved: z
    .boolean()
    .optional()
    .describe(
      "Set to true to get the resolved version with all external $refs included (default false)",
    ),
  flatten: z
    .boolean()
    .optional()
    .describe(
      "Set to true to create models from inline schemas in OpenAPI definition (default false)",
    ),
});
