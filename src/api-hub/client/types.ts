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
  credentialsEnabled?: string;
  swaggerHubOrganizationId: string;
  openapiRenderer?: string;
  pageContentFormat?: string;
}

export interface UpdatePortalArgs {
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

export interface CreateProductArgs {
  type: string;
  name: string;
  slug: string;
  description?: string;
  public?: boolean;
  hidden?: string;
  role?: boolean;
}

export interface UpdateProductArgs {
  name?: string;
  slug?: string;
  description?: string;
  public?: boolean;
  hidden?: string;
}

// Zod schemas for validation
export const PortalArgsSchema = z.object({
  portalId: z.string()
});

export const ProductArgsSchema = z.object({
  productId: z.string()
});

export const CreatePortalArgsSchema = z.object({
  name: z.string().optional(),
  subdomain: z.string(),
  offline: z.boolean().optional(),
  routing: z.string().optional(),
  credentialsEnabled: z.string().optional(),
  swaggerHubOrganizationId: z.string(),
  openapiRenderer: z.string().optional(),
  pageContentFormat: z.string().optional()
});

export const UpdatePortalArgsSchema = z.object({
  name: z.string().optional(),
  subdomain: z.string().optional(),
  customDomain: z.boolean().optional(),
  gtmKey: z.string().optional(),
  offline: z.boolean().optional(),
  routing: z.string().optional(),
  credentialsEnabled: z.boolean().optional(),
  openapiRenderer: z.string().optional(),
  pageContentFormat: z.string().optional()
});

export const CreateProductArgsSchema = z.object({
  type: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string().optional(),
  public: z.boolean().optional(),
  hidden: z.string().optional(),
  role: z.boolean().optional()
});

export const UpdateProductArgsSchema = z.object({
  name: z.string().optional(),
  slug: z.string().optional(),
  description: z.string().optional(),
  public: z.boolean().optional(),
  hidden: z.string().optional()
});