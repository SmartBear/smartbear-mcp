import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import { Client, GetInputFunction, RegisterToolsFunction } from "../common/types.js";
import { 
  GenerationResponse, 
  GenerationInput, 
  OpenAPI,
  RefineResponse, 
  RemoteOpenAPIDocument, 
  RemoteOpenAPIDocumentSchema, 
  RefineInput, 
  StatusResponse 
} from "./client/ai.js";
import { CanIDeployInput, CanIDeployResponse, ProviderStatesResponse } from "./client/base.js";
import { ClientType, TOOLS } from "./client/tools.js";
import yaml from "js-yaml";
// @ts-expect-error missing type declarations
import Swagger from "swagger-client";


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
     * @param toolInput The input data for the generation process.
     * @returns The result of the generation process.
     * @throws Error if the HTTP request fails or the operation times out.
     */
    async generate(toolInput: GenerationInput): Promise<GenerationResponse> {
      // Submit the generation request
      if (toolInput.openapi?.remoteDocument) {
        const resolvedSpec = await this.resolveOpenAPISpec(toolInput.openapi.remoteDocument);
        if (toolInput.openapi) {
          toolInput.openapi.document = resolvedSpec;
          delete toolInput.openapi.remoteDocument;
        } else {
          throw new Error("When providing a remote OpenAPI document, the 'openapi' field must at least have a matcher if remote OpenAPI credentials are used.");
        }
      }

      const response = await fetch(`${this.aiBaseUrl}/generate`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(toolInput),
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
     * @param remoteOpenAPIDocument The remote OpenAPI document to resolve.
     * @returns The resolved OpenAPI document.
     * @throws Error if the resolution fails.
     */
    async resolveOpenAPISpec(remoteOpenAPIDocument: RemoteOpenAPIDocument): Promise<OpenAPI> {
      const openAPISchema = RemoteOpenAPIDocumentSchema.safeParse(remoteOpenAPIDocument);
      if (openAPISchema.error || !remoteOpenAPIDocument) {
        throw new Error(`Invalid RemoteOpenAPIDocument: ${JSON.stringify(openAPISchema.error?.issues)}`);
      }
      
      const unresolvedSpec = await this.getRemoteSpecContents(openAPISchema.data);
      const resolvedSpec = await Swagger.resolve({ spec: unresolvedSpec });

      if (resolvedSpec.errors) {
          throw new Error(`Failed to resolve OpenAPI document: ${resolvedSpec.errors?.join(", ")}`);
      }

      return resolvedSpec.spec;
    }

    /**
     * Fetch the contents of a remote OpenAPI document.
     * @param openAPISchema The schema for the remote OpenAPI document.
     * @returns A promise that resolves to a map of the OpenAPI document contents.
     * @throws Error if the URL is not provided or the fetch fails.
     */
    async getRemoteSpecContents(openAPISchema: RemoteOpenAPIDocument): Promise<any> {
      if (!openAPISchema.url) {
        throw new Error("'url' must be provided.");
      }
      
      let headers = {};
      if (openAPISchema.authToken) {
        headers = {
          Authorization: `${openAPISchema.authScheme ?? "Bearer"} ${openAPISchema.authToken}`,
        };
      }

      const remoteSpec = await fetch(openAPISchema.url, {
        headers,
        method: "GET",
      });

      try {
        return await remoteSpec.json();
      } catch {
        try {
          const text = await remoteSpec.text();
          return JSON.parse(JSON.stringify(yaml.load(text), null, 2));
        } catch {
          throw new Error(`Unsupported Content-Type: ${remoteSpec.headers.get("Content-Type")} for remote OpenAPI document.`);
        }
      }
    }

    /**
     * Review the provided Pact tests and suggest improvements.
     * @param toolInput The input data for the review process.
     * @returns The result of the review process.
     * @throws Error if the HTTP request fails or the operation times out.
     */
    async review(toolInput: RefineInput): Promise<RefineResponse> {
      // Submit review request
      if (toolInput.openapi?.remoteDocument) {
        const resolvedSpec = await this.resolveOpenAPISpec(toolInput.openapi.remoteDocument);
        if (toolInput.openapi) {
          toolInput.openapi.document = resolvedSpec;
          delete toolInput.openapi.remoteDocument;
        } else {
          throw new Error("When providing a remote OpenAPI document, the 'openapi' field must at least have a matcher if remote OpenAPI credentials are used.");
        }
      }

      const response = await fetch(`${this.aiBaseUrl}/review`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify(toolInput),
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
          throw new Error(
            `Can-I-Deploy Request Failed - status: ${response.status} ${response.statusText}${
              errorText ? ` - ${errorText}` : ""
            }`
          );
        }

        return (await response.json()) as CanIDeployResponse;
      } catch (error) {
        console.error("[CanIDeploy] Unexpected error:", error);
        throw error;
      }
    }

    registerTools(register: RegisterToolsFunction, _getInput: GetInputFunction): void {
      for (const tool of TOOLS.filter(t => t.clients.includes(this.clientType))) {
        const {handler, clients: _, formatResponse, ...toolparams} = tool; // eslint-disable-line @typescript-eslint/no-unused-vars
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
