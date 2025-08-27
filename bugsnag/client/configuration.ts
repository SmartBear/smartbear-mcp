export interface ConfigurationParameters {
    authToken: string; // API auth token (required)
    basePath?: string; // Base path for API requests
    headers?: Record<string, string>; // Additional headers for API requests
}

export class Configuration {
    authToken: string;
    basePath?: string;
    headers?: Record<string, string>;

    constructor(param: ConfigurationParameters) {
        this.authToken = param.authToken;
        this.basePath = param.basePath;
        this.headers = param.headers || {};
    }
}
