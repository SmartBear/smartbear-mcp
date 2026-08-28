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
  format: z
    .enum(["json", "text"])
    .optional()
    .describe(
      "Response format: 'json' (default) may convert YAML to JSON; 'text' returns the definition as YAML — required for swagger_patch_api edits.",
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

export const ScanApiStandardizationFromRegistryParamsSchema = z.object({
  orgName: z
    .string()
    .describe(
      "The organization name that owns the API and provides the standardization rules (case-sensitive)",
    ),
  apiName: z.string().describe("API name (case-sensitive)"),
  version: z.string().describe("Version identifier"),
});

export const ValidateApiParamsSchema = z
  .object({
    definition: z
      .string()
      .optional()
      .describe(
        "API definition content (OpenAPI/AsyncAPI in JSON or YAML). Provide this or owner/apiName/version, not both.",
      ),
    owner: z
      .string()
      .optional()
      .describe(
        "API owner (organization or user). Use with apiName and version to fetch an existing API from the registry.",
      ),
    apiName: z.string().optional().describe("API name"),
    version: z.string().optional().describe("Version identifier"),
    maxProblems: z
      .number()
      .min(1)
      .max(1000)
      .optional()
      .describe(
        "Cap on the number of findings returned (default 100, max 1000)",
      ),
    uri: z
      .string()
      .optional()
      .describe(
        "Optional pseudo-URI hint for the parser (e.g. inmemory://spec.yaml)",
      ),
  })
  .refine(
    (data) =>
      Boolean(data.definition) !==
      Boolean(data.owner && data.apiName && data.version),
    {
      message:
        "Provide either 'definition' OR 'owner' + 'apiName' + 'version', not both and not neither.",
      path: ["definition"],
    },
  );

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
  newVersion: z
    .string()
    .optional()
    .describe(
      "The version to save the fixed definition as (e.g. '1.0.1'). Omitting this will overwrite the current version — prefer providing a patch bump (e.g. '1.0.0' → '1.0.1') unless the user specifies otherwise.",
    ),
});

export const PatchApiEditSchema = z.object({
  oldString: z
    .string()
    .min(1)
    .describe(
      "Exact text to find in the YAML definition (including indentation and newlines), copied from swagger_get_api_definition with format:'text'. Must match exactly one location unless replaceAll is true. For repeated text (e.g. 'responses:', 'description: OK'), start from the nearest unique parent key (path name, schema name, operationId).",
    ),
  replaceString: z
    .string()
    .describe(
      "Replacement text. Repeat the quoted context unchanged and change only the minimal part. An empty string deletes the matched text.",
    ),
  replaceAll: z
    .boolean()
    .optional()
    .describe(
      "Replace every occurrence of oldString instead of requiring a unique match (default false). Use for identical fixes at many flagged locations.",
    ),
});

export const PatchApiParamsSchema = z.object({
  owner: z
    .string()
    .describe("API owner (organization or user, case-sensitive)"),
  apiName: z.string().describe("API name (case-sensitive)"),
  version: z
    .string()
    .describe(
      "Version of the definition to patch (base version, e.g. '1.0.0')",
    ),
  newVersion: z
    .string()
    .optional()
    .describe(
      "Version to save the patched definition as (e.g. '1.0.1'). Must not already exist and is always created as private. Omit to overwrite the base version, which keeps its current visibility. The definition's info.version is updated automatically — do not add an edit for it.",
    ),
  edits: z
    .array(PatchApiEditSchema)
    .min(1)
    .max(50)
    .describe(
      "Search/replace edits applied sequentially to the YAML definition. Nothing is saved unless every edit applies (atomic).",
    ),
});

export type PatchApiEdit = z.infer<typeof PatchApiEditSchema>;
export type PatchApiParams = z.infer<typeof PatchApiParamsSchema>;

// Registry API types for SwaggerHub Design functionality - generated from Zod schemas
export type ApiSearchParams = z.infer<typeof ApiSearchParamsSchema>;
export type ApiDefinitionParams = z.infer<typeof ApiDefinitionParamsSchema>;
export type CreateApiParams = z.infer<typeof CreateApiParamsSchema>;
export type ScanStandardizationParams = z.infer<
  typeof ScanStandardizationParamsSchema
>;
export type ScanApiStandardizationFromRegistryParams = z.infer<
  typeof ScanApiStandardizationFromRegistryParamsSchema
>;
export type CreateApiFromPromptParams = z.infer<
  typeof CreateApiFromPromptParamsSchema
>;
export type StandardizeApiParams = z.infer<typeof StandardizeApiParamsSchema>;
export type ValidateApiParams = z.infer<typeof ValidateApiParamsSchema>;

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

export type StandardizationSeverity =
  | "Off"
  | "Warning"
  | "Critical"
  | "Info"
  | "Hint";

export interface StandardizationError {
  line: number;
  description: string;
  severity?: StandardizationSeverity;
}

export interface StandardizationScanApiResponse {
  validation?: StandardizationError[];
}

export interface ApidomValidationFinding {
  line: number;
  column?: number;
  severity: "error" | "warning" | "info";
  message: string;
  code?: number;
}

