import { z } from "zod";
import { PromptParams } from "../../common/types.js";

export const PROMPTS: PromptParams[] = [
  {
    name: "OpenAPI Matcher recommendations",
    params: {
      description: "Get OpenAPI matcher recommendations using sampling",
      title: "OpenAPI Matcher recommendations",
      argsSchema: {
        openAPI: z.string(),
      },
    },
    callback: function ({ openAPI }: { openAPI: string }): object {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: OADMatcherPrompt.replace("{0}", openAPI),
            },
          },
        ],
      };
    },
  },
];

export const OADMatcherPrompt = `

Generate a list of recommendations(maximum of 5) in JSON to use with an OpenAPI matcher.
Zod Schema for the matcher to be generated is provided below in the markdown block of javascript use this to generate the recommendations for the matcher. Recommendations should contain all the fields from the schema and only output the JSON in a markdown formatted block.

\`\`\`javascript
const EndpointMatcherSchema = z
  .object({
    path: z
      .string()
      .describe(
        "Path pattern to match specific endpoints (e.g., '/users/{id}', '/users/*', '/users/**'). Supports glob patterns: ? (single char), * (excluding /), ** (including /)"
      ),
    methods: z
      .array(z.enum([
        "GET",
        "PUT",
        "POST",
        "DELETE",
        "OPTIONS",
        "HEAD",
        "PATCH",
        "TRACE",
        ]))
      .describe(
        "HTTP methods to include (e.g., ['GET', 'POST']). If not specified, all methods are matched"
      ),
    statusCodes: z
      .array(z.union([z.number(), z.string()]))
      .describe(
        "Response status codes to include (e.g., [200, '2XX', 404]). Use 'X' as wildcard (e.g., '2XX' for 200-299). Defaults to successful codes (2XX)"
      ),
    operationId: z
      .string()
      .describe(
        "OpenAPI operation ID to match (e.g., 'getUserById', 'get*'). Supports glob patterns"
      ),
  })
  .describe(
    "REQUIRED: Matcher to specify which endpoints from the OpenAPI document to generate tests for. At least one matcher field must be provided"
  );
\`\`\`

Example OpenAPI document:-

if OpenAPI document provided is:-

\`\`\`json
{
  "openapi": "3.1.0",
  "info": {
    "title": "My API",
    "version": "1.0.0",
    "description": "A sample API for demonstration purposes."
  },
  "paths": {
    "/users": {
      "get": {
        "summary": "Get all users",
        "responses": {
          "200": {
            "description": "A list of users",
            "content": {
              "application/json": {
                "schema": {
                  "type": "array",
                  "items": {
                    "$ref": "#/components/schemas/User"
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "User": {
        "type": "object",
        "properties": {
          "id": {
            "type": "integer",
            "format": "int64"
          },
          "name": {
            "type": "string"
          }
        }
      }
    }
  }
}
\`\`\`

Generated recommendations are:-

\`\`\`json
[
  {
    "path": "/users",
    "methods": ["GET"],
    "statusCodes": [200, "2XX"],
    "operationId": "get*"
  },
  {
    "path": "/users/*",
    "methods": ["GET"],
    "statusCodes": ["2XX"],
    "operationId": "*User*"
  },
  {
    "path": "/users",
    "methods": ["GET"],
    "statusCodes": [200],
    "operationId": "getAllUsers"
  },
  {
    "path": "/users/**",
    "methods": ["GET"],
    "statusCodes": ["2XX", 404],
    "operationId": "get*"
  }
]
\`\`\`

Actual OpenAPI document:-

Now provided the below OpenAPI document:-

\`\`\`json
{0}
\`\`\`

Give JSON recommendations only provide the JSON block in markdown don't include any additional text.
`;
