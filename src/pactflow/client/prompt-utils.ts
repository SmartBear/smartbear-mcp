import {
  executeSamplingOrPolyfill,
  isSamplingPolyfillResult,
  type SamplingPolyfillResult,
} from "../../common/pollyfills";
import type { SmartBearMcpServer } from "../../common/server";
import { ToolError } from "../../common/tools";
import type { GetInputFunction } from "../../common/types";
import {
  type EndpointMatcher,
  EndpointMatcherSchema,
  MatcherRecommendationInputSchema,
  type MatcherRecommendations,
  type OpenAPI,
} from "./ai";
import { OADMatcherPrompt } from "./prompts";

/**
 * Get OpenAPI matcher recommendations using sampling or polyfill.
 *
 * @param openAPI The OpenAPI document to analyze.
 * @param server The SmartBear MCP server instance.
 * @returns A promise that resolves to the matcher recommendations or a polyfill result.
 * @throws Error if unable to parse recommendations.
 */
export async function getOADMatcherRecommendations(
  openAPI: OpenAPI,
  server: SmartBearMcpServer,
): Promise<MatcherRecommendations | SamplingPolyfillResult> {
  const prompt = OADMatcherPrompt.replace("{0}", JSON.stringify(openAPI));
  const response = await executeSamplingOrPolyfill(server, prompt, 1000);

  if (isSamplingPolyfillResult(response)) {
    return response;
  }

  const regex = /```json[c5]?([\s\S]*?)```/i;
  const match = regex.exec(response);

  if (match) {
    const jsonText = match[1].trim();
    const parsed = JSON.parse(jsonText);
    const matcherRecommendations =
      MatcherRecommendationInputSchema.parse(parsed);
    return matcherRecommendations;
  } else {
    throw new ToolError(
      "Unable to parse recommendations please provide OpenAPI matchers manually.",
    );
  }
}

/**
 * Get user selection for matcher recommendations.
 * Handles both regular recommendations and polyfill results.
 *
 * @param recommendations The list of matcher recommendations or a polyfill result.
 * @param getInput The function to get user input.
 * @returns The selected endpoint matcher or a polyfill result.
 */
export async function getUserMatcherSelection(
  recommendations: MatcherRecommendations | SamplingPolyfillResult,
  getInput: GetInputFunction,
): Promise<EndpointMatcher | SamplingPolyfillResult> {
  if (isSamplingPolyfillResult(recommendations)) {
    return recommendations;
  }

  const recommendationsMap: Map<string, string> = new Map();
  recommendations.forEach((rec, index) => {
    recommendationsMap.set(`Recommendation ${index + 1}`, JSON.stringify(rec));
  });

  const result = await getInput({
    message: `Select one of the generated matchers you would want to use \n\n ${recommendations
      .map(
        (rec, index) =>
          `\n\nRecommendation ${index + 1}: \n\n\n ${JSON.stringify(rec)}`,
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
            (_, index) => `Recommendation ${index + 1}`,
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
          "",
      ),
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
        JSON.parse(result.content?.enteredMatchers as string),
      );
    }

    return {};
  }
}
