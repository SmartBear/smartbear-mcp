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

// Zod schemas for validation
export const PortalArgsSchema = z.object({
  portalId: z.string(),
});

export const ProductArgsSchema = z.object({
  productId: z.string(),
});

export const CreatePortalArgsSchema = z.object({
  name: z.string().optional(),
  subdomain: z.string(),
  offline: z.boolean().optional(),
  routing: z.string().optional(),
  credentialsEnabled: z.boolean().optional(),
  swaggerHubOrganizationId: z.string(),
  openapiRenderer: z.string().optional(),
  pageContentFormat: z.string().optional(),
});

export const UpdatePortalArgsSchema = PortalArgsSchema.extend({
  name: z.string().optional(),
  subdomain: z.string().optional(),
  customDomain: z.boolean().optional(),
  gtmKey: z.string().optional(),
  offline: z.boolean().optional(),
  routing: z.string().optional(),
  credentialsEnabled: z.boolean().optional(),
  openapiRenderer: z.string().optional(),
  pageContentFormat: z.string().optional(),
});

export const CreateProductArgsSchema = PortalArgsSchema.extend({
  type: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  public: z.boolean().optional(),
  hidden: z.boolean().optional(),
  role: z.boolean().optional(),
});

export const UpdateProductArgsSchema = ProductArgsSchema.extend({
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  public: z.boolean().optional(),
  hidden: z.boolean().optional(),
});
