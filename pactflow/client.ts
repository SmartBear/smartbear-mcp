import { GenerationInput, GenerationResponse, StatusResponse } from "./client/ai.js";
import { ClientType, TOOLS } from "./client/tools.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../common/info.js";
import { Client } from "../common/types.js";


// Tool definitions for PactFlow AI API client
export class PactflowClient implements Client {
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
    
    registerTools(server: McpServer): void {
      for (const tool of TOOLS.filter(t => t.clients.includes(this.clientType))) {
        server.tool(
          tool.name,
          tool.description,
          tool.inputSchema,
          async (args: any, _extra: any) => {
            const handler = (this as any)[tool.handler];
            if (typeof handler !== "function") {
              throw new Error(`Handler '${tool.handler}' not found on PactClient`);
            }
            
            const result = await handler.call(this, args);
            
            // Use custom response formatter if provided
            if (tool.formatResponse) {
              return tool.formatResponse(result);
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