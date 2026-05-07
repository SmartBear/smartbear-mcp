import z from "zod";

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info";
import {
  isSamplingPolyfillResult,
  type SamplingPolyfillResult,
} from "../common/pollyfills";
import { getRequestHeader } from "../common/request-context";
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
  GetBiDirectionalConsumerProviderVersionInput,
  GetBiDirectionalProviderVersionInput,
  GetBranchVersionsInput,
  GetCurrentlyDeployedInput,
  GetCurrentlySupportedInput,
  GetEnvironmentInput,
  GetLabelInput,
  GetLatestVersionInput,
  GetPacticipantInput,
  GetPacticipantNetworkInput,
  GetPactsForVerificationInput,
  GetVersionDeployedInput,
  GetVersionInput,
  LabelByNameInput,
  ListBranchesInput,
  ListVersionsInput,
  MatrixInput,
  MatrixResponse,
  MetricsResponse,
  ProviderStatesResponse,
  PublishConsumerContractsInput,
  PublishProviderContractInput,
  RecordDeploymentInput,
  RecordReleaseInput,
  TeamMetricsResponse,
  UpdatePacticipantInput,
  UpdateVersionInput,
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

  private token: string | undefined;
  private username: string | undefined;
  private password: string | undefined;

  private aiBaseUrl: string | undefined;
  private baseUrl: string | undefined;
  private _clientType: ClientType | undefined;
  private _server: SmartBearMcpServer | undefined;

  /** Returns the configured MCP server instance. @throws Error if not yet configured. */
  get server(): SmartBearMcpServer {
    if (!this._server) throw new Error("Server not configured");
    return this._server;
  }

  /**
   * Initialises the client with auth credentials and the MCP server reference.
   * Accepts either a Bearer token (PactFlow) or username/password (Pact Broker).
   * Does nothing if neither is supplied.
   *
   * @param server - The MCP server instance to bind to.
   * @param config - Connection config (base_url + token OR username/password).
   */
  async configure(
    server: SmartBearMcpServer,
    config: z.infer<typeof ConfigurationSchema>,
  ): Promise<void> {
    this.token = config.token;
    this.username = config.username;
    this.password = config.password;

    // Set client type based on auth provided
    if (typeof config.token === "string") {
      this._clientType = "pactflow";
    } else if (
      typeof config.username === "string" &&
      typeof config.password === "string"
    ) {
      this._clientType = "pact_broker";
    } else {
      // Default to pactflow for dynamic auth
      this._clientType = "pactflow";
    }
    this.baseUrl = config.base_url;
    this.aiBaseUrl = `${this.baseUrl}/api/ai`;
    this._server = server;
  }

  /** Returns true if the client has been configured with a base URL and credentials. */
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
  async checkAIEntitlements(): Promise<Entitlement | null> {
    if (this.aiBaseUrl) {
      return await this.fetchJson<Entitlement>(
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
  async getStatus(
    statusUrl: string,
  ): Promise<{ status: number; isComplete: boolean }> {
    const response = await fetch(statusUrl, {
      method: "HEAD",
      headers: this.requestHeaders,
    });

    return {
      status: response.status,
      isComplete: response.status === 200,
    };
  }

  /** Returns the current auth/content-type headers used for all requests. */
  get requestHeaders() {
    let contextToken =
      getRequestHeader("Pact-Token") || getRequestHeader("Authorization");

    if (Array.isArray(contextToken)) {
      contextToken = contextToken[0];
    }

    if (contextToken) {
      let authHeader = contextToken;
      if (
        !contextToken.startsWith("Basic ") &&
        !contextToken.startsWith("Bearer ")
      ) {
        authHeader = `Bearer ${contextToken}`;
      }

      return {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
      };
    }

    // Fallback to config
    if (this.token) {
      let authHeader = this.token;
      if (
        !authHeader.startsWith("Basic ") &&
        !authHeader.startsWith("Bearer ")
      ) {
        authHeader = `Bearer ${authHeader}`;
      }
      return {
        Authorization: authHeader,
        "Content-Type": "application/json",
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
      };
    } else if (this.username && this.password) {
      const authString = `${this.username}:${this.password}`;
      return {
        Authorization: `Basic ${Buffer.from(authString).toString("base64")}`,
        "Content-Type": "application/json",
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
      };
    }
    return undefined;
  }

  /**
   * Fetches the final result of a completed async operation.
   *
   * @param resultUrl - The result URL returned by the async AI operation.
   * @returns The parsed JSON result of type T.
   * @throws ToolError if the response is not OK.
   */
  async getResult<T>(resultUrl: string): Promise<T> {
    const response = await fetch(resultUrl, {
      method: "GET",
      headers: this.requestHeaders,
    });
    // Check if the response is OK (status 200)
    if (!response.ok) {
      throw new ToolError(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  /**
   * Polls status_url every second until the operation completes or times out (120s).
   *
   * @param status_response - URLs returned by the initial async submission.
   * @param operationName - Human-readable name used in error messages.
   * @returns The parsed result of type T on success.
   * @throws ToolError on non-202 status or timeout.
   */
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
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      body?: any;
      errorContext?: string;
    },
  ): Promise<T> {
    const { method, body, errorContext = "Request" } = options;

    try {
      const response = await fetch(url, {
        method,
        headers: this.requestHeaders,
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

      if (response.status === 204) {
        return undefined as unknown as T;
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

  /**
   * Retrieves all provider states declared by a provider's pact tests.
   *
   * @param params - `provider`: The name of the provider.
   * @returns List of provider state strings the provider supports.
   * @throws ToolError if the request fails.
   */
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
        headers: this.requestHeaders,
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
        headers: this.requestHeaders,
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
   * Retrieves all pacticipants (applications/services) registered in the workspace,
   * with optional pagination.
   *
   * @param params - Optional pagination parameters (`pageNumber`, `pageSize`).
   * @returns List of pacticipants with their metadata.
   * @throws ToolError if the request fails.
   */
  async listPacticipants(params?: {
    pageNumber?: number;
    pageSize?: number;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.pageNumber) queryParams.set("page", String(params.pageNumber));
    if (params?.pageSize) queryParams.set("size", String(params.pageSize));
    const qs = queryParams.toString();
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants${qs ? `?${qs}` : ""}`,
      { method: "GET", errorContext: "List Pacticipants" },
    );
  }

  /**
   * Retrieves metadata for a specific pacticipant by name.
   *
   * @param params - `pacticipantName`: The name of the pacticipant to fetch.
   * @returns Pacticipant metadata including display name, main branch, and repository URL.
   * @throws ToolError if the pacticipant is not found or the request fails.
   */
  async getPacticipant({ pacticipantName }: GetPacticipantInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}`,
      { method: "GET", errorContext: "Get Pacticipant" },
    );
  }

  /**
   * Retrieves all branches for a given pacticipant, with optional name filtering
   * and pagination.
   *
   * @param params - `pacticipantName`, optional `q` (name filter), `pageNumber`, `pageSize`.
   * @returns List of branches for the pacticipant.
   * @throws ToolError if the request fails.
   */
  async listBranches({
    pacticipantName,
    q,
    pageNumber,
    pageSize,
  }: ListBranchesInput): Promise<any> {
    const queryParams = new URLSearchParams();
    if (q) queryParams.set("q", q);
    if (pageNumber) queryParams.set("pageNumber", String(pageNumber));
    if (pageSize) queryParams.set("pageSize", String(pageSize));
    const qs = queryParams.toString();
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/branches${qs ? `?${qs}` : ""}`,
      { method: "GET", errorContext: "List Branches" },
    );
  }

  /**
   * Retrieves all published versions for a given pacticipant, with optional pagination.
   *
   * @param params - `pacticipantName`, optional `pageNumber` and `pageSize`.
   * @returns List of versions with their branch and tag associations.
   * @throws ToolError if the request fails.
   */
  async listVersions({
    pacticipantName,
    pageNumber,
    pageSize,
  }: ListVersionsInput): Promise<any> {
    const queryParams = new URLSearchParams();
    if (pageNumber) queryParams.set("page", String(pageNumber));
    if (pageSize) queryParams.set("size", String(pageSize));
    const qs = queryParams.toString();
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions${qs ? `?${qs}` : ""}`,
      { method: "GET", errorContext: "List Versions" },
    );
  }

  /**
   * Retrieves metadata for a specific version of a pacticipant.
   *
   * @param params - `pacticipantName` and `versionNumber` to retrieve.
   * @returns Version metadata including branches, tags, and build URL.
   * @throws ToolError if the version is not found or the request fails.
   */
  async getVersion({
    pacticipantName,
    versionNumber,
  }: GetVersionInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}`,
      { method: "GET", errorContext: "Get Version" },
    );
  }

  /**
   * Retrieves the latest version of a pacticipant, optionally filtered by tag.
   *
   * @param params - `pacticipantName` and optional `tag` to filter by.
   * @returns The latest matching version.
   * @throws ToolError if the request fails.
   */
  async getLatestVersion({
    pacticipantName,
    tag,
  }: GetLatestVersionInput): Promise<any> {
    const path = tag
      ? `/pacticipants/${encodeURIComponent(pacticipantName)}/latest-version/${encodeURIComponent(tag)}`
      : `/pacticipants/${encodeURIComponent(pacticipantName)}/latest-version`;
    return await this.fetchJson<any>(`${this.baseUrl}${path}`, {
      method: "GET",
      errorContext: "Get Latest Version",
    });
  }

  /**
   * Retrieves all environments configured in the workspace.
   *
   * @returns List of environments with their UUIDs, names, and production flags.
   * @throws ToolError if the request fails.
   */
  async listEnvironments(): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/environments`, {
      method: "GET",
      errorContext: "List Environments",
    });
  }

  /**
   * Retrieves metadata for a specific environment by UUID.
   *
   * @param params - `environmentId`: The UUID of the environment.
   * @returns Environment metadata including name, display name, and production flag.
   * @throws ToolError if the environment is not found or the request fails.
   */
  async getEnvironment({ environmentId }: GetEnvironmentInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/environments/${encodeURIComponent(environmentId)}`,
      { method: "GET", errorContext: "Get Environment" },
    );
  }

  /**
   * Records that a specific version of a pacticipant has been deployed to an environment.
   *
   * @param params - `pacticipantName`, `versionNumber`, `environmentId`, and optional
   *   `applicationInstance` (for blue/green or multi-instance deployments).
   * @returns The created deployment record.
   * @throws ToolError if the request fails.
   */
  async recordDeployment({
    pacticipantName,
    versionNumber,
    environmentId,
    applicationInstance,
  }: RecordDeploymentInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}/deployed-versions/environment/${encodeURIComponent(environmentId)}`,
      {
        method: "POST",
        body: applicationInstance ? { applicationInstance } : {},
        errorContext: "Record Deployment",
      },
    );
  }

  /**
   * Retrieves all versions currently deployed to a given environment.
   *
   * @param params - `environmentId`: The UUID of the environment to query.
   * @returns List of currently deployed versions across all pacticipants.
   * @throws ToolError if the request fails.
   */
  async getCurrentlyDeployed({
    environmentId,
  }: GetCurrentlyDeployedInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/environments/${encodeURIComponent(environmentId)}/deployed-versions/currently-deployed`,
      { method: "GET", errorContext: "Get Currently Deployed" },
    );
  }

  /**
   * Records that a version of a pacticipant has been released to an environment.
   * Used for mobile/library workflows where multiple versions coexist simultaneously.
   *
   * @param params - `pacticipantName`, `versionNumber`, and `environmentId`.
   * @returns The created release record.
   * @throws ToolError if the request fails.
   */
  async recordRelease({
    pacticipantName,
    versionNumber,
    environmentId,
  }: RecordReleaseInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}/released-versions/environment/${encodeURIComponent(environmentId)}`,
      { method: "POST", body: {}, errorContext: "Record Release" },
    );
  }

  /**
   * Retrieves all versions currently released and supported in a given environment.
   *
   * @param params - `environmentId`: The UUID of the environment to query.
   * @returns List of currently supported released versions.
   * @throws ToolError if the request fails.
   */
  async getCurrentlySupported({
    environmentId,
  }: GetCurrentlySupportedInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/environments/${encodeURIComponent(environmentId)}/released-versions/currently-supported`,
      { method: "GET", errorContext: "Get Currently Supported" },
    );
  }

  /**
   * Publishes one or more consumer Pact contracts to the Pact Broker or PactFlow.
   *
   * @param body - Consumer name, version number, contract files (base64-encoded),
   *   and optional branch/tag metadata.
   * @returns Publication result including the pacticipant version number.
   * @throws ToolError if the request fails.
   */
  async publishContracts(body: PublishConsumerContractsInput): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/contracts/publish`, {
      method: "POST",
      body,
      errorContext: "Publish Consumer Contracts",
    });
  }

  /**
   * Publishes a provider OpenAPI contract and its self-verification results to PactFlow
   * for use in Bi-Directional Contract Testing.
   *
   * @param params - `providerName`, version number, base64-encoded OpenAPI spec,
   *   content type, and self-verification results.
   * @returns Publication result.
   * @throws ToolError if the request fails.
   */
  async publishProviderContract({
    providerName,
    ...body
  }: PublishProviderContractInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/provider-contracts/provider/${encodeURIComponent(providerName)}/publish`,
      { method: "POST", body, errorContext: "Publish Provider Contract" },
    );
  }

  /**
   * Retrieves the set of consumer pacts a provider should verify in its current CI run,
   * based on consumer version selectors and WIP/pending pact configuration.
   *
   * @param params - `providerName`, consumer version selectors, pending/WIP flags,
   *   and optional provider branch/tag context.
   * @returns List of pact URLs and metadata the provider must verify.
   * @throws ToolError if the request fails.
   */
  async getPactsForVerification({
    providerName,
    ...body
  }: GetPactsForVerificationInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacts/provider/${encodeURIComponent(providerName)}/for-verification`,
      { method: "POST", body, errorContext: "Get Pacts for Verification" },
    );
  }

  /**
   * Fetches the provider OpenAPI contract for a given provider version in BDCT.
   *
   * @param params - `providerName` and `providerVersionNumber`.
   * @returns The published OpenAPI spec and its verification status.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalProviderContract({
    providerName,
    providerVersionNumber,
  }: GetBiDirectionalProviderVersionInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/provider-contract`,
      { method: "GET", errorContext: "Get BDCT Provider Contract" },
    );
  }

  /**
   * Fetches the self-verification results for a provider contract version in BDCT.
   *
   * @param params - `providerName` and `providerVersionNumber`.
   * @returns The results of the tool (e.g. Dredd, Schemathesis) that verified the provider.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalProviderContractVerificationResults({
    providerName,
    providerVersionNumber,
  }: GetBiDirectionalProviderVersionInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/provider-contract-verification-results`,
      {
        method: "GET",
        errorContext: "Get BDCT Provider Contract Verification Results",
      },
    );
  }

  /**
   * Fetches all consumer Pact contracts relevant to a given provider version in BDCT.
   *
   * @param params - `providerName` and `providerVersionNumber`.
   * @returns Consumer contracts compared against the provider's OpenAPI spec.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalConsumerContract({
    providerName,
    providerVersionNumber,
  }: GetBiDirectionalProviderVersionInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer-contract`,
      { method: "GET", errorContext: "Get BDCT Consumer Contract" },
    );
  }

  /**
   * Fetches the consumer contract verification results for a given provider version in BDCT.
   *
   * @param params - `providerName` and `providerVersionNumber`.
   * @returns Results of comparing all consumer pacts against the provider's OpenAPI spec.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalConsumerContractVerificationResults({
    providerName,
    providerVersionNumber,
  }: GetBiDirectionalProviderVersionInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer-contract-verification-results`,
      {
        method: "GET",
        errorContext: "Get BDCT Consumer Contract Verification Results",
      },
    );
  }

  /**
   * Fetches the cross-contract verification results for a given provider version in BDCT.
   *
   * @param params - `providerName` and `providerVersionNumber`.
   * @returns Combined outcome of PactFlow's automated comparison of the provider spec
   *   against all relevant consumer pacts.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalCrossContractVerificationResults({
    providerName,
    providerVersionNumber,
  }: GetBiDirectionalProviderVersionInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/cross-contract-verification-results`,
      {
        method: "GET",
        errorContext: "Get BDCT Cross-Contract Verification Results",
      },
    );
  }

  /**
   * Fetches the consumer Pact contract for a specific consumer-provider version pair in BDCT.
   *
   * @param params - `providerName`, `providerVersionNumber`, `consumerName`,
   *   and `consumerVersionNumber`.
   * @returns The Pact contract published by the specified consumer version.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalConsumerContractByConsumer({
    providerName,
    providerVersionNumber,
    consumerName,
    consumerVersionNumber,
  }: GetBiDirectionalConsumerProviderVersionInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer/${encodeURIComponent(consumerName)}/version/${encodeURIComponent(consumerVersionNumber)}/consumer-contract`,
      {
        method: "GET",
        errorContext: "Get BDCT Consumer Contract (by consumer version)",
      },
    );
  }

  /**
   * Fetches the provider OpenAPI contract for a specific consumer-provider version pair in BDCT.
   *
   * @param params - `providerName`, `providerVersionNumber`, `consumerName`,
   *   and `consumerVersionNumber`.
   * @returns The provider's OpenAPI spec in the context of the given consumer version.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalProviderContractByConsumer({
    providerName,
    providerVersionNumber,
    consumerName,
    consumerVersionNumber,
  }: GetBiDirectionalConsumerProviderVersionInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer/${encodeURIComponent(consumerName)}/version/${encodeURIComponent(consumerVersionNumber)}/provider-contract`,
      {
        method: "GET",
        errorContext: "Get BDCT Provider Contract (by consumer version)",
      },
    );
  }

  /**
   * Fetches the provider contract self-verification results for a specific
   * consumer-provider version pair in BDCT.
   *
   * @param params - `providerName`, `providerVersionNumber`, `consumerName`,
   *   and `consumerVersionNumber`.
   * @returns Provider self-verification results scoped to the given consumer version.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalProviderContractVerificationResultsByConsumer({
    providerName,
    providerVersionNumber,
    consumerName,
    consumerVersionNumber,
  }: GetBiDirectionalConsumerProviderVersionInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer/${encodeURIComponent(consumerName)}/version/${encodeURIComponent(consumerVersionNumber)}/provider-contract-verification-results`,
      {
        method: "GET",
        errorContext:
          "Get BDCT Provider Contract Verification Results (by consumer version)",
      },
    );
  }

  /**
   * Fetches the consumer contract verification results for a specific
   * consumer-provider version pair in BDCT.
   *
   * @param params - `providerName`, `providerVersionNumber`, `consumerName`,
   *   and `consumerVersionNumber`.
   * @returns Results of comparing the specific consumer pact against the provider's OpenAPI spec.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalConsumerContractVerificationResultsByConsumer({
    providerName,
    providerVersionNumber,
    consumerName,
    consumerVersionNumber,
  }: GetBiDirectionalConsumerProviderVersionInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer/${encodeURIComponent(consumerName)}/version/${encodeURIComponent(consumerVersionNumber)}/consumer-contract-verification-results`,
      {
        method: "GET",
        errorContext:
          "Get BDCT Consumer Contract Verification Results (by consumer version)",
      },
    );
  }

  /**
   * Fetches the cross-contract verification results for a specific
   * consumer-provider version pair in BDCT.
   *
   * @param params - `providerName`, `providerVersionNumber`, `consumerName`,
   *   and `consumerVersionNumber`.
   * @returns The precise cross-contract comparison outcome for the given pairing.
   * @throws ToolError if the request fails.
   */
  async getBiDirectionalCrossContractVerificationResultsByConsumer({
    providerName,
    providerVersionNumber,
    consumerName,
    consumerVersionNumber,
  }: GetBiDirectionalConsumerProviderVersionInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/contracts/bi-directional/provider/${encodeURIComponent(providerName)}/version/${encodeURIComponent(providerVersionNumber)}/consumer/${encodeURIComponent(consumerName)}/version/${encodeURIComponent(consumerVersionNumber)}/cross-contract-verification-results`,
      {
        method: "GET",
        errorContext:
          "Get BDCT Cross-Contract Verification Results (by consumer version)",
      },
    );
  }

  /**
   * Retrieves all consumer-provider integrations registered in the workspace.
   *
   * @returns List of all consumer-provider pairings that have pacts published.
   * @throws ToolError if the request fails.
   */
  async listIntegrations(): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/integrations`, {
      method: "GET",
      errorContext: "List Integrations",
    });
  }

  /**
   * Retrieves the integration network graph for a specific pacticipant,
   * showing all services it consumes and all consumers that depend on it.
   *
   * @param params - `pacticipantName`: The name of the pacticipant.
   * @returns Network graph of consumer-provider relationships for the pacticipant.
   * @throws ToolError if the request fails.
   */
  async getPacticipantNetwork({
    pacticipantName,
  }: GetPacticipantNetworkInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipant/${encodeURIComponent(pacticipantName)}/network`,
      { method: "GET", errorContext: "Get Pacticipant Network" },
    );
  }

  /**
   * Retrieves all labels used across the workspace, with optional pagination.
   *
   * @param params - Optional `pageNumber` and `pageSize`.
   * @returns List of every label applied to any pacticipant.
   * @throws ToolError if the request fails.
   */
  async listLabels(params?: {
    pageNumber?: number;
    pageSize?: number;
  }): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params?.pageNumber) queryParams.set("page", String(params.pageNumber));
    if (params?.pageSize) queryParams.set("size", String(params.pageSize));
    const qs = queryParams.toString();
    return await this.fetchJson<any>(
      `${this.baseUrl}/labels${qs ? `?${qs}` : ""}`,
      { method: "GET", errorContext: "List Labels" },
    );
  }

  /**
   * Checks whether a specific label is applied to a pacticipant.
   *
   * @param params - `pacticipantName` and `labelName`.
   * @returns The label resource if it exists (404 if not applied).
   * @throws ToolError if the request fails.
   */
  async getPacticipantLabel({
    pacticipantName,
    labelName,
  }: GetLabelInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/labels/${encodeURIComponent(labelName)}`,
      { method: "GET", errorContext: "Get Pacticipant Label" },
    );
  }

  /**
   * Retrieves all pacticipants that have a specific label applied.
   *
   * @param params - `labelName`: The label to filter by.
   * @returns List of pacticipants with the given label.
   * @throws ToolError if the request fails.
   */
  async listPacticipantsByLabel({ labelName }: LabelByNameInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/label/${encodeURIComponent(labelName)}`,
      { method: "GET", errorContext: "List Pacticipants by Label" },
    );
  }

  /**
   * Fully replaces a pacticipant's metadata. All fields not provided are cleared.
   *
   * @param params - `pacticipantName` plus optional metadata fields
   *   (displayName, mainBranch, repositoryUrl, etc.).
   * @returns The updated pacticipant resource.
   * @throws ToolError if the request fails.
   */
  async updatePacticipant({
    pacticipantName,
    ...body
  }: UpdatePacticipantInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}`,
      { method: "PUT", body, errorContext: "Update Pacticipant" },
    );
  }

  /**
   * Partially updates a pacticipant's metadata — only the fields provided are changed.
   *
   * @param params - `pacticipantName` plus the specific fields to update.
   * @returns The updated pacticipant resource.
   * @throws ToolError if the request fails.
   */
  async patchPacticipant({
    pacticipantName,
    ...body
  }: UpdatePacticipantInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}`,
      { method: "PATCH", body, errorContext: "Patch Pacticipant" },
    );
  }

  /**
   * Updates metadata for a specific pacticipant version (e.g. sets the build URL).
   *
   * @param params - `pacticipantName`, `versionNumber`, and optional `buildUrl`.
   * @returns The updated version resource.
   * @throws ToolError if the request fails.
   */
  async updateVersion({
    pacticipantName,
    versionNumber,
    ...body
  }: UpdateVersionInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}`,
      { method: "PUT", body, errorContext: "Update Version" },
    );
  }

  /**
   * Retrieves all versions published from a specific branch of a pacticipant.
   *
   * @param params - `pacticipantName`, `branchName`, optional `pageNumber` and `pageSize`.
   * @returns List of versions created on the given branch.
   * @throws ToolError if the request fails.
   */
  async getBranchVersions({
    pacticipantName,
    branchName,
    pageNumber,
    pageSize,
  }: GetBranchVersionsInput): Promise<any> {
    const queryParams = new URLSearchParams();
    if (pageNumber) queryParams.set("page", String(pageNumber));
    if (pageSize) queryParams.set("size", String(pageSize));
    const qs = queryParams.toString();
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/branches/${encodeURIComponent(branchName)}/versions${qs ? `?${qs}` : ""}`,
      { method: "GET", errorContext: "Get Branch Versions" },
    );
  }

  /**
   * Retrieves deployment records for a specific pacticipant version in a given environment.
   *
   * @param params - `pacticipantName`, `versionNumber`, and `environmentId`.
   * @returns All deployment records for the version, including whether each is currently active.
   * @throws ToolError if the request fails.
   */
  async getDeployedVersions({
    pacticipantName,
    versionNumber,
    environmentId,
  }: GetVersionDeployedInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}/deployed-versions/environment/${encodeURIComponent(environmentId)}`,
      { method: "GET", errorContext: "Get Deployed Versions" },
    );
  }

  /**
   * Retrieves release records for a specific pacticipant version in a given environment.
   *
   * @param params - `pacticipantName`, `versionNumber`, and `environmentId`.
   * @returns All release records for the version in the environment.
   * @throws ToolError if the request fails.
   */
  async getReleasedVersions({
    pacticipantName,
    versionNumber,
    environmentId,
  }: GetVersionDeployedInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/versions/${encodeURIComponent(versionNumber)}/released-versions/environment/${encodeURIComponent(environmentId)}`,
      { method: "GET", errorContext: "Get Released Versions" },
    );
  }

  /**
   * Creates a new deployment environment in the workspace.
   *
   * @param body - Environment name, display name, and whether it is a production environment.
   * @returns The created environment resource.
   * @throws ToolError if the request fails.
   */
  async createEnvironment({
    ...body
  }: import("./client/base").CreateEnvironmentInput): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/environments`, {
      method: "POST",
      body,
      errorContext: "Create Environment",
    });
  }

  /**
   * Fully replaces an environment's configuration.
   *
   * @param params - `environmentId` (UUID) plus updated name, display name, and production flag.
   * @returns The updated environment resource.
   * @throws ToolError if the environment is not found or the request fails.
   */
  async updateEnvironment({
    environmentId,
    ...body
  }: import("./client/base").UpdateEnvironmentInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/environments/${encodeURIComponent(environmentId)}`,
      {
        method: "PUT",
        body,
        errorContext: "Update Environment",
      },
    );
  }

  /**
   * Deletes a deployment environment from the workspace.
   *
   * @param params - `environmentId`: UUID of the environment to delete.
   * @throws ToolError if the environment is not found or the request fails.
   */
  async deleteEnvironment({
    environmentId,
  }: import("./client/base").GetEnvironmentInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/environments/${encodeURIComponent(environmentId)}`,
      {
        method: "DELETE",
        errorContext: "Delete Environment",
      },
    );
  }

  /**
   * Registers a new pacticipant (application/service) in the workspace.
   *
   * @param body - Name, optional display name, main branch, and repository URL.
   * @returns The created pacticipant resource.
   * @throws ToolError if the request fails.
   */
  async createPacticipant({
    ...body
  }: import("./client/base").CreatePacticipantInput): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/pacticipants`, {
      method: "POST",
      body,
      errorContext: "Create Pacticipant",
    });
  }

  /**
   * Permanently removes a pacticipant and all its associated data from the workspace.
   *
   * @param params - `pacticipantName`: The name of the pacticipant to delete.
   * @throws ToolError if the request fails.
   */
  async deletePacticipant({
    pacticipantName,
  }: import("./client/base").DeletePacticipantInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}`,
      {
        method: "DELETE",
        errorContext: "Delete Pacticipant",
      },
    );
  }

  /**
   * Retrieves metadata for a specific branch of a pacticipant.
   *
   * @param params - `pacticipantName` and `branchName`.
   * @returns Branch metadata including its versions.
   * @throws ToolError if the branch is not found or the request fails.
   */
  async getBranch({
    pacticipantName,
    branchName,
  }: import("./client/base").GetBranchInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/branches/${encodeURIComponent(branchName)}`,
      { method: "GET", errorContext: "Get Branch" },
    );
  }

  /**
   * Deletes a branch and its version associations from a pacticipant.
   *
   * @param params - `pacticipantName` and `branchName`.
   * @throws ToolError if the branch is not found or the request fails.
   */
  async deleteBranch({
    pacticipantName,
    branchName,
  }: import("./client/base").DeleteBranchInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/branches/${encodeURIComponent(branchName)}`,
      { method: "DELETE", errorContext: "Delete Branch" },
    );
  }

  /**
   * Applies a label to a pacticipant.
   *
   * @param params - `pacticipantName` and `labelName` to apply.
   * @returns The created label resource.
   * @throws ToolError if the request fails.
   */
  async addLabel({
    pacticipantName,
    labelName,
  }: import("./client/base").ManageLabelInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/labels/${encodeURIComponent(labelName)}`,
      { method: "PUT", body: {}, errorContext: "Add Label" },
    );
  }

  /**
   * Removes a label from a pacticipant.
   *
   * @param params - `pacticipantName` and `labelName` to remove.
   * @throws ToolError if the label or pacticipant is not found, or the request fails.
   */
  async removeLabel({
    pacticipantName,
    labelName,
  }: import("./client/base").ManageLabelInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/pacticipants/${encodeURIComponent(pacticipantName)}/labels/${encodeURIComponent(labelName)}`,
      { method: "DELETE", errorContext: "Remove Label" },
    );
  }

  /**
   * Retrieves all consumer-provider integrations assigned to a specific team.
   *
   * @param params - `teamId`: UUID of the team.
   * @returns List of integrations associated with the team.
   * @throws ToolError if the request fails.
   */
  async getIntegrationsByTeam({
    teamId,
  }: import("./client/base").GetIntegrationsByTeamInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/integrations/team/${encodeURIComponent(teamId)}`,
      {
        method: "GET",
        errorContext: "Get Integrations by Team",
      },
    );
  }

  /**
   * Deletes the integration (pact relationship) between a specific consumer and provider.
   *
   * @param params - `providerName` and `consumerName`.
   * @throws ToolError if the integration is not found or the request fails.
   */
  async deleteIntegration({
    providerName,
    consumerName,
  }: import("./client/base").DeleteIntegrationInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/integrations/provider/${encodeURIComponent(providerName)}/consumer/${encodeURIComponent(consumerName)}`,
      { method: "DELETE", errorContext: "Delete Integration" },
    );
  }

  /**
   * Deletes all consumer-provider integrations in the workspace. Use with caution.
   *
   * @throws ToolError if the request fails.
   */
  async deleteAllIntegrations(): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/integrations`, {
      method: "DELETE",
      errorContext: "Delete All Integrations",
    });
  }

  /**
   * Retrieves all webhooks configured in the workspace.
   *
   * @returns List of webhook definitions and their trigger configurations.
   * @throws ToolError if the request fails.
   */
  async listWebhooks(): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/webhooks`, {
      method: "GET",
      errorContext: "List Webhooks",
    });
  }

  /**
   * Retrieves the configuration for a specific webhook by UUID.
   *
   * @param params - `webhookId`: UUID of the webhook.
   * @returns Webhook definition including its URL, events, and consumer/provider filters.
   * @throws ToolError if the webhook is not found or the request fails.
   */
  async getWebhook({
    webhookId,
  }: import("./client/base").WebhookIdInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/webhooks/${encodeURIComponent(webhookId)}`,
      {
        method: "GET",
        errorContext: "Get Webhook",
      },
    );
  }

  /**
   * Creates a new webhook triggered by pact publication or verification events.
   *
   * @param body - Webhook URL, HTTP method, headers, body, events, and optional
   *   consumer/provider filters.
   * @returns The created webhook resource.
   * @throws ToolError if the request fails.
   */
  async createWebhook({
    ...body
  }: import("./client/base").CreateWebhookInput): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/webhooks`, {
      method: "POST",
      body,
      errorContext: "Create Webhook",
    });
  }

  /**
   * Replaces the configuration of an existing webhook.
   *
   * @param params - `webhookId` (UUID) plus the full updated webhook definition.
   * @returns The updated webhook resource.
   * @throws ToolError if the webhook is not found or the request fails.
   */
  async updateWebhook({
    webhookId,
    ...body
  }: import("./client/base").UpdateWebhookInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/webhooks/${encodeURIComponent(webhookId)}`,
      {
        method: "PUT",
        body,
        errorContext: "Update Webhook",
      },
    );
  }

  /**
   * Deletes a webhook by UUID.
   *
   * @param params - `webhookId`: UUID of the webhook to delete.
   * @throws ToolError if the webhook is not found or the request fails.
   */
  async deleteWebhook({
    webhookId,
  }: import("./client/base").WebhookIdInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/webhooks/${encodeURIComponent(webhookId)}`,
      {
        method: "DELETE",
        errorContext: "Delete Webhook",
      },
    );
  }

  /**
   * Fires all webhooks in the workspace as a test, regardless of their trigger conditions.
   *
   * @throws ToolError if the request fails.
   */
  async executeWebhooks(): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/webhooks/execute`, {
      method: "POST",
      body: {},
      errorContext: "Execute Webhooks",
    });
  }

  /**
   * Fires a specific webhook as a test, regardless of its trigger conditions.
   *
   * @param params - `webhookId`: UUID of the webhook to execute.
   * @throws ToolError if the webhook is not found or the request fails.
   */
  async executeWebhook({
    webhookId,
  }: import("./client/base").WebhookIdInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/webhooks/${encodeURIComponent(webhookId)}/execute`,
      {
        method: "POST",
        body: {},
        errorContext: "Execute Webhook",
      },
    );
  }

  /**
   * Retrieves all secrets stored in the workspace (names only, not values).
   *
   * @returns List of secret metadata.
   * @throws ToolError if the request fails.
   */
  async listSecrets(): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/secrets`, {
      method: "GET",
      errorContext: "List Secrets",
    });
  }

  /**
   * Retrieves metadata for a specific secret by UUID (value is not returned).
   *
   * @param params - `secretId`: UUID of the secret.
   * @throws ToolError if the secret is not found or the request fails.
   */
  async getSecret({
    secretId,
  }: import("./client/base").SecretIdInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/secrets/${encodeURIComponent(secretId)}`,
      {
        method: "GET",
        errorContext: "Get Secret",
      },
    );
  }

  /**
   * Creates a new secret for use in webhook configurations.
   *
   * @param body - Secret name, description, and value.
   * @returns The created secret resource (value is not echoed back).
   * @throws ToolError if the request fails.
   */
  async createSecret({
    ...body
  }: import("./client/base").CreateSecretInput): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/secrets`, {
      method: "POST",
      body,
      errorContext: "Create Secret",
    });
  }

  /**
   * Replaces the value and/or description of an existing secret.
   *
   * @param params - `secretId` (UUID) plus updated name, description, and/or value.
   * @throws ToolError if the secret is not found or the request fails.
   */
  async updateSecret({
    secretId,
    ...body
  }: import("./client/base").UpdateSecretInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/secrets/${encodeURIComponent(secretId)}`,
      {
        method: "PUT",
        body,
        errorContext: "Update Secret",
      },
    );
  }

  /**
   * Permanently deletes a secret from the workspace.
   *
   * @param params - `secretId`: UUID of the secret to delete.
   * @throws ToolError if the secret is not found or the request fails.
   */
  async deleteSecret({
    secretId,
  }: import("./client/base").SecretIdInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/secrets/${encodeURIComponent(secretId)}`,
      {
        method: "DELETE",
        errorContext: "Delete Secret",
      },
    );
  }

  /**
   * Retrieves the profile of the currently authenticated user.
   *
   * @returns Current user's name, email, roles, and active status.
   * @throws ToolError if the request fails.
   */
  async getCurrentUser(): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/user`, {
      method: "GET",
      errorContext: "Get Current User",
    });
  }

  /**
   * Lists all API tokens associated with the current user's account.
   *
   * @returns Token metadata (IDs, descriptions) — values are not returned.
   * @throws ToolError if the request fails.
   */
  async listTokens(): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/settings/tokens`, {
      method: "GET",
      errorContext: "List Tokens",
    });
  }

  /**
   * Regenerates (rotates) an API token, invalidating the previous value.
   *
   * @param params - `tokenId`: The identifier of the token to regenerate.
   * @returns The new token value.
   * @throws ToolError if the token is not found or the request fails.
   */
  async regenerateToken({
    tokenId,
  }: import("./client/base").RegenerateTokenInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/settings/tokens/${encodeURIComponent(tokenId)}/regenerate`,
      {
        method: "POST",
        body: {},
        errorContext: "Regenerate Token",
      },
    );
  }

  /**
   * Retrieves UI and notification preferences for the currently authenticated user.
   *
   * @returns User preference settings.
   * @throws ToolError if the request fails.
   */
  async getUserPreferences(): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/preferences/current-user`,
      {
        method: "GET",
        errorContext: "Get User Preferences",
      },
    );
  }

  /**
   * Retrieves workspace-level system preferences and configuration.
   *
   * @returns System preference settings.
   * @throws ToolError if the request fails.
   */
  async getSystemPreferences(): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/preferences/system`, {
      method: "GET",
      errorContext: "Get System Preferences",
    });
  }

  /**
   * Retrieves the workspace audit log with optional filtering and pagination.
   *
   * @param params - Optional filters: `since` (ISO date), `userUuid`, `type`,
   *   `sort`, `from` cursor, `pageNumber`, and `pageSize`.
   * @returns Paginated list of audit events.
   * @throws ToolError if the request fails.
   */
  async getAuditLog(params: import("./client/base").AuditInput): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.since) queryParams.set("since", params.since);
    if (params.userUuid) queryParams.set("userUuid", params.userUuid);
    if (params.type) queryParams.set("type", params.type);
    if (params.sort) queryParams.set("sort", params.sort);
    if (params.from) queryParams.set("from", params.from);
    if (params.pageNumber)
      queryParams.set("pageNumber", String(params.pageNumber));
    if (params.pageSize) queryParams.set("pageSize", String(params.pageSize));
    const qs = queryParams.toString();
    return await this.fetchJson<any>(
      `${this.baseUrl}/audit${qs ? `?${qs}` : ""}`,
      {
        method: "GET",
        errorContext: "Get Audit Log",
      },
    );
  }

  /**
   * Lists all users in the workspace with optional filtering and pagination (admin).
   *
   * @param params - Optional `active` flag, `q` (name/email search), `userType`,
   *   `page`, and `size`.
   * @returns Paginated list of user accounts.
   * @throws ToolError if the request fails.
   */
  async listAdminUsers(
    params: import("./client/base").ListAdminUsersInput,
  ): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.active !== undefined)
      queryParams.set("active", String(params.active));
    if (params.q) queryParams.set("q", params.q);
    if (params.userType !== undefined)
      queryParams.set("userType", String(params.userType));
    if (params.page) queryParams.set("page", String(params.page));
    if (params.size) queryParams.set("size", String(params.size));
    const qs = queryParams.toString();
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/users${qs ? `?${qs}` : ""}`,
      {
        method: "GET",
        errorContext: "List Admin Users",
      },
    );
  }

  /**
   * Retrieves a user's full profile by UUID (admin).
   *
   * @param params - `userId`: UUID of the user.
   * @returns User profile including roles and active status.
   * @throws ToolError if the user is not found or the request fails.
   */
  async getAdminUser({
    userId,
  }: import("./client/base").AdminUserIdInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/users/${encodeURIComponent(userId)}`,
      {
        method: "GET",
        errorContext: "Get Admin User",
      },
    );
  }

  /**
   * Creates a new user account in the workspace (admin).
   *
   * @param body - User name, email, and optional SSO identity fields.
   * @returns The created user resource.
   * @throws ToolError if the request fails.
   */
  async createAdminUser({
    ...body
  }: import("./client/base").CreateAdminUserInput): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/admin/users`, {
      method: "POST",
      body,
      errorContext: "Create Admin User",
    });
  }

  /**
   * Replaces a user's profile (admin). Can also deactivate the user.
   *
   * @param params - `userId` (UUID) plus updated name, email, active flag, and SSO fields.
   * @returns The updated user resource.
   * @throws ToolError if the user is not found or the request fails.
   */
  async updateAdminUser({
    userId,
    ...body
  }: import("./client/base").UpdateAdminUserInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/users/${encodeURIComponent(userId)}`,
      {
        method: "PUT",
        body,
        errorContext: "Update Admin User",
      },
    );
  }

  /**
   * Permanently deletes a user account from the workspace (admin).
   *
   * @param params - `userId`: UUID of the user to delete.
   * @throws ToolError if the user is not found or the request fails.
   */
  async deleteAdminUser({
    userId,
  }: import("./client/base").AdminUserIdInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/users/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        errorContext: "Delete Admin User",
      },
    );
  }

  /**
   * Sends invitation emails to one or more new users (admin).
   *
   * @param params - `users`: Array of objects with email and optional name.
   * @throws ToolError if the request fails.
   */
  async inviteUsers({
    users,
  }: import("./client/base").InviteUsersInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/users/invite-users`,
      {
        method: "POST",
        body: { users },
        errorContext: "Invite Users",
      },
    );
  }

  /**
   * Fully replaces the roles assigned to a user (admin).
   * All existing roles are removed; the provided list becomes the new set.
   *
   * @param params - `userId` (UUID) and `roles` array of role UUIDs.
   * @throws ToolError if the user is not found or the request fails.
   */
  async setUserRoles({
    userId,
    roles,
  }: import("./client/base").SetUserRolesInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/users/${encodeURIComponent(userId)}/roles`,
      {
        method: "PUT",
        body: { roles },
        errorContext: "Set User Roles",
      },
    );
  }

  /**
   * Grants a single additional role to a user without affecting their existing roles (admin).
   *
   * @param params - `userId` and `roleId` UUIDs.
   * @throws ToolError if the user or role is not found, or the request fails.
   */
  async addRoleToUser({
    userId,
    roleId,
  }: import("./client/base").UserRoleInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`,
      { method: "PUT", body: {}, errorContext: "Add Role to User" },
    );
  }

  /**
   * Revokes a specific role from a user without affecting their other roles (admin).
   *
   * @param params - `userId` and `roleId` UUIDs.
   * @throws ToolError if the user or role is not found, or the request fails.
   */
  async removeRoleFromUser({
    userId,
    roleId,
  }: import("./client/base").UserRoleInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/users/${encodeURIComponent(userId)}/roles/${encodeURIComponent(roleId)}`,
      { method: "DELETE", errorContext: "Remove Role from User" },
    );
  }

  /**
   * Lists all teams in the workspace with optional name filtering and pagination (admin).
   *
   * @param params - Optional `q` (name search), `page`, and `size`.
   * @returns Paginated list of teams.
   * @throws ToolError if the request fails.
   */
  async listAdminTeams(
    params: import("./client/base").ListAdminTeamsInput,
  ): Promise<any> {
    const queryParams = new URLSearchParams();
    if (params.q) queryParams.set("q", params.q);
    if (params.page) queryParams.set("page", String(params.page));
    if (params.size) queryParams.set("size", String(params.size));
    const qs = queryParams.toString();
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/teams${qs ? `?${qs}` : ""}`,
      {
        method: "GET",
        errorContext: "List Admin Teams",
      },
    );
  }

  /**
   * Retrieves the full configuration of a team by UUID (admin).
   *
   * @param params - `teamId`: UUID of the team.
   * @returns Team details including name, members, environments, and pacticipants.
   * @throws ToolError if the team is not found or the request fails.
   */
  async getAdminTeam({
    teamId,
  }: import("./client/base").AdminTeamIdInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/teams/${encodeURIComponent(teamId)}`,
      {
        method: "GET",
        errorContext: "Get Admin Team",
      },
    );
  }

  /**
   * Creates a new team in the workspace (admin).
   *
   * @param body - Team name and optional administrators, environments, and pacticipants.
   * @returns The created team resource.
   * @throws ToolError if the request fails.
   */
  async createAdminTeam({
    ...body
  }: import("./client/base").CreateTeamInput): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/admin/teams`, {
      method: "POST",
      body,
      errorContext: "Create Admin Team",
    });
  }

  /**
   * Fully replaces a team's configuration (admin).
   *
   * @param params - `teamId` (UUID) plus updated name, administrators, environments,
   *   and pacticipant assignments.
   * @throws ToolError if the team is not found or the request fails.
   */
  async updateAdminTeam({
    teamId,
    ...body
  }: import("./client/base").UpdateTeamInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/teams/${encodeURIComponent(teamId)}`,
      {
        method: "PUT",
        body,
        errorContext: "Update Admin Team",
      },
    );
  }

  /**
   * Permanently deletes a team from the workspace (admin). Members are not deleted.
   *
   * @param params - `teamId`: UUID of the team to delete.
   * @throws ToolError if the team is not found or the request fails.
   */
  async deleteAdminTeam({
    teamId,
  }: import("./client/base").AdminTeamIdInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/teams/${encodeURIComponent(teamId)}`,
      {
        method: "DELETE",
        errorContext: "Delete Admin Team",
      },
    );
  }

  /**
   * Lists all user members of a specific team (admin).
   *
   * @param params - `teamId`: UUID of the team.
   * @returns List of users in the team.
   * @throws ToolError if the team is not found or the request fails.
   */
  async listTeamUsers({
    teamId,
  }: import("./client/base").AdminTeamIdInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/teams/${encodeURIComponent(teamId)}/users`,
      {
        method: "GET",
        errorContext: "List Team Users",
      },
    );
  }

  /**
   * Verifies whether a specific user is a member of a team (admin).
   * Returns 404 if the user is not in the team.
   *
   * @param params - `teamId` and `userId` UUIDs.
   * @throws ToolError if not found or the request fails.
   */
  async getTeamUser({
    teamId,
    userId,
  }: import("./client/base").TeamUserIdInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/teams/${encodeURIComponent(teamId)}/users/${encodeURIComponent(userId)}`,
      { method: "GET", errorContext: "Get Team User" },
    );
  }

  /**
   * Fully replaces the members of a team (admin).
   * All existing members are removed; the provided UUID list becomes the new membership.
   *
   * @param params - `teamId` (UUID) and `uuids` array of user UUIDs.
   * @throws ToolError if the team is not found or the request fails.
   */
  async setTeamUsers({
    teamId,
    uuids,
  }: import("./client/base").SetTeamUsersInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/teams/${encodeURIComponent(teamId)}/users`,
      {
        method: "PUT",
        body: { uuids },
        errorContext: "Set Team Users",
      },
    );
  }

  /**
   * Adds or removes individual users from a team using JSON Patch semantics (admin).
   *
   * @param params - `teamId` (UUID) and `operations` array of JSON Patch ops (add/remove).
   * @throws ToolError if the team is not found or the request fails.
   */
  async patchTeamUsers({
    teamId,
    operations,
  }: import("./client/base").PatchTeamUsersInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/teams/${encodeURIComponent(teamId)}/users`,
      {
        method: "PATCH",
        body: operations,
        errorContext: "Patch Team Users",
      },
    );
  }

  /**
   * Removes a specific user from a team (admin).
   *
   * @param params - `teamId` and `userId` UUIDs.
   * @throws ToolError if not found or the request fails.
   */
  async removeUserFromTeam({
    teamId,
    userId,
  }: import("./client/base").TeamUserIdInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/teams/${encodeURIComponent(teamId)}/users/${encodeURIComponent(userId)}`,
      { method: "DELETE", errorContext: "Remove User from Team" },
    );
  }

  /**
   * Lists all roles defined in the workspace (admin).
   *
   * @returns All role definitions and their associated permission scopes.
   * @throws ToolError if the request fails.
   */
  async listAdminRoles(): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/admin/roles`, {
      method: "GET",
      errorContext: "List Admin Roles",
    });
  }

  /**
   * Retrieves a role's name, description, and full permission set by UUID (admin).
   *
   * @param params - `roleId`: UUID of the role.
   * @throws ToolError if the role is not found or the request fails.
   */
  async getAdminRole({
    roleId,
  }: import("./client/base").AdminRoleIdInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/roles/${encodeURIComponent(roleId)}`,
      {
        method: "GET",
        errorContext: "Get Admin Role",
      },
    );
  }

  /**
   * Creates a custom role with a tailored set of permission scopes (admin).
   *
   * @param body - Role name, optional description, and array of permission scope strings.
   * @returns The created role resource.
   * @throws ToolError if the request fails.
   */
  async createAdminRole({
    ...body
  }: import("./client/base").CreateRoleInput): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/admin/roles`, {
      method: "POST",
      body,
      errorContext: "Create Admin Role",
    });
  }

  /**
   * Updates an existing role's name and/or permission set (admin).
   * Changes affect all users currently assigned the role.
   *
   * @param params - `roleId` (UUID) plus updated name, description, and permissions.
   * @throws ToolError if the role is not found or the request fails.
   */
  async updateAdminRole({
    roleId,
    ...body
  }: import("./client/base").UpdateRoleInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/roles/${encodeURIComponent(roleId)}`,
      {
        method: "PUT",
        body,
        errorContext: "Update Admin Role",
      },
    );
  }

  /**
   * Permanently deletes a role (admin). Users assigned this role will lose its permissions.
   *
   * @param params - `roleId`: UUID of the role to delete.
   * @throws ToolError if the role is not found or the request fails.
   */
  async deleteAdminRole({
    roleId,
  }: import("./client/base").AdminRoleIdInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/roles/${encodeURIComponent(roleId)}`,
      {
        method: "DELETE",
        errorContext: "Delete Admin Role",
      },
    );
  }

  /**
   * Resets all roles to factory defaults (admin).
   * Custom roles are removed; built-in roles are restored to their original permissions.
   *
   * @throws ToolError if the request fails.
   */
  async resetAdminRoles(): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/admin/roles/reset`, {
      method: "POST",
      body: {},
      errorContext: "Reset Admin Roles",
    });
  }

  /**
   * Lists all permission scopes available to assign to roles (admin).
   *
   * @returns All permission scope definitions.
   * @throws ToolError if the request fails.
   */
  async listAdminPermissions(): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/admin/permissions`, {
      method: "GET",
      errorContext: "List Admin Permissions",
    });
  }

  /**
   * Creates a machine/service account that authenticates via API token (admin).
   *
   * @param body - Account name and optional description.
   * @returns The created system account resource.
   * @throws ToolError if the request fails.
   */
  async createSystemAccount({
    ...body
  }: import("./client/base").CreateSystemAccountInput): Promise<any> {
    return await this.fetchJson<any>(`${this.baseUrl}/admin/system-accounts`, {
      method: "POST",
      body,
      errorContext: "Create System Account",
    });
  }

  /**
   * Retrieves the API tokens associated with a system account (admin).
   *
   * @param params - `accountId`: UUID of the system account.
   * @returns Token list for use in CI/CD pipelines.
   * @throws ToolError if the account is not found or the request fails.
   */
  async getSystemAccountTokens({
    accountId,
  }: import("./client/base").GetSystemAccountTokensInput): Promise<any> {
    return await this.fetchJson<any>(
      `${this.baseUrl}/admin/system-accounts/${encodeURIComponent(accountId)}/tokens`,
      {
        method: "GET",
        errorContext: "Get System Account Tokens",
      },
    );
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
      if (entitlement && !entitlement.aiEnabled) {
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
