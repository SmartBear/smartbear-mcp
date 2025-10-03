import { z } from "zod";

// Zod schemas for SwaggerHub Registry API validation
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

export const CreateApiParamsSchema = z.object({
  owner: z.string().describe("Organization name (owner of the API)"),
  apiName: z.string().describe("API name"),
  version: z
    .string()
    .default("1.0.0")
    .describe("Version identifier (default: 1.0.0)"),
  specification: z
    .enum([
      "OpenAPI 2.0",
      "OpenAPI 3.0",
      "OpenAPI 3.1",
      "AsyncAPI 2.0",
      "AsyncAPI 3.0",
    ])
    .describe("API specification type"),
  visibility: z
    .enum(["private"])
    .default("private")
    .describe("API visibility (default: private)"),
  project: z
    .string()
    .optional()
    .describe("Project name (optional, default: none)"),
  template: z
    .string()
    .optional()
    .describe("Template to use (optional, default: none)"),
  automock: z
    .boolean()
    .default(false)
    .describe("Enable automock (default: false)"),
  definition: z
    .string()
    .describe(
      "API definition content (OpenAPI/AsyncAPI specification in JSON or YAML format)",
    ),
  format: z
    .enum(["json", "yaml"])
    .optional()
    .describe(
      "Format of the definition content - 'json' or 'yaml'. If not specified, will be auto-detected",
    ),
});

// Registry API types for SwaggerHub Design functionality - generated from Zod schemas
export type ApiSearchParams = z.infer<typeof ApiSearchParamsSchema>;
export type ApiDefinitionParams = z.infer<typeof ApiDefinitionParamsSchema>;
export type CreateApiParams = z.infer<typeof CreateApiParamsSchema>;

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

// Response type for created or updated API
export interface CreateApiResponse {
  owner: string;
  apiName: string;
  version: string;
  url: string;
  operation: 'create' | 'update';
}
