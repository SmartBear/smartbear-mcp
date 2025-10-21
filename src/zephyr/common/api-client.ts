import { ToolError } from "../../common/types.js";
import { AuthService } from "./auth-service.js";

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

  private async validateAndGetResponseBody(response: Response) {
    if (!response.ok) {
      const errorText = await response.text();
      throw new ToolError(
        `Request failed with status ${response.status}: ${errorText}`,
      );
    }
    return response.json();
  }
}
