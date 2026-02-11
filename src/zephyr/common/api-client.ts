import { ToolError } from "../../common/tools";
import { AuthService } from "./auth-service";

export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(bearerToken: string, baseUrl: string) {
    this.baseUrl = baseUrl.trim().replace(/\/$/, "");
    this.defaultHeaders = new AuthService(bearerToken).getAuthHeaders();
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
      headers: this.defaultHeaders,
    });
    return await this.validateAndGetResponseBody(response);
  }

  async post(endpoint: string, body: object): Promise<any> {
    const response = await fetch(this.getUrl(endpoint), {
      method: "POST",
      headers: {
        ...this.defaultHeaders,
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
        ...this.defaultHeaders,
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
    const contentType = response.headers.get("content-type");

    // If content-length is 0 or response is 204 No Content, return empty object
    if (response.status === 204 || contentLength === "0") {
      return {};
    }

    // If there's no content-type, or it's not JSON, try to get text
    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      // If text is empty, return empty object
      if (!text || text.trim() === "") {
        return {};
      }
      // Try to parse as JSON anyway, in case content-type header is missing
      try {
        return JSON.parse(text);
      } catch {
        // If it's not JSON, return the text wrapped in an object
        return { data: text };
      }
    }

    // Usual JSON response
    const text = await response.text();
    if (!text || text.trim() === "") {
      return {};
    }

    return JSON.parse(text);
  }
}
