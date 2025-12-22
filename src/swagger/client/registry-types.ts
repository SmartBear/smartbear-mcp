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
  definition: z
    .string()
    .describe(
      "API definition content (OpenAPI/AsyncAPI specification in JSON or YAML format). Format is automatically detected. API is created with fixed values: version 1.0.0, private visibility, automock disabled, and no project assignment.",
    ),
});

export const ScanStandardizationParamsSchema = z.object({
  orgName: z
    .string()
    .describe("The organization name to use for standardization rules"),
  definition: z
    .string()
    .describe(
      "API definition content (OpenAPI/AsyncAPI specification in JSON or YAML format) to scan for standardization errors",
    ),
});

export const CreateApiFromPromptParamsSchema = z.object({
  owner: z
    .string()
    .describe("API owner (organization or user, case-sensitive)"),
  apiName: z.string().describe("API name"),
  prompt: z
    .string()
    .describe(
      "The prompt describing the desired API functionality (e.g., 'Create a RESTful API for managing a pet store with endpoints for pets, orders, and inventory')",
    ),
  specType: z
    .enum([
      "openapi20",
      "openapi30x",
      "openapi31x",
      "asyncapi2xx",
      "asyncapi30x",
    ])
    .default("openapi30x")
    .describe(
      "Specification type for the generated API definition. Use: 'openapi20' for OpenAPI 2.0, 'openapi30x' for OpenAPI 3.0.x (default), 'openapi31x' for OpenAPI 3.1.x, 'asyncapi2xx' for AsyncAPI 2.x, 'asyncapi30x' for AsyncAPI 3.0.x",
    ),
});

export const StandardizeApiParamsSchema = z.object({
  owner: z
    .string()
    .describe("API owner (organization or user, case-sensitive)"),
  api: z.string().describe("API name (case-sensitive)"),
  version: z.string().describe("Version identifier"),
});

// Registry API types for SwaggerHub Design functionality - generated from Zod schemas
export type ApiSearchParams = z.infer<typeof ApiSearchParamsSchema>;
export type ApiDefinitionParams = z.infer<typeof ApiDefinitionParamsSchema>;
export type CreateApiParams = z.infer<typeof CreateApiParamsSchema>;
export type ScanStandardizationParams = z.infer<
  typeof ScanStandardizationParamsSchema
>;
export type CreateApiFromPromptParams = z.infer<
  typeof CreateApiFromPromptParamsSchema
>;
export type StandardizeApiParams = z.infer<typeof StandardizeApiParamsSchema>;

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
  operation: "create" | "update";
}

// Response type for API created from prompt
export interface CreateApiFromPromptResponse {
  owner: string;
  apiName: string;
  specType: string;
  version?: string; // Version from X-Version header
  url: string;
  operation: "create" | "update";
}

// Response type for standardization scan
export interface StandardizationResult {
  [key: string]: unknown; // The API returns standardization errors/results
}

// Response type for API standardization
export interface StandardizeApiResponse {
  message: string;
  errorsFound: number;
  fixedDefinition?: string;
  errors?: Array<{
    description: string;
    line?: number;
    severity?: string;
  }>;
}
