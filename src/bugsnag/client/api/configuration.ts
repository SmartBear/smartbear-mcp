interface ConfigurationParameters {
  apiKey?: string | ((name: string) => string);
  basePath: string;
  headers?: Record<string, string>; // Additional headers for API requests
  validateRequestUrl?: (url: URL) => void;
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
  /**
   * Optional guard run against every redirect destination before it is
   * fetched. Throw to refuse the redirect (e.g. loopback / metadata targets).
   * @memberof Configuration
   */
  validateRequestUrl?: (url: URL) => void;

  constructor(param: ConfigurationParameters) {
    this.apiKey = param.apiKey;
    this.basePath = param.basePath;
    this.headers = param.headers;
    this.validateRequestUrl = param.validateRequestUrl;
  }
}
