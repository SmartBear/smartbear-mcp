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

export interface RequestResponsePair {
  request: FileInput;
  response: FileInput;
}

export interface GenerationInput {
  language?: GenerationLanguage;
  requestResponse?: RequestResponsePair;
  code?: FileInput[];
  openapi?: OpenApiWithMatcher;
  additionalInstructions?: string;
  testTemplate?: FileInput;
}

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
    openapi: z.string().describe("For OpenAPI version (e.g., '3.0.0')"),
    swagger: z
      .string()
      .describe("For OpenAPI documents version 2.x (e.g., '2.0')"),
    paths: z
      .record(z.string(), z.record(z.string(), z.any()))
      .describe("OpenAPI paths object containing all API endpoints"),
    components: z
      .record(z.string(), z.record(z.string(), z.any()))
      .optional()
      .describe("OpenAPI components section (schemas, responses, etc.)"),
  })
  .passthrough()
  .describe("The complete OpenAPI document describing the API");

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

export const OpenAPIWithMatcherSchema = z
  .object({
    document: OpenAPISchema,
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
    ).optional(),
  userInstructions: z
    .string()
    .describe(
      "Optional free-form instructions that provide additional context or specify areas of focus during the refinement process of the Pact test."
    ).optional(),
  errorMessages: z
    .array(z.string())
    .describe(
      "Optional error output from failed contract test runs. These can be used to better understand the context or failures observed and guide the recommendations toward resolving specific issues."
    ).optional(),
  openapi: OpenAPIWithMatcherSchema.optional(),
});

// types inferred from schemas
export type RefineInput = z.infer<typeof RefineInputSchema>;
export type FileInput = z.infer<typeof FileInputSchema>;
export type OpenAPI = z.infer<typeof OpenAPISchema>;
export type EndpointMatcher = z.infer<typeof EndpointMatcherSchema>;
export type OpenApiWithMatcher = z.infer<typeof OpenAPIWithMatcherSchema>;
