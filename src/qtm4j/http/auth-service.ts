import { getUserAgent } from "../../common/info.ts";
import { CONTENT_TYPES, HTTP_HEADERS } from "../config/constants.ts";

/**
 * AuthService handles authentication for QTM4J API requests
 * QTM4J uses API Key based authentication
 */
export class AuthService {
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey.trim();
  }

  /**
   * Get authentication headers for QTM4J API requests
   * @returns Record of HTTP headers including API key authorization
   */
  getAuthHeaders(): Record<string, string> {
    return {
      [HTTP_HEADERS.API_KEY]: this.apiKey,
      [HTTP_HEADERS.CONTENT_TYPE]: CONTENT_TYPES.JSON,
      [HTTP_HEADERS.USER_AGENT]: getUserAgent(),
      [HTTP_HEADERS.ACCEPT]: CONTENT_TYPES.JSON,
    };
  }
}
