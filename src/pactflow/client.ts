import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import z from "zod";

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import type { SmartBearMcpServer } from "../common/server.js";
import {
  type Client,
  type GetInputFunction,
  type RegisterPromptFunction,
  type RegisterToolsFunction,
  ToolError,
} from "../common/types.js";
import type {
  Entitlement,
  GenerationInput,
  GenerationResponse,
  RefineInput,
  RefineResponse,
  StatusResponse,
} from "./client/ai.js";
import type {
  CanIDeployInput,
  CanIDeployResponse,
  MatrixInput,
  MatrixResponse,
  ProviderStatesResponse,
} from "./client/base.js";
import {
  getOADMatcherRecommendations,
  getUserMatcherSelection,
} from "./client/prompt-utils.js";
import { PROMPTS } from "./client/prompts.js";
import { type ClientType, TOOLS } from "./client/tools.js";

const ConfigurationSchema = z.object({
    base_url: z.string().describe("Pact Broker or PactFlow base URL"),
    token: z.string().optional().describe("Bearer token for PactFlow authentication (use this OR username/password)"),
    username: z.string().optional().describe("Username for Pact Broker"),
    password: z.string().optional().describe("Password for Pact Broker"),
  });

// Tool definitions for PactFlow AI API client
export class PactflowClient implements Client {
  name = "Contract Testing";
  prefix = "contract-testing";
  config = ConfigurationSchema;

  private headers: {
    Authorization: string;
    "Content-Type": string;
    "User-Agent": string;
  } | undefined;
  private aiBaseUrl: string | undefined;
  private baseUrl: string | undefined;
  private _clientType: ClientType | undefined;
  private _server: Server | undefined;

  get server(): Server {
    if (!this._server) throw new Error("Server not configured");
    return this._server;
  }

  get clientType(): ClientType {
    if (!this._clientType) throw new Error("Client not configured");
    return this._clientType;
  }

  async configure(server: SmartBearMcpServer, config: z.infer<typeof ConfigurationSchema>): Promise<boolean> {
    // Set headers based on the type of auth provided
    if (typeof config.token === "string") {
      this.headers = {
        Authorization: `Bearer ${config.token}`,
        "Content-Type": "application/json",
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
      };
      this._clientType = "pactflow";
    } else if (typeof config.username === "string" && typeof config.password === "string") {
      const authString = `${config.username}:${config.password}`;
      this.headers = {
        Authorization: `Basic ${Buffer.from(authString).toString("base64")}`,
        "Content-Type": "application/json",
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
      };
      this._clientType = "pact_broker";
    } else {
      return false;  // Don't configure the client if no auth is provided
    }
    this.baseUrl = config.base_url;
    this.aiBaseUrl = `${this.baseUrl}/api/ai`;
    this._server = server.server;
    return true;
  }

  // PactFlow AI client methods

  /**
   * Generate new Pact tests based on the provided input.
   *
   * @param toolInput The input data for the generation process.
   * @param getInput Function to get additional input from the user if needed.
   * @returns The result of the generation process.
   * @throws Error if the HTTP request fails or the operation times out.
   */
  async generate(
    toolInput: GenerationInput,
    getInput: GetInputFunction,
  ): Promise<GenerationResponse> {
    if (
      toolInput.openapi?.document &&
      (!toolInput.openapi?.matcher ||
        Object.keys(toolInput.openapi.matcher).length === 0)
    ) {
      const matcherResponse = await getOADMatcherRecommendations(
        toolInput.openapi.document,
        this.server,
      );
      const userSelection = await getUserMatcherSelection(
        matcherResponse,
        getInput,
      );
      toolInput.openapi.matcher = userSelection;
    }

    // Submit the generation request
    const response = await fetch(`${this.aiBaseUrl}/generate`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(toolInput),
    });

    if (!response.ok) {
      throw new ToolError(
        `HTTP error! status: ${response.status} - ${await response.text()}`,
      );
    }

    const status_response: StatusResponse = await response.json();
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
   * @returns The result of the review process.
   * @throws Error if the HTTP request fails or the operation times out.
   */
  async review(
    toolInput: RefineInput,
    getInput: GetInputFunction,
  ): Promise<RefineResponse> {
    if (
      toolInput.openapi?.document &&
      (!toolInput.openapi?.matcher ||
        Object.keys(toolInput.openapi.matcher).length === 0)
    ) {
      const matcherResponse = await getOADMatcherRecommendations(
        toolInput.openapi.document,
        this.server,
      );
      const userSelection = await getUserMatcherSelection(
        matcherResponse,
        getInput,
      );
      toolInput.openapi.matcher = userSelection;
    }

    // Submit review request
    const response = await fetch(`${this.aiBaseUrl}/review`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(toolInput),
    });

    if (!response.ok) {
      throw new ToolError(
        `HTTP error! status: ${response.status} - ${await response.text()}`,
      );
    }

    const status_response: StatusResponse = await response.json();
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
    const url = `${this.aiBaseUrl}/entitlement`;

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new ToolError(
          `PactFlow AI Entitlements Request Failed - status: ${response.status} ${response.statusText}${
            errorText ? ` - ${errorText}` : ""
          }`,
        );
      }

      return (await response.json()) as Entitlement;
    } catch (error) {
      process.stderr.write(
        `[CheckAIEntitlements] Unexpected error: ${error}\n`,
      );
      throw error;
    }
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

  // PactFlow / Pact_Broker client methods

  async getProviderStates({
    provider,
  }: {
    provider: string;
  }): Promise<ProviderStatesResponse> {
    const uri_encoded_provider_name = encodeURIComponent(provider);
    const response = await fetch(
      `${this.baseUrl}/pacts/provider/${uri_encoded_provider_name}/provider-states`,
      {
        method: "GET",
        headers: this.headers,
      },
    );

    if (!response.ok) {
      throw new ToolError(
        `HTTP error! status: ${response.status} - ${await response.text()}`,
      );
    }

    return response.json();
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

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new ToolError(
          `Can-I-Deploy Request Failed - status: ${response.status} ${response.statusText}${
            errorText ? ` - ${errorText}` : ""
          }`,
        );
      }

      return (await response.json()) as CanIDeployResponse;
    } catch (error) {
      console.error(`[CanIDeploy] Unexpected error: ${error}\n`);
      throw error;
    }
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

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: this.headers,
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new ToolError(
          `Matrix Request Failed - status: ${response.status} ${response.statusText}${
            errorText ? ` - ${errorText}` : ""
          }`,
        );
      }

      return (await response.json()) as MatrixResponse;
    } catch (error) {
      console.error("[GetMatrix] Unexpected error:", error);
      throw error;
    }
  }

  /**
   * Registers tools with the provided register function.
   *
   * @param register - The function used to register tools.
   * @param getInput - The function used to get input for tools.
   */
  registerTools(
    register: RegisterToolsFunction,
    getInput: GetInputFunction,
  ): void {
    for (const tool of TOOLS.filter((t) =>
      t.clients.includes(this.clientType),
    )) {
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
