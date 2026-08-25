import type { GetPromptResult } from "@modelcontextprotocol/server";
import { z } from "zod";
import type { PromptHandler } from "../../common/prompts";
import type { PromptParams } from "../../common/types";
import { EndpointMatcherSchema } from "./ai";

export interface PactflowPromptParams extends PromptParams {
  callback: PromptHandler;
}

const OADMatcherPromptOpenAPIDocExample = {
  openapi: "3.1.0",
  info: {
    title: "My API",
    version: "1.0.0",
    description: "A sample API for demonstration purposes.",
  },
  paths: {
    "/users": {
      get: {
        summary: "Get all users",
        responses: {
          "200": {
            description: "A list of users",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    $ref: "#/components/schemas/User",
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      User: {
        type: "object",
        properties: {
          id: {
            type: "integer",
            format: "int64",
          },
          name: {
            type: "string",
          },
        },
      },
    },
  },
};

const OADMatcherPromptRecommendationExample = {
  path: "/users",
  methods: ["GET"],
  statusCodes: [200],
  operationId: "getAllUsers",
};

export const OADMatcherPrompt = `

Generate a single recommendation in JSON to use with an OpenAPI matcher.
Zod Schema for the matcher to be generated is provided below in the markdown block of javascript use this to generate the recommendation for the matcher. The recommendation should contain all the fields from the schema and only output the JSON in a markdown formatted block.

\`\`\`javascript
const EndpointMatcherSchema = ${JSON.stringify(EndpointMatcherSchema.toJSONSchema())};
\`\`\`

Example OpenAPI document:-

if OpenAPI document provided is:-

\`\`\`json
${JSON.stringify(OADMatcherPromptOpenAPIDocExample, null, 2)}
\`\`\`

Generated recommendation is:-

\`\`\`json
${JSON.stringify(OADMatcherPromptRecommendationExample, null, 2)}
\`\`\`

Actual OpenAPI document:-

Now provided the below OpenAPI document:-

\`\`\`json
{0}
\`\`\`

Give the JSON recommendation only provide the JSON block in markdown don't include any additional text.
`;

const argsSchema = z.object({
  openAPI: z
    .string()
    .describe("The OpenAPI document to generate matcher recommendations for"),
});

export const PROMPTS: PactflowPromptParams[] = [
  {
    title: "OpenAPI Matcher recommendations",
    description: "Get an OpenAPI matcher recommendation",
    argsSchema,
    callback: (args): GetPromptResult => {
      const params = argsSchema.parse(args);
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: OADMatcherPrompt.replace("{0}", params.openAPI),
            },
          },
        ],
      };
    },
  },
];
