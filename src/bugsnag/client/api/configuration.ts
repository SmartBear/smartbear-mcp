interface ConfigurationParameters {
  apiKey?: string | ((name: string) => string);
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
    this.basePath = param.basePath;
    this.headers = param.headers;
  }
}
