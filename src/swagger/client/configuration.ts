export interface SwaggerConfigurationParameters {
  token: string | (() => string | null); // API auth token or provider
  portalBasePath?: string; // Base path for Portal API requests
  registryBasePath?: string; // Base path for Registry API requests
  uiBasePath?: string; // Base URL for the SwaggerHub UI
  userManagementBasePath?: string; // Base path for User Management API requests
  headers?: Record<string, string>; // Additional headers for API requests
}

export class SwaggerConfiguration {
  private tokenProvider: () => string | null;
  portalBasePath: string;
  registryBasePath: string;
  uiBasePath: string;
  userManagementBasePath: string;
  defaultHeaders: Record<string, string>;

  constructor(param: SwaggerConfigurationParameters) {
    if (typeof param.token === "string") {
      this.tokenProvider = () => param.token as string;
    } else {
      this.tokenProvider = param.token;
    }

    this.portalBasePath =
      param.portalBasePath || "https://api.portal.swaggerhub.com/v1";
    this.registryBasePath =
      param.registryBasePath || "https://api.swaggerhub.com"; // Default for registry API
    this.uiBasePath = param.uiBasePath || "https://app.swaggerhub.com"; // Default for UI
    this.userManagementBasePath =
      param.userManagementBasePath ||
      `${this.registryBasePath}/user-management/v1`;

    this.defaultHeaders = {
      "Content-Type": "application/json",
      ...param.headers,
    };
  }

  /**
   * Get headers with User-Agent included and dynamic Auth token
   */
  getHeaders(userAgent: string): Record<string, string> {
    const token = this.tokenProvider();
    if (!token) {
      throw new Error("Swagger API token not found");
    }

    return {
      Authorization: `Bearer ${token}`,
      ...this.defaultHeaders,
      "User-Agent": userAgent,
    };
  }
}
