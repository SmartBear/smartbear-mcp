import { GenerationInput, GenerationResponse, RefineInput, RefineResponse, StatusResponse, RemoteOpenAPIDocumentSchema, OpenAPI, RemoteOpenAPIDocument } from "./client/ai.js";
import { ClientType, TOOLS } from "./client/tools.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import { Client, GetInputFunction, RegisterToolsFunction } from "../common/types.js";
import { ProviderStatesResponse } from "./client/base.js";
// @ts-expect-error missing type declarations
import Swagger  from "swagger-client";


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

    constructor(auth: string | { username: string; password: string }, baseUrl: string, clientType: ClientType) {
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
      this.baseUrl = baseUrl;
      this.aiBaseUrl = `${this.baseUrl}/api/ai`;
      this.clientType = clientType;
    }
    
    // PactFlow AI client methods

    /**
     * Generate new Pact tests based on the provided input.
     * @param body The input data for the generation process.
     * @returns The result of the generation process.
     * @throws Error if the HTTP request fails or the operation times out.
     */
    async generate(body: GenerationInput): Promise<GenerationResponse> {
      // Submit the generation request
      if (body.openapi) {
        body.openapi.document = await this.resolveOpenAPISpec(body);
      }

      const response = await fetch(`${this.aiBaseUrl}/generate`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
      }
  
      const status_response: StatusResponse = await response.json();
      return await this.pollForCompletion<GenerationResponse>(
        status_response,
        "Generation"
      );
    }

    /**
     * Resolve the OpenAPI specification from the provided input.
     * @param body The input data for the resolution process.
     * @returns The resolved OpenAPI document.
     * @throws Error if the resolution fails.
     */
    async resolveOpenAPISpec(body: GenerationInput): Promise<OpenAPI> {
      const openAPISchema = RemoteOpenAPIDocumentSchema.safeParse(body.openapi?.document);
      
      if (openAPISchema.success && body.openapi) {
        const unresolvedSpec = await this.getRemoteSpecContents(openAPISchema.data);
        const resolvedSpec = await Swagger.resolve({ spec: unresolvedSpec });

        if (!resolvedSpec.errors?.length) {
          return resolvedSpec.spec;
        }

        throw new Error(`Failed to resolve OpenAPI document: ${resolvedSpec.errors?.join(", ")}`);
      }

      throw new Error(`Invalid OpenAPI schema: ${JSON.stringify(openAPISchema.error?.issues)}`);
    }

    /**
     * Fetch the contents of a remote OpenAPI document.
     * @param openAPISchema The schema for the remote OpenAPI document.
     * @returns A promise that resolves to a map of the OpenAPI document contents.
     * @throws Error if the URL is not provided or the fetch fails.
     */
    async getRemoteSpecContents(openAPISchema: RemoteOpenAPIDocument): Promise<any> {
      if (openAPISchema.url) {
        let headers = {};
        if (openAPISchema.authToken) {
          headers = {
            Authorization: `${openAPISchema.authScheme} ${openAPISchema.authToken}`,
          };
        }

        const remoteSpec = await fetch(openAPISchema.url, {
          headers,
          method: "GET",
        });

        return await remoteSpec.json();
      }

      throw new Error("'url' must be provided.");
    }

    /**
     * Review the provided Pact tests and suggest improvements.
     * @param body The input data for the review process.
     * @returns The result of the review process.
     * @throws Error if the HTTP request fails or the operation times out.
     */
    async review(body: RefineInput): Promise<RefineResponse> {
      // Submit review request
      if (body.openapi) {
        body.openapi.document = await this.resolveOpenAPISpec(body);
      }

      const response = await fetch(`${this.aiBaseUrl}/review`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${await response.text()}`);
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
        const {handler, clients, formatResponse, ...toolparams} = tool;
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
