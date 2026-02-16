interface ConfigurationParameters {
  apiKey?: string | ((name: string) => string);
  authToken?: string; // Raw auth token for query parameter usage
  basePath: string;
  headers?: Record<string, string>; // Additional headers for API requests
}

export class Configuration {
  /**
   * parameter for apiKey security
   * @param name security name
   * @memberof Configuration
   */
  apiKey?: string | ((name: string) => string);
  /**
   * Raw auth token for query parameter usage
   * @type {string}
   * @memberof Configuration
   */
  authToken?: string;
  /**
   * override base path
   *
   * @type {string}
   * @memberof Configuration
   */
  basePath: string;
  /**
   * Additional headers for API requests
   * @type {Record<string, string>}
   * @memberof Configuration
   */
  headers?: Record<string, string>;

  constructor(param: ConfigurationParameters) {
    this.apiKey = param.apiKey;
    this.authToken = param.authToken;
    this.basePath = param.basePath;
    this.headers = param.headers;
  }
}
