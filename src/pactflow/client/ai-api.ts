import type { GetInputFunction } from "../../common/types";
import type {
  Entitlement,
  GenerationInput,
  GenerationResponse,
  RefineInput,
  RefineResponse,
  StatusResponse,
} from "./ai";
import type { HttpClient } from "./http-client";
import {
  getOADMatcherRecommendations,
  type PromptExecutionResult,
} from "./prompt-utils";

export class AIApi {
  constructor(
    private readonly http: HttpClient,
    private readonly aiBaseUrl: string | undefined,
  ) {}

  /**
   * Generate new Pact tests based on the provided input.
   *
   * @param toolInput The input data for the generation process.
   * @returns The result of the generation process or a result requiring prompt execution.
   * @throws Error if the HTTP request fails or the operation times out.
   */
  async generate(
    toolInput: GenerationInput,
    _getInput: GetInputFunction,
  ): Promise<GenerationResponse | PromptExecutionResult> {
    if (
      toolInput.openapi?.document &&
      (!toolInput.openapi?.matcher ||
        Object.keys(toolInput.openapi.matcher).length === 0)
    ) {
      return getOADMatcherRecommendations(toolInput.openapi.document);
    }

    // Submit the generation request
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
   * @returns The result of the review process or a result requiring prompt execution.
   * @throws Error if the HTTP request fails or the operation times out.
   */
  async review(
    toolInput: RefineInput,
    _getInput: GetInputFunction,
  ): Promise<RefineResponse | PromptExecutionResult> {
    if (
      toolInput.openapi?.document &&
      (!toolInput.openapi?.matcher ||
        Object.keys(toolInput.openapi.matcher).length === 0)
    ) {
      return getOADMatcherRecommendations(toolInput.openapi.document);
    }

    // Submit review request
    const status_response = await this.submitHttpCallback("/review", toolInput);
    return await this.pollForCompletion<RefineResponse>(
      status_response,
      "Review Pacts",
    );
  }

  /**
   * Retrieve PactFlow AI entitlement information for the current user
   * and organization when encountering 401 unauthorized errors.
   * Use this to check AI entitlements and credits when AI operations fail.
   *
   * @returns Entitlement containing permissions, organization
   *   entitlements, and user entitlements.
   * @throws Error if the request fails or returns a non-OK response.
   */
  async checkAIEntitlements(): Promise<Entitlement | null> {
    if (this.aiBaseUrl) {
      return await this.http.fetch<Entitlement>(
        `${this.aiBaseUrl}/entitlement`,
        {
          method: "GET",
          errorContext: "PactFlow AI Entitlements Request",
        },
      );
    } else {
      return null;
    }
  }

  /**
   * Polls the given status URL with a HEAD request to check operation progress.
   *
   * @param statusUrl - The URL returned by the async AI operation.
   * @returns HTTP status code and whether the operation has completed (status 200).
   */
  private async getStatus(
    statusUrl: string,
  ): Promise<{ status: number; isComplete: boolean }> {
    const response = await this.http.fetchRaw(statusUrl, { method: "HEAD" });
    return { status: response.status, isComplete: response.status === 200 };
  }

  /**
   * Fetches the final result of a completed async operation.
   *
   * @param resultUrl - The result URL returned by the async AI operation.
   * @returns The parsed JSON result of type T.
   */
  private async getResult<T>(resultUrl: string): Promise<T> {
    return await this.http.fetch<T>(resultUrl);
  }

  /**
   * Polls status_url every second until the operation completes or times out (120s).
   *
   * @param status_response - URLs returned by the initial async submission.
   * @param operationName - Human-readable name used in error messages.
   * @returns The parsed result of type T on success.
   * @throws Error on non-202 status or timeout.
   */
  private async pollForCompletion<T>(
    status_response: StatusResponse,
    operationName: string,
  ): Promise<T> {
    const startTime = Date.now();
    const timeout = 120000; // 120 seconds
    const pollInterval = 1000; // 1 second

    while (Date.now() - startTime < timeout) {
      const statusCheck = await this.getStatus(status_response.status_url);

      if (statusCheck.isComplete) {
        return await this.getResult<T>(status_response.result_url);
      }

      if (statusCheck.status !== 202) {
        throw new Error(
          `${operationName} failed with status: ${statusCheck.status}`,
        );
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `${operationName} timed out after ${timeout / 1000} seconds`,
    );
  }

  /**
   * Submits an HTTP callback request to the PactFlow AI API.
   * @param endpoint The AI API endpoint (relative to aiBaseUrl), e.g., '/generate' or '/review'.
   * @param body The request body specific to the AI operation.
   * @returns StatusResponse with status_url for polling and result_url for fetching results.
   */
  private async submitHttpCallback(
    endpoint: string,
    body: unknown,
  ): Promise<StatusResponse> {
    return await this.http.fetch<StatusResponse>(
      `${this.aiBaseUrl}${endpoint}`,
      {
        method: "POST",
        body,
        errorContext: `HTTP callback submission to ${endpoint}`,
      },
    );
  }

  get handlers(): Record<string, (...args: any[]) => Promise<any>> {
    return {
      generate: this.generate.bind(this),
      review: this.review.bind(this),
      checkAIEntitlements: this.checkAIEntitlements.bind(this),
    };
  }
}
