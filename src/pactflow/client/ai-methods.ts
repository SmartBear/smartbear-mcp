import {
  isSamplingPolyfillResult,
  type SamplingPolyfillResult,
} from "../../common/pollyfills";
import type { GetInputFunction } from "../../common/types";
import type {
  EndpointMatcher,
  Entitlement,
  GenerationInput,
  GenerationResponse,
  OpenAPI,
  RefineInput,
  RefineResponse,
} from "./ai";
import { PactflowBaseClient } from "./base-client";
import {
  getOADMatcherRecommendations,
  getUserMatcherSelection,
} from "./prompt-utils";

export abstract class PactflowAiMethods extends PactflowBaseClient {
  /**
   * Resolves the endpoint matcher when a document is present but no matcher is specified.
   * Asks for AI recommendations and then prompts the user to select one.
   * Returns a SamplingPolyfillResult if sampling is not supported, null otherwise.
   */
  private async resolveMatcher(
    openapi: { document: OpenAPI; matcher?: EndpointMatcher },
    getInput: GetInputFunction,
  ): Promise<SamplingPolyfillResult | null> {
    const matcherResponse = await getOADMatcherRecommendations(
      openapi.document,
      this.server,
    );

    if (isSamplingPolyfillResult(matcherResponse)) {
      return matcherResponse;
    }

    const userSelection = await getUserMatcherSelection(
      matcherResponse,
      getInput,
    );

    if (isSamplingPolyfillResult(userSelection)) {
      return userSelection;
    }

    openapi.matcher = userSelection;
    return null;
  }

  /**
   * Generate new Pact tests based on the provided input.
   *
   * @param toolInput The input data for the generation process.
   * @param getInput Function to get additional input from the user if needed.
   * @returns The result of the generation process or a polyfill result requiring prompt execution.
   * @throws Error if the HTTP request fails or the operation times out.
   */
  async generate(
    toolInput: GenerationInput,
    getInput: GetInputFunction,
  ): Promise<GenerationResponse | SamplingPolyfillResult> {
    if (
      toolInput.openapi?.document &&
      (!toolInput.openapi?.matcher ||
        Object.keys(toolInput.openapi.matcher).length === 0)
    ) {
      const openapi = {
        document: toolInput.openapi.document,
        matcher: toolInput.openapi.matcher,
      };
      const polyfill = await this.resolveMatcher(openapi, getInput);
      if (polyfill) return polyfill;
      toolInput.openapi.matcher = openapi.matcher;
    }

    const status_response = await this.submitHttpCallback(
      "/generate",
      toolInput,
    );
    return await this.pollForCompletion<GenerationResponse>(
      status_response,
      "Generation",
    );
  }

  /**
   * Review the provided Pact tests and suggest improvements.
   *
   * @param toolInput The input data for the review process.
   * @param getInput Function to get additional input from the user if needed.
   * @returns The result of the review process or a polyfill result requiring prompt execution.
   * @throws Error if the HTTP request fails or the operation times out.
   */
  async review(
    toolInput: RefineInput,
    getInput: GetInputFunction,
  ): Promise<RefineResponse | SamplingPolyfillResult> {
    if (
      toolInput.openapi?.document &&
      (!toolInput.openapi?.matcher ||
        Object.keys(toolInput.openapi.matcher).length === 0)
    ) {
      const openapi = {
        document: toolInput.openapi.document,
        matcher: toolInput.openapi.matcher,
      };
      const polyfill = await this.resolveMatcher(openapi, getInput);
      if (polyfill) return polyfill;
      toolInput.openapi.matcher = openapi.matcher;
    }

    const status_response = await this.submitHttpCallback("/review", toolInput);
    return await this.pollForCompletion<RefineResponse>(
      status_response,
      "Review Pacts",
    );
  }

  /**
   * Retrieve PactFlow AI entitlement information for the current user
   * and organization when encountering 401 unauthorized errors.
   *
   * @returns Entitlement containing permissions, organization entitlements, and user entitlements.
   * @throws Error if the request fails or returns a non-OK response.
   */
  async checkAIEntitlements(): Promise<Entitlement> {
    return await this.fetchJson<Entitlement>(`${this.aiBaseUrl}/entitlement`, {
      method: "GET",
      errorContext: "PactFlow AI Entitlements Request",
    });
  }
}
