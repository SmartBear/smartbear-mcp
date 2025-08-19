import { GenerationInput, GenerationResponse, StatusResponse } from "./client/ai.js";
import { ClientType, TOOLS } from "./client/tools.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import { Client, GetInputFunction, RegisterResourceFunction, RegisterToolsFunction } from "../common/types.js";


// Tool definitions for PactFlow AI API client
export class PactflowClient implements Client {
    name = "Contract Testing";
    prefix = "contract-testing";

    private headers: {
      Authorization: string;
      "Content-Type": string;
      "User-Agent": string;
    };
    private aiBaseUrl: string;
    private baseUrl: string;
    private clientType: ClientType;

    constructor(auth: string | { username: string; password: string }, baseUrl: string, clientType: ClientType) {
      // Set headers based on the type of auth provided
      if (typeof auth === "string") { 
        this.headers = {
          Authorization: `Bearer ${auth}`,
          "Content-Type": "application/json",
          "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
        };
      } else {
        this.headers = {
          Authorization: `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString("base64")}`,
          "Content-Type": "application/json",
          "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`,
        };
      }
      this.baseUrl = baseUrl;
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
  
    async getStatus(
      statusUrl: string
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
  
    async getResult<T>(resultUrl: string): Promise<T> {
      const response = await fetch(resultUrl, {
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

    async getProviderStates<T>(provider: string): Promise<T> {
      const uri_encoded_provider_name = provider.replace(/ /g, "%20");
      
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
        const {handler, clients, formatResponse, ...toolparams} = tool;
        void clients;
        
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

    // Register resources for supported clients.
    // To add a new resource:
    //   1. Define the list of allowed clients in the `if` condition.
    //   2. Call `register` with the resource name, path, and handler.
    //   3. Only clients in the allowed list will have access to that resource.
    registerResources(register: RegisterResourceFunction): void {
      if(["pactflow", "pact_broker"].includes(this.clientType)) {
        register("get-provider-states", "{provider}", async (uri, variables, _extra) => {
          const states = await this.getProviderStates(variables.provider as string);
          return {
            contents: [{ uri: uri.href, text: JSON.stringify(states) }]
          };
        });
      }
    }
}