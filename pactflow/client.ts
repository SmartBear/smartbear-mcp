import { GenerationInput, GenerationResponse, RefineInput, RefineResponse, StatusResponse } from "./client/ai.js";
import { ClientType, TOOLS } from "./client/tools.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import { Client, GetInputFunction, RegisterToolsFunction } from "../common/types.js";
import { ProviderStatesResponse } from "./client/base.js";


// Tool definitions for PactFlow AI API client
export class PactflowClient implements Client {
  name = "Contract Testing";
  prefix = "contract-testing";

  private readonly headers: {
    Authorization: string;
    "Content-Type": string;
    "User-Agent": string;
  };
  private readonly aiBaseUrl: string;
  private readonly baseUrl: string;
  private readonly clientType: ClientType;

  constructor(auth: string | { username: string; password: string }, baseUrl?: string, clientType: ClientType = "pactflow") {
    // Set headers based on the type of auth provided
    if (typeof auth === "string") {
      this.headers = {
        Authorization: `Bearer ${auth}`,
        "Content-Type": "application/json",
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
      };
    } else {
      const authString = `${auth.username}:${auth.password}`;
      this.headers = {
        Authorization: `Basic ${Buffer.from(authString).toString("base64")}`,
        "Content-Type": "application/json",
        "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
      };
    }
    this.baseUrl = baseUrl || "https://smartbear.pactflow.io";
    this.aiBaseUrl = `${this.baseUrl}/api/ai`;
    this.clientType = clientType;
  }

  // PactFlow AI client methods

  async generate(body: GenerationInput): Promise<GenerationResponse> {
    // Submit the generation request
    const response = await fetch(`${this.aiBaseUrl}/generate`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const status_response: StatusResponse = await response.json();
    return await this.pollForCompletion<GenerationResponse>(
      status_response,
      "Generation"
    );
  }

  async review(body: RefineInput): Promise<RefineResponse> {
    // submit review request
    const response = await fetch(`${this.aiBaseUrl}/review`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const status_response: StatusResponse = await response.json();
    return await this.pollForCompletion<RefineResponse>(
      status_response,
      "Review Pacts"
    );
  }

  async getStatus(
    statusUrl: string
  ): Promise<{ status: number; isComplete: boolean }> {
    // Convert relative URL to absolute URL if needed
    const fullStatusUrl = statusUrl.startsWith('http') ? statusUrl : `${this.baseUrl}${statusUrl}`;
    const response = await fetch(fullStatusUrl, {
      method: "HEAD",
      headers: this.headers,
    });

    return {
      status: response.status,
      isComplete: response.status === 200,
    };
  }

  async getResult<T>(resultUrl: string): Promise<T> {
    // Convert relative URL to absolute URL if needed
    const fullResultUrl = resultUrl.startsWith('http') ? resultUrl : `${this.baseUrl}${resultUrl}`;
    const response = await fetch(fullResultUrl, {
      method: "GET",
      headers: this.headers,
    });
    // Check if the response is OK (status 200)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  private async pollForCompletion<T>(
    status_response: StatusResponse,
    operationName: string
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
        throw new Error(
          `${operationName} failed with status: ${statusCheck.status}`
        );
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new Error(
      `${operationName} timed out after ${timeout / 1000} seconds`
    );
  }


  // PactFlow / Pact_Broker client methods

  async getProviderStates({ provider }: { provider: string }): Promise<ProviderStatesResponse> {
    const uri_encoded_provider_name = encodeURIComponent(provider);
    const response = await fetch(`${this.baseUrl}/pacts/provider/${uri_encoded_provider_name}/provider-states`, {
      method: "GET",
      headers: this.headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
    }

    return response.json();
  }

  registerTools(register: RegisterToolsFunction, _getInput: GetInputFunction): void {
    for (const tool of TOOLS.filter(t => t.clients.includes(this.clientType))) {
      const { handler, clients, formatResponse, ...toolparams } = tool;
      console.log(clients);
      register(toolparams, async (args, _extra) => {
        const handler_fn = (this as any)[handler];
        if (typeof handler_fn !== "function") {
          throw new Error(`Handler '${handler}' not found on PactClient`);
        }
        const result = await handler_fn.call(this, args);

        // Use custom response formatter if provided
        if (formatResponse) {
          return formatResponse(result);
        }

        // Default fallback
        return {
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      }
      );
    }
  }

}
