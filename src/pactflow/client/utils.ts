import {
  RemoteOpenAPIDocument,
  RemoteOpenAPIDocumentSchema,
  OpenAPI,
  MatcherRecommendationInputSchema,
  MatcherRecommendations,
  EndpointMatcherSchema,
  EndpointMatcher,
} from "./ai.js";
import yaml from "js-yaml";
// @ts-expect-error missing type declarations
import Swagger from "swagger-client";
import { OADMatcherPrompt } from "./prompts.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { GetInputFunction } from "../../common/types.js";

/**
 * Resolve the OpenAPI specification from the provided input.
 *
 * @param remoteOpenAPIDocument The remote OpenAPI document to resolve.
 * @returns The resolved OpenAPI document.
 * @throws Error if the resolution fails.
 */
export async function resolveOpenAPISpec(
  remoteOpenAPIDocument: RemoteOpenAPIDocument
): Promise<OpenAPI> {
  const openAPISchema = RemoteOpenAPIDocumentSchema.safeParse(
    remoteOpenAPIDocument
  );
  if (openAPISchema.error || !remoteOpenAPIDocument) {
    throw new Error(
      `Invalid RemoteOpenAPIDocument: ${JSON.stringify(
        openAPISchema.error?.issues
      )}`
    );
  }

  const unresolvedSpec = await getRemoteSpecContents(openAPISchema.data);
  const resolvedSpec = await Swagger.resolve({ spec: unresolvedSpec });

  if (resolvedSpec.errors?.length) {
    throw new Error(
      `Failed to resolve OpenAPI document: ${resolvedSpec.errors?.join(", ")}`
    );
  }

  return resolvedSpec.spec;
}

/**
 * Fetch the contents of a remote OpenAPI document.
 *
 * @param openAPISchema The schema for the remote OpenAPI document.
 * @returns A promise that resolves to a map of the OpenAPI document contents.
 * @throws Error if the URL is not provided or the fetch fails.
 */
export async function getRemoteSpecContents(
  openAPISchema: RemoteOpenAPIDocument
): Promise<any> {
  if (!openAPISchema.url) {
    throw new Error("'url' must be provided.");
  }

  let headers = {};
  if (openAPISchema.authToken) {
    headers = {
      Authorization: `${openAPISchema.authScheme ?? "Bearer"} ${
        openAPISchema.authToken
      }`,
    };
  }

  const remoteSpec = await fetch(openAPISchema.url, {
    headers,
    method: "GET",
  });

  const specRawBody = await remoteSpec.text();

  try {
    return JSON.parse(specRawBody);
  } catch (jsonError) {
    try {
      return yaml.load(specRawBody);
    } catch (yamlError) {
      throw new Error(
        `Unsupported Content-Type: ${remoteSpec.headers.get(
          "Content-Type"
        )} for remote OpenAPI document. Found following parse errors:-\nJSON parse error: ${jsonError}\nYAML parse error: ${yamlError}`
      );
    }
  }
}

/**
 * Adds the OpenAPI specification to the input schema if a remote document is provided.
 *
 * @param inputSchema The input schema to modify.
 * @returns The modified input schema with the OpenAPI specification added.
 */
export async function addOpenAPISpecToSchema(inputSchema: any) {
  if (inputSchema.remoteDocument) {
    const resolvedSpec = await resolveOpenAPISpec(inputSchema.remoteDocument);
    inputSchema.document = resolvedSpec;
  }

  return inputSchema;
}

/**
 * Get OpenAPI matcher recommendations using sampling.
 *
 * @param openAPI The OpenAPI document to analyze.
 * @param server The SmartBear MCP server instance.
 * @returns A promise that resolves to the matcher recommendations.
 * @throws Error if unable to parse recommendations.
 */
export async function getOADMatcherRecommendations(
  openAPI: OpenAPI,
  server: Server
): Promise<MatcherRecommendations> {
  const matcherResponse = await server.createMessage({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: OADMatcherPrompt.replace("{0}", JSON.stringify(openAPI)),
        },
      },
    ],
    maxTokens: 1000,
  });

  const regex = /```json[c5]?(.*?)```/i;
  const match = regex.exec(matcherResponse.content.text as string);

  if (match) {
    const jsonText = match[1].trim();
    const parsed = JSON.parse(jsonText);
    const matcherRecommendations =
      MatcherRecommendationInputSchema.parse(parsed);
    return matcherRecommendations;
  } else {
    throw new Error(
      "Unable to parse recommendations please provide OpenAPI matchers manually."
    );
  }
}

/**
 * Get user selection for matcher recommendations.
 *
 * @param recommendations The list of matcher recommendations.
 * @param getInput The function to get user input.
 * @returns The selected endpoint matcher.
 */
export async function getUserMatcherSelection(
  recommendations: MatcherRecommendations,
  getInput: GetInputFunction
): Promise<EndpointMatcher> {
  const recommendationsMap: Map<string, string> = new Map();
  recommendations.forEach((rec, index) => {
    recommendationsMap.set(`Recommendation ${index + 1}`, JSON.stringify(rec));
  });

  const result = await getInput({
    message: `Select one of the generated matchers you would want to use \n\n ${recommendations
      .map(
        (rec, index) =>
          `\n\nRecommendation ${index + 1}: \n\n\n ${JSON.stringify(rec)}`
      )
      .join("\n\n")}`,
    requestedSchema: {
      type: "object",
      properties: {
        generatedMatchers: {
          type: "string",
          title: "Generated Matchers",
          description: "Use the matchers generated for the OpenAPI document",
          enum: recommendations.map(
            (_, index) => `Recommendation ${index + 1}`
          ),
        },
      },
      required: ["generatedMatchers"],
    },
  });

  if (result.action === "accept") {
    return EndpointMatcherSchema.parse(
      JSON.parse(
        recommendationsMap.get(result.content?.generatedMatchers as string) ||
          ""
      )
    );
  } else {
    const result = await getInput({
      message:
        "Enter the matchers you would want to use for the OpenAPI document",
      requestedSchema: {
        type: "object",
        properties: {
          enteredMatchers: {
            type: "string",
            title:
              "Enter the matchers you would want to use for the OpenAPI document",
            description:
              "Enter the matchers you would want to use for the OpenAPI document",
          },
        },
        required: ["enteredMatchers"],
      },
    });

    if (result.action === "accept") {
      return EndpointMatcherSchema.parse(
        JSON.parse(result.content?.enteredMatchers as string)
      );
    }

    return {};
  }
}
