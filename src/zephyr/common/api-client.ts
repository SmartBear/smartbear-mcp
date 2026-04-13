import { ToolError } from "../../common/tools";
import { AuthService } from "./auth-service";

export class ApiClient {
  public readonly baseUrl: string;
  private readonly tokenProvider: () => string | null;

  constructor(
    tokenOrProvider: string | (() => string | null),
    baseUrl: string,
  ) {
    this.baseUrl = baseUrl.trim().replace(/\/$/, "");

    if (typeof tokenOrProvider === "string") {
      this.tokenProvider = () => tokenOrProvider;
    } else {
      this.tokenProvider = tokenOrProvider;
    }
  }

  public get defaultHeaders(): Record<string, string> {
    return this.getHeaders();
  }

  private getHeaders(): Record<string, string> {
    const token = this.tokenProvider();
    if (!token) {
      throw new ToolError("Zephyr API token not found");
    }
    return new AuthService(token).getAuthHeaders();
  }

  getUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    const url = new URL(this.baseUrl + endpoint);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  async get(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<any> {
    const response = await fetch(this.getUrl(endpoint, params), {
      method: "GET",
      headers: this.getHeaders(),
    });
    return await this.validateAndGetResponseBody(response);
  }

  async post(endpoint: string, body: object): Promise<any> {
    const response = await fetch(this.getUrl(endpoint), {
      method: "POST",
      headers: {
        ...this.getHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return await this.validateAndGetResponseBody(response);
  }

  async put(endpoint: string, body: object): Promise<any> {
    const response = await fetch(this.getUrl(endpoint), {
      method: "PUT",
      headers: {
        ...this.getHeaders(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    return await this.validateAndGetResponseBody(response);
  }

  private async validateAndGetResponseBody(response: Response) {
    if (!response.ok) {
      const errorText = await response.text();
      throw new ToolError(
        `Request failed with status ${response.status}: ${errorText}`,
      );
    }

    // Check if response has content before parsing JSON
    const contentLength = response.headers.get("content-length");
    // If content-length is 0 or response is 204 No Content, return empty object
    if (response.status === 204 || contentLength === "0") {
      return {};
    }
    const text = await response.text();
    // If text is empty, return empty object
    if (!text?.trim()) {
      return {};
    }

    // Try to parse as JSON
    try {
      return JSON.parse(text);
    } catch {
      // If it's not JSON, return the text wrapped in an object
      return { data: text };
    }
  }
}
