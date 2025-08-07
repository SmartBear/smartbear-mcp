import { z } from "zod";

export type ClientType = "pactflow" | "pactbroker";

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema:  z.ZodRawShape;
  handler: string;
  clients: ClientType[];
  formatResponse?: (result: any) => any; // optional custom response format
};

export const TOOLS: ToolDefinition[] = [
  {
    name: "generate_pact",
    description:
      "Generate Pact tests using PactFlow AI. You can provide one or more of the following input types: (1) request/response pairs for specific interactions, (2) code files to analyze and extract interactions from, and/or (3) OpenAPI document to generate tests for specific endpoints. When providing an OpenAPI document, a matcher is required to specify which endpoints to generate tests for.",
    inputSchema: {
      language: z
        .enum([
          "typescript",
          "java",
          "golang",
          "dotnet",
          "kotlin",
          "swift",
          "php",
        ])
        .optional()
        .describe(
          "Target language for the generated Pact tests. If not provided, will be inferred from other inputs."
        ),
      requestResponse: z
        .object({
          request: z.object({
            filename: z
              .string()
              .optional()
              .describe(
                "Optional filename for the request (helps with context)"
              ),
            body: z
              .string()
              .describe(
                "Request content/payload - can be HTTP request, JSON, or any format describing the request"
              ),
            language: z
              .string()
              .optional()
              .describe(
                "Language hint for better parsing (e.g., 'json', 'http', 'yaml')"
              ),
          }),
          response: z.object({
            filename: z
              .string()
              .optional()
              .describe(
                "Optional filename for the response (helps with context)"
              ),
            body: z
              .string()
              .describe(
                "Response content/payload - can be HTTP response, JSON, or any format describing the response"
              ),
            language: z
              .string()
              .optional()
              .describe(
                "Language hint for better parsing (e.g., 'json', 'http', 'yaml')"
              ),
          }),
        })
        .optional()
        .describe(
          "Direct request/response pair for a specific interaction. Use this when you have concrete examples of API requests and responses"
        ),
      code: z
        .array(
          z.object({
            filename: z
              .string()
              .optional()
              .describe("Filename (helps identify file type and context)"),
            body: z
              .string()
              .describe(
                "Complete file contents - client code, models, test files, etc."
              ),
            language: z
              .string()
              .optional()
              .describe(
                "Programming language (e.g., 'javascript', 'java', 'python') for better analysis"
              ),
          })
        )
        .optional()
        .describe(
          "Collection of source code files to analyze and extract API interactions from. Include client code, data models, existing tests, or any code that makes API calls"
        ),
      openapi: z
        .object({
          document: z
            .object({
              openapi: z.string().describe("OpenAPI version (e.g., '3.0.0')"),
              paths: z
                .record(z.record(z.any()))
                .describe(
                  "OpenAPI paths object containing all API endpoints"
                ),
              components: z
                .record(z.record(z.any()))
                .optional()
                .describe(
                  "OpenAPI components section (schemas, responses, etc.)"
                ),
            })
            .passthrough()
            .describe("The complete OpenAPI document describing the API"),
          matcher: z
            .object({
              path: z
                .string()
                .optional()
                .describe(
                  "Path pattern to match specific endpoints (e.g., '/users/{id}', '/users/*', '/users/**'). Supports glob patterns: ? (single char), * (excluding /), ** (including /)"
                ),
              methods: z
                .array(
                  z.enum([
                    "GET",
                    "PUT",
                    "POST",
                    "DELETE",
                    "OPTIONS",
                    "HEAD",
                    "PATCH",
                    "TRACE",
                  ])
                )
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
            ),
        })
        .optional()
        .describe(
          "OpenAPI document for generating tests from API specifications. IMPORTANT: When providing an OpenAPI document, the matcher field is REQUIRED to specify which endpoints to generate tests for. This filters the relevant interactions from potentially large OpenAPI documents"
        ),
      additionalInstructions: z
        .string()
        .optional()
        .describe(
          "Optional free-form instructions to guide the generation process (e.g., 'Focus on error scenarios', 'Include authentication headers', 'Use specific test framework patterns')"
        ),
      testTemplate: z
        .object({
          filename: z
            .string()
            .optional()
            .describe("Template filename for context"),
          body: z
            .string()
            .describe(
              "Existing test template or example to use as a basis for the generated tests"
            ),
          language: z
            .string()
            .optional()
            .describe(
              "Template language/framework (e.g., 'javascript', 'junit', 'jest')"
            ),
        })
        .optional()
        .describe(
          "Optional test template to use as a basis for generation. Helps ensure generated tests follow your specific patterns, frameworks, and coding standards"
        ),
    },
    handler: "generate",
    clients: ["pactflow"], // ONLY pactflow
  },
  // Add more tools here
];
