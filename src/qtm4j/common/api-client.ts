import { ToolError } from "../../common/tools";
import { AuthService } from "./auth-service";
import {
  CONTENT_TYPES,
  EMPTY_VALUES,
  ERROR_MESSAGES,
  HTTP_HEADERS,
  HTTP_METHODS,
  HTTP_STATUS,
} from "./constants";

/**
 * ApiClient handles HTTP communication with QTM4J REST API
 * Provides methods for GET, POST, PUT operations with proper error handling
 */
export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;

  constructor(apiKey: string, baseUrl: string) {
    this.baseUrl = baseUrl.trim().replace(/\/$/, EMPTY_VALUES.STRING);
    this.defaultHeaders = new AuthService(apiKey).getAuthHeaders();
  }

  /**
   * Construct full URL with query parameters
   * @param endpoint - API endpoint path
   * @param params - Optional query parameters
   * @returns Complete URL string
   */
  getUrl(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    const url = new URL(this.baseUrl + endpoint);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          url.searchParams.append(key, String(value));
        }
      });
    }
    return url.toString();
  }

  /**
   * Perform GET request
   * @param endpoint - API endpoint path
   * @param params - Optional query parameters
   * @returns Parsed response data
   */
  async get(
    endpoint: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<any> {
    const response = await fetch(this.getUrl(endpoint, params), {
      method: HTTP_METHODS.GET,
      headers: this.defaultHeaders,
    });
    return await this.validateAndGetResponseBody(response);
  }

  /**
   * Perform POST request
   * @param endpoint - API endpoint path
   * @param body - Request body object
   * @returns Parsed response data
   */
  async post(endpoint: string, body: object): Promise<any> {
    const response = await fetch(this.getUrl(endpoint), {
      method: HTTP_METHODS.POST,
      headers: {
        ...this.defaultHeaders,
        [HTTP_HEADERS.CONTENT_TYPE]: CONTENT_TYPES.JSON,
      },
      body: JSON.stringify(body),
    });
    return await this.validateAndGetResponseBody(response);
  }

  /**
   * Perform PUT request
   * @param endpoint - API endpoint path
   * @param body - Request body object
   * @returns Parsed response data
   */
  async put(endpoint: string, body: object): Promise<any> {
    const response = await fetch(this.getUrl(endpoint), {
      method: HTTP_METHODS.PUT,
      headers: {
        ...this.defaultHeaders,
        [HTTP_HEADERS.CONTENT_TYPE]: CONTENT_TYPES.JSON,
      },
      body: JSON.stringify(body),
    });
    return await this.validateAndGetResponseBody(response);
  }

  /**
   * Validate HTTP response and extract body
   * Handles various response types: JSON, text, empty responses
   * @param response - HTTP response object
   * @returns Parsed response data or error
   * @throws ToolError if request fails
   */
  private async validateAndGetResponseBody(response: Response) {
    if (!response.ok) {
      const errorText = await response.text();
      throw new ToolError(
        ERROR_MESSAGES.REQUEST_FAILED(response.status, errorText),
      );
    }

    // Check if response has content before parsing JSON
    const contentLength = response.headers.get(HTTP_HEADERS.CONTENT_LENGTH);
    // If content-length is 0 or response is 204 No Content, return empty object
    if (
      response.status === HTTP_STATUS.NO_CONTENT ||
      contentLength === String(EMPTY_VALUES.ZERO)
    ) {
      return EMPTY_VALUES.OBJECT;
    }
    const text = await response.text();
    // If text is empty, return empty object
    if (!text?.trim()) {
      return EMPTY_VALUES.OBJECT;
    }

    // Try to parse as JSON
    try {
      return JSON.parse(text);
    } catch {
      // If it's not JSON, return the text wrapped in an object
      return { data: text };
    }
  }
}
