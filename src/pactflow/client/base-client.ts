import z from "zod";

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../../common/info";
import type { SmartBearMcpServer } from "../../common/server";
import { ToolError } from "../../common/tools";
import type { StatusResponse } from "./ai";
import type { ClientType } from "./tools";

export interface FetchOptions {
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  errorContext?: string;
}

export type RequestHeaders = {
  Authorization: string;
  "Content-Type": string;
  "User-Agent": string;
};

export const ConfigurationSchema = z.object({
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

export type Configuration = z.infer<typeof ConfigurationSchema>;

/**
 * Copies prototype methods from each mixin class onto the target class.
 * Used with interface declaration merging to compose method groups onto PactflowClient
 * without a deep inheritance chain.
 */
export function applyMixins(target: any, mixins: any[]): void {
  for (const mixin of mixins) {
    for (const name of Object.getOwnPropertyNames(mixin.prototype)) {
      if (name === "constructor") continue;
      Object.defineProperty(
        target.prototype,
        name,
        Object.getOwnPropertyDescriptor(mixin.prototype, name) ??
          Object.create(null),
      );
    }
  }
}

export abstract class PactflowBaseClient {
  protected headers: RequestHeaders | undefined;
  protected aiBaseUrl: string | undefined;
  protected baseUrl: string | undefined;
  protected _clientType: ClientType | undefined;

  private _server: SmartBearMcpServer | undefined;

  /** Returns the configured MCP server instance. @throws Error if not yet configured. */
  get server(): SmartBearMcpServer {
    if (!this._server) throw new Error("Server not configured");
    return this._server;
  }

  /** Returns the current auth/content-type headers used for all requests. */
  get requestHeaders() {
    return this.headers;
  }

  /**
   * Initialises the client with auth credentials and the MCP server reference.
   * Accepts either a Bearer token (PactFlow) or username/password (Pact Broker).
   * Does nothing if neither is supplied.
   */
  async configure(
    server: SmartBearMcpServer,
    config: Configuration,
  ): Promise<void> {
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
      return;
    }
    this.baseUrl = config.base_url;
    this.aiBaseUrl = `${this.baseUrl}/api/ai`;
    this._server = server;
  }

  /** Returns true if the client has been configured with a base URL and credentials. */
  isConfigured(): boolean {
    return this.baseUrl !== undefined;
  }

  /**
   * Helper method to fetch JSON data from an API endpoint.
   *
   * @param url The full URL to fetch from.
   * @param options Options including method, body, and error context.
   * @returns The parsed JSON response.
   * @throws ToolError if the request fails.
   */
  protected async fetchJson<T>(url: string, options: FetchOptions): Promise<T> {
    const { method, body, errorContext = "Request" } = options;

    try {
      const response = await fetch(url, {
        method,
        headers: this.headers,
        ...(body !== undefined && { body: JSON.stringify(body) }),
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
   *
   * @param endpoint The AI API endpoint (relative to aiBaseUrl), e.g., '/generate'.
   * @param body The request body specific to the AI operation.
   * @returns StatusResponse with status_url for polling and result_url for fetching results.
   */
  protected async submitHttpCallback(
    endpoint: string,
    body: unknown,
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

  /**
   * Polls status_url every second until the operation completes or times out (120s).
   *
   * @param status_response - URLs returned by the initial async submission.
   * @param operationName - Human-readable name used in error messages.
   * @returns The parsed result of type T on success.
   * @throws ToolError on non-202 status or timeout.
   */
  protected async pollForCompletion<T>(
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
        throw new ToolError(
          `${operationName} failed with status: ${statusCheck.status}`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    throw new ToolError(
      `${operationName} timed out after ${timeout / 1000} seconds`,
    );
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
      headers: this.headers,
    });

    return {
      status: response.status,
      isComplete: response.status === 200,
    };
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
      headers: this.headers,
    });
    if (!response.ok) {
      throw new ToolError(`HTTP error! status: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }
}
