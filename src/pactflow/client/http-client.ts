import { ToolError } from "../../common/tools";

export class HttpClient {
  constructor(
    public readonly baseUrl: string,
    private readonly getHeaders: () => Record<string, string> | undefined,
  ) {}

  async fetch<T>(
    url: string,
    options?: {
      method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
      body?: unknown;
      errorContext?: string;
    },
  ): Promise<T> {
    const { method = "GET", body, errorContext = "Request" } = options ?? {};

    try {
      const response = await fetch(url, {
        method,
        headers: this.getHeaders(),
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        throw new ToolError(
          `${errorContext} Failed - status: ${response.status} ${response.statusText}${errorText ? ` - ${errorText}` : ""}`,
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

  async fetchRaw(url: string, options?: RequestInit): Promise<Response> {
    return fetch(url, { headers: this.getHeaders(), ...options });
  }
}
