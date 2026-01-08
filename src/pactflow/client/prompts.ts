import { z } from "zod";
import type { PromptParams } from "../../common/types.js";
import { EndpointMatcherSchema } from "./ai.js";

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

const OADMatcherPromptRecommendationExample = [
  {
    path: "/users",
    methods: ["GET"],
    statusCodes: [200, "2XX"],
    operationId: "get*",
  },
  {
    path: "/users/*",
    methods: ["GET"],
    statusCodes: ["2XX"],
    operationId: "*User*",
  },
  {
    path: "/users",
    methods: ["GET"],
    statusCodes: [200],
    operationId: "getAllUsers",
  },
  {
    path: "/users/**",
    methods: ["GET"],
    statusCodes: ["2XX", 404],
    operationId: "get*",
  },
];

export const OADMatcherPrompt = `

Generate a list of recommendations(maximum of 5) in JSON to use with an OpenAPI matcher.
Zod Schema for the matcher to be generated is provided below in the markdown block of javascript use this to generate the recommendations for the matcher. Recommendations should contain all the fields from the schema and only output the JSON in a markdown formatted block.

\`\`\`javascript
const EndpointMatcherSchema = ${JSON.stringify(EndpointMatcherSchema.toJSONSchema())};
\`\`\`

Example OpenAPI document:-

if OpenAPI document provided is:-

\`\`\`json
${JSON.stringify(OADMatcherPromptOpenAPIDocExample, null, 2)}
\`\`\`

Generated recommendations are:-

\`\`\`json
${JSON.stringify(OADMatcherPromptRecommendationExample, null, 2)}
\`\`\`

Actual OpenAPI document:-

Now provided the below OpenAPI document:-

\`\`\`json
{0}
\`\`\`

Give JSON recommendations only provide the JSON block in markdown don't include any additional text.
`;

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
    callback: ({ openAPI }: { openAPI: string }): object => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: OADMatcherPrompt.replace("{0}", openAPI),
          },
        },
      ],
    }),
  },
];