export interface ApidomValidationSpecInfo {
  namespace?: string;
  version?: string;
  format?: string;
  mediaType?: string;
}

export interface ApidomValidationSummary {
  errors?: number;
  warnings?: number;
  info?: number;
  total?: number;
  durationMs?: number;
}

export interface ApidomValidationResult {
  valid?: boolean;
  recognized?: boolean;
  spec?: ApidomValidationSpecInfo;
  findings?: ApidomValidationFinding[];
  summary?: ApidomValidationSummary;
}

// Response type for standardization scan tool
export interface StandardizationResult extends StandardizationScanApiResponse {
  count: number;
  countsBySeverity: Record<string, number>;
}

// Response type for scanning an API by org/name/version.
export interface ScanApiStandardizationFromRegistryResult
  extends StandardizationResult {
  url: string;
}

// Response type for API standardization
export interface StandardizeApiResponse {
  message: string;
  errorsFound: number;
  fixedDefinition?: string;
  savedVersion?: string;
  url?: string;
  errors?: Array<{
    description: string;
    line?: number;
    severity?: string;
  }>;
}

// Output schemas for MCP tool responses — all fields optional to tolerate partial API responses
export const CreateApiOutputSchema = z.looseObject({
  owner: z.string().optional(),
  apiName: z.string().optional(),
  version: z.string().optional(),
  url: z.string().optional(),
  operation: z.enum(["create", "update"]).optional(),
});

export const CreateApiFromPromptOutputSchema = z.looseObject({
  owner: z.string().optional(),
  apiName: z.string().optional(),
  specType: z.string().optional(),
  version: z.string().optional(),
  url: z.string().optional(),
  operation: z.enum(["create", "update"]).optional(),
});

const StandardizationErrorSchema = z.object({
  line: z.number().optional(),
  description: z.string().optional(),
  severity: z.string().optional(),
});

export const ApidomValidationFindingSchema = z.looseObject({
  line: z.number().describe("Line number where the issue was found (1-based)"),
  column: z
    .number()
    .optional()
    .describe("Column number where the issue starts (0-based)"),
  severity: z
    .enum(["error", "warning", "info"])
    .describe("Severity of the finding"),
  message: z.string().describe("Human-readable validation message"),
  code: z.number().optional().describe("Rule or lint code"),
  source: z.string().optional().describe("Source of the rule"),
});

export const ApidomValidationOutputSchema = z.looseObject({
  valid: z
    .boolean()
    .optional()
    .describe("True if the spec has no error findings"),
  recognized: z
    .boolean()
    .optional()
    .describe("True if the spec was recognized as OpenAPI/AsyncAPI"),
  namespace: z.string().optional().describe("Detected spec namespace"),
  version: z.string().optional().describe("Detected spec version"),
  findings: z
    .array(ApidomValidationFindingSchema)
    .optional()
    .describe("List of validation findings"),
  summary: z
    .looseObject({
      errors: z.number().optional(),
      warnings: z.number().optional(),
      total: z.number().optional(),
      durationMs: z.number().optional(),
    })
    .optional(),
});

export const ScanOutputSchema = z.looseObject({
  count: z.number().optional(),
  countsBySeverity: z.record(z.string(), z.number()).optional(),
  validation: z.array(StandardizationErrorSchema).optional(),
});

export const ScanFromRegistryOutputSchema = z.looseObject({
  count: z.number().optional(),
  countsBySeverity: z.record(z.string(), z.number()).optional(),
  validation: z.array(StandardizationErrorSchema).optional(),
  url: z.string().optional(),
});

export const StandardizeOutputSchema = z.looseObject({
  message: z.string().optional(),
  errorsFound: z.number().optional(),
  fixedDefinition: z.string().optional(),
  savedVersion: z.string().optional(),
  url: z.string().optional(),
});

export const ApiDefinitionOutputSchema = z.object({
  definition: z.string(),
});

export const SearchApisOutputSchema = z.object({
  items: z.array(
    z.looseObject({
      owner: z.string().optional(),
      name: z.string().optional(),
      version: z.string().optional(),
      description: z.string().optional(),
      specification: z.string().optional(),
      url: z.string().optional(),
    }),
  ),
});

export const PatchApiFailedEditSchema = z.object({
  index: z
    .number()
    .describe("Position of the failed edit in the request's edits array"),
  oldString: z.string().describe("The failed edit's oldString"),
  error: z.enum(["no_match", "ambiguous"]),
  matchCount: z
    .number()
    .describe("How many times search matched (0 for no_match)"),
});

export const PatchApiOutputSchema = z.looseObject({
  failed: z
    .array(PatchApiFailedEditSchema)
    .optional()
    .describe("Only present when at least one edit failed"),
  saved: z.boolean().optional(),
  operation: z.enum(["create", "update"]).optional(),
  version: z.string().optional(),
  url: z.string().optional(),
});

// Response type
export type PatchApiFailedEdit = z.infer<typeof PatchApiFailedEditSchema>;

export interface PatchApiResponse {
  failed?: PatchApiFailedEdit[];
  saved: boolean;
  operation?: "create" | "update";
  version?: string;
  url?: string;
}
