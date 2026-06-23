import { USER_AGENT } from "../../common/info";
import {
  CLIENT_CONFIG,
  CONTENT_TYPES,
  HTTP_HEADERS,
} from "../config/constants";

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
      [HTTP_HEADERS.USER_AGENT]: USER_AGENT,
      [HTTP_HEADERS.ACCEPT]: CONTENT_TYPES.JSON,
      [HTTP_HEADERS.X_REQUEST_SOURCE]: CLIENT_CONFIG.SOURCE_VALUE,
    };
  }
}
