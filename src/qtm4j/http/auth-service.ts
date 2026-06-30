import { USER_AGENT } from "../../common/info";
import { CONTENT_TYPES, HTTP_HEADERS } from "../config/constants";

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
   * Get authentication headers for QTM4J API requests.
   *
   * If the token is a Bearer token (starts with "Bearer "), it is forwarded
   * as-is via the standard `Authorization` header. This supports HTTP-mode
   * deployments where the caller authenticates with an OAuth / JWT token.
   *
   * Otherwise, the raw value is sent as the QTM4J `apiKey` header (the default
   * for API-key–based authentication).
   *
   * @returns Record of HTTP headers including the appropriate auth header
   */
  getAuthHeaders(): Record<string, string> {
    const isBearer = this.apiKey.startsWith("Bearer ");
    return {
      ...(isBearer
        ? { [HTTP_HEADERS.AUTHORIZATION]: this.apiKey }
        : { [HTTP_HEADERS.API_KEY]: this.apiKey }),
      [HTTP_HEADERS.CONTENT_TYPE]: CONTENT_TYPES.JSON,
      [HTTP_HEADERS.USER_AGENT]: USER_AGENT,
      [HTTP_HEADERS.ACCEPT]: CONTENT_TYPES.JSON,
    };
  }
}
