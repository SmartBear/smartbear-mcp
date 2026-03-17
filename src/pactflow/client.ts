import z from "zod";

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info";
import {
  isSamplingPolyfillResult,
  type SamplingPolyfillResult,
} from "../common/pollyfills";
import type { SmartBearMcpServer } from "../common/server";
import { ToolError } from "../common/tools";
import type {
  Client,
  GetInputFunction,
  RegisterPromptFunction,
  RegisterToolsFunction,
} from "../common/types";
import type {
  Entitlement,
  GenerationInput,
  GenerationResponse,
  RefineInput,
  RefineResponse,
  StatusResponse,
} from "./client/ai";
import type {
  CanIDeployInput,
  CanIDeployResponse,
  MatrixInput,
  MatrixResponse,
  MetricsResponse,
  ProviderStatesResponse,
  TeamMetricsResponse,
} from "./client/base";
import {
  getOADMatcherRecommendations,
  getUserMatcherSelection,
} from "./client/prompt-utils";
import { PROMPTS } from "./client/prompts";
import { type ClientType, TOOLS } from "./client/tools";

const ConfigurationSchema = z.object({
  base_url: z.url().describe("Pact Broker or PactFlow base URL"),
  token: z
    .string()
    .optional()
    .describe(
      "Bearer token for PactFlow authentication (use this OR username/password)",
    ),
  username: z.string().optional().describe("Username for Pact Broker"),
  password: z.string().optional().describe("Password for Pact Broker"),
});

// Tool definitions for PactFlow AI API client
export class PactflowClient implements Client {
  name = "Contract Testing";
  toolPrefix = "contract-testing";
  configPrefix = "Pact-Broker";
  config = ConfigurationSchema;

  private headers:
    | {
        Authorization: string;
        "Content-Type": string;
        "User-Agent": string;
      }
    | undefined;
  private aiBaseUrl: string | undefined;
  private baseUrl: string | undefined;
  private _clientType: ClientType | undefined;
  private _server: SmartBearMcpServer | undefined;

  get server(): SmartBearMcpServer {
    if (!this._server) throw new Error("Server not configured");
    return this._server;
  }

  async configure(
    server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
  ): Promise<void> {
    // Set headers based on the type of auth provided
    if (typeof config.token === "string") {
      this.headers = {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
      };
      this._clientType = "pactflow";
    } else if (
      typeof config.username === "string" &&
      typeof config.password === "string"
    ) {
      const authString = `${config.username}:${config.password}`;
      this.headers = {
        Authorization: `Basic ${Buffer.from(authString).toString("base64")}`,
        "Content-Type": "application/json",
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
      };
      this._clientType = "pact_broker";
    } else {
      return; // Don't configure the client if no auth is provided
    }
    this.baseUrl = config.base_url;
    this.aiBaseUrl = `${this.baseUrl}/api/ai`;
    this._server = server;
  }

  isConfigured(): boolean {
    return this.baseUrl !== undefined;
  }

  // PactFlow AI client methods

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
      const matcherResponse = await getOADMatcherRecommendations(
        toolInput.openapi.document,
        this.server,
      );

      // Check if we got a polyfill result
      if (isSamplingPolyfillResult(matcherResponse)) {
        return matcherResponse;
      }

      const userSelection = await getUserMatcherSelection(
        matcherResponse,
        getInput,
      );

      // Check if user selection is a polyfill result
      if (isSamplingPolyfillResult(userSelection)) {
        return userSelection;
      }

      toolInput.openapi.matcher = userSelection;
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
      const matcherResponse = await getOADMatcherRecommendations(
        toolInput.openapi.document,
        this.server,
      );

      // Check if we got a polyfill result
      if (isSamplingPolyfillResult(matcherResponse)) {
        return matcherResponse;
      }

      const userSelection = await getUserMatcherSelection(
        matcherResponse,
        getInput,
      );

      // Check if user selection is a polyfill result
      if (isSamplingPolyfillResult(userSelection)) {
        return userSelection;
      }

      toolInput.openapi.matcher = userSelection;
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
  async checkAIEntitlements(): Promise<Entitlement> {
    return await this.fetchJson<Entitlement>(`${this.aiBaseUrl}/entitlement`, {
      method: "GET",
      errorContext: "PactFlow AI Entitlements Request",
    });
  }

  async getStatus(
    statusUrl: string,
  ): Promise<{ status: number; isComplete: boolean }> {
    const response = await fetch(statusUrl, {
      method: "HEAD",
      headers: this.headers,
    });

    return {
      status: response.status,
      isComplete: response.status === 200,
    };
  }

  get requestHeaders() {
    return this.headers;
  }

