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
  GetBiDirectionalConsumerProviderVersionInput,
  GetBiDirectionalProviderVersionInput,
  GetBranchVersionsInput,
  GetLabelInput,
  GetVersionDeployedInput,
  LabelByNameInput,
  UpdatePacticipantInput,
  UpdateVersionInput,
  GetCurrentlyDeployedInput,
  GetCurrentlySupportedInput,
  GetEnvironmentInput,
  GetLatestVersionInput,
  GetPacticipantInput,
  GetPacticipantNetworkInput,
  GetPactsForVerificationInput,
  GetVersionInput,
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
      method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
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
