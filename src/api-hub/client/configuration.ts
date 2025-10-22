export interface ApiHubConfigurationParameters {
  token: string; // API auth token (required)
  portalBasePath?: string; // Base path for Portal API requests
  registryBasePath?: string; // Base path for Registry API requests
  coreBasePath?: string; // Base path for Core API requests
  headers?: Record<string, string>; // Additional headers for API requests
}

export class ApiHubConfiguration {
  token: string;
  portalBasePath: string;
  registryBasePath: string;
  coreBasePath: string;
  headers: Record<string, string>;

  constructor(param: ApiHubConfigurationParameters) {
    this.token = param.token;
    this.portalBasePath =
      param.portalBasePath || "https://api.dev.portal.swaggerhub.com/v1";
    this.registryBasePath =
      param.registryBasePath || "https://api.int.swaggerhub.com";
    this.coreBasePath =
      param.coreBasePath || "https://sbpgateway.int.swaggerhub.com";
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
