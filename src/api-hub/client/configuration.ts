export interface ApiHubConfigurationParameters {
  token: string; // API auth token (required)
  portalBasePath?: string; // Base path for Portal API requests
  registryBasePath?: string; // Base path for Registry API requests
  uiBasePath?: string; // Base URL for the SwaggerHub UI
  headers?: Record<string, string>; // Additional headers for API requests
}

export class ApiHubConfiguration {
  token: string;
  portalBasePath: string;
  registryBasePath: string;
  uiBasePath: string;
  headers: Record<string, string>;

  constructor(param: ApiHubConfigurationParameters) {
    this.token = param.token;
    this.portalBasePath =
      param.portalBasePath || "https://api.portal.swaggerhub.com/v1";
    this.registryBasePath =
      param.registryBasePath || "https://api.swaggerhub.com"; // Default for registry API
    this.uiBasePath = param.uiBasePath || "https://app.swaggerhub.com"; // Default for UI
    this.headers = {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      ...param.headers,
    };
  }

  /**
   * Get headers with User-Agent included
   */
  getHeaders(userAgent: string): Record<string, string> {
    return {
      ...this.headers,
      "User-Agent": userAgent,
    };
  }
}
