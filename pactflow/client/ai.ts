import { z } from "zod";

// Type definitions for PactFlow AI API
export const GenerationLanguages = [
  "javascript",
  "typescript",
  "java",
  "golang",
  "dotnet",
  "kotlin",
  "swift",
  "php",
] as const;

export type GenerationLanguage = (typeof GenerationLanguages)[number];

export const HttpMethods = [
  "GET",
  "PUT",
  "POST",
  "DELETE",
  "OPTIONS",
  "HEAD",
  "PATCH",
  "TRACE",
] as const;

export type HttpMethod = (typeof HttpMethods)[number];

export interface StatusResponse {
  status: "accepted";
  session_id: string;
  submitted_at: string;
  status_url: string;
  result_url: string;
}

export interface SessionStatusResponse {
  status: "completed" | "accepted" | "invalid";
}

export interface GenerationResponse {
  id?: string;
  code: string;
  language: string;
}

export interface RefineRecommendation {
  recommendation: string;
  diff?: string;
  confidence?: number;
}

export interface RefineResponse {
  recommendations: RefineRecommendation[];
}

// zod schemas
export const FileInputSchema = z.object({
  filename: z
    .string()
    .optional()
    .describe("Filename (helps identify file type and context)"),
  language: z
    .string()
    .optional()
    .describe(
      "Programming language (e.g., 'javascript', 'java', 'python') for better analysis"
    ),
  body: z
    .string()
    .describe("Complete file contents - client code, models, test files, etc."),
});

export const OpenAPISchema = z
  .object({
    openapi: z
      .string()
      .optional()
      .describe("For OpenAPI version (e.g., '3.0.0')"),
    swagger: z
      .string()
      .describe("For OpenAPI documents version 2.x (e.g., '2.0')")
      .optional(),
    paths: z
      .record(z.string(), z.record(z.string(), z.any()))
      .describe("OpenAPI paths object containing all API endpoints"),
    info: z
      .object({
        title: z.string().describe("API title"),
        version: z.string().describe("API version"),
        description: z.string().describe("API description"),
        contact: z
          .object({
            name: z.string().describe("Contact name"),
            email: z.string().email().describe("Contact email"),
            url: z.string().url().describe("Contact URL"),
          })
          .optional(),
        license: z
          .object({
            name: z.string().describe("License name"),
            url: z.string().url().describe("License URL"),
          })
          .optional(),
      })
      .describe("Information about the API")
      .optional(),
    components: z
      .record(z.string(), z.record(z.string(), z.any()))
      .optional()
      .describe("OpenAPI components section (schemas, responses, etc.)"),
  })
  .passthrough()
  .describe("The complete OpenAPI document describing the API")
  .refine((data) => data.openapi || data.swagger, {
    message:
      "Either 'openapi' (for v3+) or 'swagger' (for v2) must be provided",
    path: ["openapi"],
  })
  .optional();

export const EndpointMatcherSchema = z
  .object({
    path: z
      .string()
      .optional()
      .describe(
        "Path pattern to match specific endpoints (e.g., '/users/{id}', '/users/*', '/users/**'). Supports glob patterns: ? (single char), * (excluding /), ** (including /)"
      ),
    methods: z
      .array(z.enum(HttpMethods))
      .optional()
      .describe(
        "HTTP methods to include (e.g., ['GET', 'POST']). If not specified, all methods are matched"
      ),
    statusCodes: z
      .array(z.union([z.number(), z.string()]))
      .optional()
      .describe(
        "Response status codes to include (e.g., [200, '2XX', 404]). Use 'X' as wildcard (e.g., '2XX' for 200-299). Defaults to successful codes (2XX)"
      ),
    operationId: z
      .string()
      .optional()
      .describe(
        "OpenAPI operation ID to match (e.g., 'getUserById', 'get*'). Supports glob patterns"
      ),
  })
  .required()
  .describe(
    "REQUIRED: Matcher to specify which endpoints from the OpenAPI document to generate tests for. At least one matcher field must be provided"
  );

export const RemoteOpenAPIDocumentSchema = z.object({
  authToken: z
    .string()
    .describe("Auth Bearer Token if the OpenAPI spec requires authentication.")
    .optional(),
  authScheme: z
    .string()
    .describe("Authentication scheme (e.g., 'Bearer', 'Basic'). Default scheme passed should be Bearer if authToken is specified and this field is not set.")
    .default("Bearer")
    .optional(),
  url: z
    .string()
    .url("Must be a valid openapi url")
    .describe("URL of the remote OpenAPI document.")
    .optional(),
});

export const OpenAPIWithMatcherSchema = z
  .object({
    document: z.union([OpenAPISchema, RemoteOpenAPIDocumentSchema]),
    matcher: EndpointMatcherSchema,
  })
  .describe(
    "If provided, the OpenAPI document which describes the API being tested and is accompanied by a matcher which will be used to identify the interactions in the OpenAPI document which are relevant to the Pact refinement process."
  );

export const RefineInputSchema = z.object({
  pactTests: FileInputSchema.describe(
    "Primary pact tests that needs to be refined."
  ),
  code: z
    .array(FileInputSchema)
    .describe(
      "Collection of source code files to analyze and extract API interactions from. Include client code, data models, existing tests, or any code that makes API calls"
    )
    .optional(),
  userInstructions: z
    .string()
    .describe(
      "Optional free-form instructions that provide additional context or specify areas of focus during the refinement process of the Pact test."
    )
    .optional(),
  errorMessages: z
    .array(z.string())
    .describe(
      "Optional error output from failed contract test runs. These can be used to better understand the context or failures observed and guide the recommendations toward resolving specific issues."
    )
    .optional(),
  openapi: OpenAPIWithMatcherSchema.optional(),
});

export const RequestResponsePairSchema = z
  .object({
    request: FileInputSchema,
    response: FileInputSchema,
  })
  .describe(
    "Direct request/response pair for a specific interaction. Use this when you have concrete examples of API requests and responses"
  );

export const GenerationInputSchema = z.object({
  language: z
    .enum(GenerationLanguages)
    .optional()
    .describe(
      "Target language for the generated Pact tests. If not provided, will be inferred from other inputs."
    ),
  requestResponse: RequestResponsePairSchema.optional(),
  code: z
    .array(FileInputSchema)
    .optional()
    .describe(
      "Collection of source code files to analyze and extract API interactions from. Include client code, data models, existing tests, or any code that makes API calls"
    ),
  openapi: OpenAPIWithMatcherSchema.optional(),
  additionalInstructions: z
    .string()
    .optional()
    .describe(
      "Optional free-form instructions to guide the generation process (e.g., 'Focus on error scenarios', 'Include authentication headers', 'Use specific test framework patterns')"
    ),
  testTemplate: FileInputSchema.optional().describe(
    "Optional test template to use as a basis for generation. Helps ensure generated tests follow your specific patterns, frameworks, and coding standards"
  ),
});

// types inferred from schemas
export type RefineInput = z.infer<typeof RefineInputSchema>;
export type FileInput = z.infer<typeof FileInputSchema>;
export type OpenAPI = z.infer<typeof OpenAPISchema>;
export type EndpointMatcher = z.infer<typeof EndpointMatcherSchema>;
export type OpenApiWithMatcher = z.infer<typeof OpenAPIWithMatcherSchema>;
export type GenerationInput = z.infer<typeof GenerationInputSchema>;
export type RequestResponsePair = z.infer<typeof RequestResponsePairSchema>;
export type RemoteOpenAPIDocument = z.infer<typeof RemoteOpenAPIDocumentSchema>;
