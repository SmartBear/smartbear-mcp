export interface ApiHubConfigurationParameters {
	token: string; // API auth token (required)
	basePath?: string; // Base path for API requests
	headers?: Record<string, string>; // Additional headers for API requests
}

export class ApiHubConfiguration {
	token: string;
	basePath: string;
	headers: Record<string, string>;

	constructor(param: ApiHubConfigurationParameters) {
		this.token = param.token;
		this.basePath = param.basePath || "https://api.portal.swaggerhub.com/v1";
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