  async getResult<T>(resultUrl: string): Promise<T> {
    const response = await fetch(resultUrl, {
      method: "GET",
      headers: this.headers,
    });
    // Check if the response is OK (status 200)
    if (!response.ok) {
      throw new ToolError(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  private async pollForCompletion<T>(
    status_response: StatusResponse,
    operationName: string,
  ): Promise<T> {
    // Polling for completion
    const startTime = Date.now();
    const timeout = 120000; // 120 seconds
    const pollInterval = 1000; // 1 second

    while (Date.now() - startTime < timeout) {
      const statusCheck = await this.getStatus(status_response.status_url);

      if (statusCheck.isComplete) {
        // Operation is complete, get the result
        return await this.getResult<T>(status_response.result_url);
      }

      if (statusCheck.status !== 202) {
        throw new ToolError(
          `${operationName} failed with status: ${statusCheck.status}`,
        );
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new ToolError(
      `${operationName} timed out after ${timeout / 1000} seconds`,
    );
  }

  /**
   * Helper method to fetch JSON data from an API endpoint.
   *
   * @param url The full URL to fetch from.
   * @param options Options including method, body, and error context.
   * @returns The parsed JSON response.
   * @throws ToolError if the request fails.
   */
  private async fetchJson<T>(
    url: string,
    options: {
      method: "GET" | "POST";
      body?: any;
      errorContext?: string;
    },
  ): Promise<T> {
    const { method, body, errorContext = "Request" } = options;

    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        ...(body && { body: JSON.stringify(body) }),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new ToolError(
          `${errorContext} Failed - status: ${response.status} ${
            response.statusText
          }${errorText ? ` - ${errorText}` : ""}`,
          undefined,
          new Map<string, number>([["responseStatus", response.status]]),
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof ToolError) {
        throw error;
      }
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`[${errorContext}] Unexpected error: ${error}\n`);
      throw new ToolError(
        `${errorContext} Failed - ${errorMessage}`,
        undefined,
        new Map<string, number>([["responseStatus", 500]]),
      );
    }
  }

  /**
   * Submits an HTTP callback request to the PactFlow AI API.
   * @param endpoint The AI API endpoint (relative to aiBaseUrl), e.g., '/generate' or '/review'.
   * @param body The request body specific to the AI operation.
   * @returns StatusResponse with status_url for polling and result_url for fetching results.
   * @throws ToolError if the request fails.
   */
  private async submitHttpCallback(
    endpoint: string,
    body: any,
  ): Promise<StatusResponse> {
    return await this.fetchJson<StatusResponse>(
      `${this.aiBaseUrl}${endpoint}`,
      {
        method: "POST",
        body,
        errorContext: `HTTP callback submission to ${endpoint}`,
      },
    );
  }

  // PactFlow / Pact_Broker client methods

  async getProviderStates({
    provider,
  }: {
    provider: string;
  }): Promise<ProviderStatesResponse> {
    const uri_encoded_provider_name = encodeURIComponent(provider);
    return await this.fetchJson<ProviderStatesResponse>(
      `${this.baseUrl}/pacts/provider/${uri_encoded_provider_name}/provider-states`,
      {
        method: "GET",
        errorContext: "Get Provider States",
      },
    );
  }

  /**
   * Checks if a given pacticipant version is safe to deploy
   * to a specified environment.
   *
   * @param body - Input containing:
   *   - `pacticipant`: The name of the service (pacticipant).
   *   - `version`: The version of the pacticipant being evaluated for deployment.
   *   - `environment`: The target environment (e.g., staging, production).
   * @returns CanIDeployResponse containing deployment decision and verification results.
   * @throws Error if the request fails or returns a non-OK response.
   */
  async canIDeploy(body: CanIDeployInput): Promise<CanIDeployResponse> {
    const { pacticipant, version, environment } = body;
    const queryParams = new URLSearchParams({
      pacticipant,
      version,
      environment,
    });
    const url = `${this.baseUrl}/can-i-deploy?${queryParams.toString()}`;

    return await this.fetchJson<CanIDeployResponse>(url, {
      method: "GET",
      errorContext: "Can-I-Deploy Request",
    });
  }

  /**
   * Retrieves the matrix of pact verification results for the specified pacticipants.
   * This allows you to see which consumer/provider combinations have been verified
   * and make deployment decisions based on contract test results.
   *
   * @param body - Matrix query parameters including pacticipants, versions, environments, etc.
   * @returns MatrixResponse containing the verification matrix, notices, and summary
   * @throws Error if the request fails or returns a non-OK response
   */
  async getMatrix(body: MatrixInput): Promise<MatrixResponse> {
    const { q, latestby, limit } = body;

    // Build query parameters manually to avoid URL encoding of square brackets
    const queryParts: string[] = [];

    // Add optional parameters
    if (latestby) {
      queryParts.push(`latestby=${encodeURIComponent(latestby)}`);
    }
    if (limit !== undefined) {
      queryParts.push(`limit=${limit}`);
    }

    // Add the q parameters (pacticipant selectors)
    q.forEach((selector) => {
      queryParts.push(
        `q[]pacticipant=${encodeURIComponent(selector.pacticipant)}`,
      );

      if (selector.version) {
        queryParts.push(`q[]version=${encodeURIComponent(selector.version)}`);
      }

      if (selector.branch) {
        queryParts.push(`q[]branch=${encodeURIComponent(selector.branch)}`);
      }
      if (selector.environment) {
        queryParts.push(
          `q[]environment=${encodeURIComponent(selector.environment)}`,
        );
      }
      if (selector.latest !== undefined) {
        queryParts.push(`q[]latest=${selector.latest}`);
      }
      if (selector.tag) {
        queryParts.push(`q[]tag=${encodeURIComponent(selector.tag)}`);
      }
      if (selector.mainBranch !== undefined) {
        queryParts.push(`q[]mainBranch=${selector.mainBranch}`);
      }
    });

    const url = `${this.baseUrl}/matrix?${queryParts.join("&")}`;

    return await this.fetchJson<MatrixResponse>(url, {
      method: "GET",
      errorContext: "Matrix Request",
    });
  }

  /**
   * Retrieves metrics across the workspace.
   *
   * @returns MetricsResponse containing workspace-wide metrics
   * @throws Error if the request fails or returns a non-OK response
   */
  async getMetrics(): Promise<MetricsResponse> {
    const url = `${this.baseUrl}/metrics`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new ToolError(
          `Metrics Request Failed - status: ${response.status} ${response.statusText}${
            errorText ? ` - ${errorText}` : ""
          }`,
        );
      }

      return (await response.json()) as MetricsResponse;
    } catch (error) {
      console.error("[GetMetrics] Unexpected error:", error);
      throw error;
    }
  }

  /**
   * Retrieves metrics for all teams.
   *
   * @returns TeamMetricsResponse containing metrics for all teams
   * @throws Error if the request fails or returns a non-OK response
   */
  async getTeamMetrics(): Promise<TeamMetricsResponse> {
    const url = `${this.baseUrl}/metrics/teams`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new ToolError(
          `Team Metrics Request Failed - status: ${response.status} ${response.statusText}${
            errorText ? ` - ${errorText}` : ""
          }`,
        );
      }

      return (await response.json()) as TeamMetricsResponse;
    } catch (error) {
      console.error("[GetTeamMetrics] Unexpected error:", error);
      throw error;
    }
  }

  /**
   * Registers tools with the provided register function.
   *
   * @param register - The function used to register tools.
   * @param getInput - The function used to get input for tools.
   */
  async registerTools(
    register: RegisterToolsFunction,
    getInput: GetInputFunction,
  ): Promise<void> {
    let disablePactflowAItools = false;
    try {
      const entitlement = await this.checkAIEntitlements();
      if (!entitlement.aiEnabled) {
        disablePactflowAItools = true;
      }
    } catch (error) {
      if (
        error instanceof ToolError &&
        error.metadata?.get("responseStatus") === 404
      ) {
        disablePactflowAItools = true;
      }
    }

    for (const tool of TOOLS.filter(
      (t) => !this._clientType || t.clients.includes(this._clientType),
    )) {
      if (
        tool.tags &&
        disablePactflowAItools &&
        tool.tags.includes("pactflow-ai")
      ) {
        continue;
      }

      const { handler, clients: _, formatResponse, ...toolparams } = tool;
      register(toolparams, async (args, _extra) => {
        const handler_fn = (this as any)[handler];
        if (typeof handler_fn !== "function") {
          throw new Error(`Handler '${handler}' not found on PactClient`);
        }

        let result: any;
        if (tool.enableElicitation) {
          result = await handler_fn.call(this, args, getInput);
        } else {
          result = await handler_fn.call(this, args);
        }

        // Use custom response formatter if provided
        if (formatResponse) {
          return formatResponse(result);
        }

        // Default fallback
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      });
    }
  }

  /**
   * Registers prompts with the provided register function.
   *
   * @param register - The function used to register prompts.
   */
  registerPrompts(register: RegisterPromptFunction): void {
    PROMPTS.forEach((prompt) => {
      register(prompt.name, prompt.params, prompt.callback);
    });
  }
}
