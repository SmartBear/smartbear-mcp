import {AuthService} from "./auth-service.js";

export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(bearerToken: string,
              baseUrl: string) {
    this.baseUrl = baseUrl.trim().replace(/\/$/, "");
    this.defaultHeaders = new AuthService(bearerToken).getAuthHeaders()
  }

  getUrl(endpoint: string, params?: Record<string, string | number | boolean>) :string {
    const url = new URL(this.baseUrl + endpoint);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    return url.toString();
  }

  async get(endpoint: string, params?: Record<string, string | number | boolean>): Promise<any> {
    const response = await fetch(
      this.getUrl(endpoint, params),
      {method: 'GET', headers: this.defaultHeaders}
    );
    return response.json();
  }

}
