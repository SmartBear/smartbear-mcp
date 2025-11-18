export interface SwaggerConfigurationParameters {
  token: string; // API auth token (required)
  portalBasePath?: string; // Base path for Portal API requests
  registryBasePath?: string; // Base path for Registry API requests
  uiBasePath?: string; // Base URL for the SwaggerHub UI
  userManagementBasePath?: string; // Base path for User Management API requests
  headers?: Record<string, string>; // Additional headers for API requests
}

export class SwaggerConfiguration {
  token: string;
  portalBasePath: string;
  registryBasePath: string;
  uiBasePath: string;
  userManagementBasePath: string;
  headers: Record<string, string>;

  constructor(param: SwaggerConfigurationParameters) {
    this.token = param.token;
    this.portalBasePath =
      param.portalBasePath || "https://api.portal.swaggerhub.com/v1";
    this.registryBasePath = param.registryBasePath || "http://localhost:8088"; // Default for registry API
    this.uiBasePath = param.uiBasePath || "https://app.swaggerhub.com"; // Default for UI
    this.userManagementBasePath =
      param.userManagementBasePath ||
      "https://api.swaggerhub.com/user-management/v1";
    // Use Bearer token format consistently across all APIs
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
