/**
 * Base API communication service for Zephyr Cloud API.
 *
 * Provides centralized request handling with authentication, error management,
 * and response processing using the native fetch API.
 */

import type { AuthService } from "./auth.js";
import type { ApiError } from "../types.js";

export class ApiService {
    /**
     * Handles HTTP communication with Zephyr Cloud API.
     *
     * Provides centralized request handling with authentication, error management,
     * and response processing.
     *
     * Properties
     * ----------
     * baseUrl : string
     *     Base URL for Zephyr Cloud API
     * authService : AuthService
     *     Authentication service for request headers
     */
    private baseUrl: string;
    private authService: AuthService;

    constructor(baseUrl: string, authService: AuthService) {
        /**
         * Initialize API service with configuration.
         *
         * Parameters
         * ----------
         * baseUrl : string
         *     Base URL for Zephyr Cloud API (e.g., https://api.zephyrscale.smartbear.com/v2)
         * authService : AuthService
         *     Configured authentication service for request headers.
         */
        if (!baseUrl || baseUrl.trim() === "") {
            throw new Error("Base URL is required and cannot be empty");
        }

        if (!authService) {
            throw new Error("AuthService is required");
        }

        this.baseUrl = baseUrl.trim().replace(/\/$/, ""); // Remove trailing slash
        this.authService = authService;
    }

    async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
        /**
         * Execute GET request to Zephyr API.
         *
         * Handles authentication, error reporting, and response parsing with proper
         * TypeScript typing for API responses.
         *
         * Parameters
         * ----------
         * endpoint : string
         *     API endpoint path (without base URL)
         * params : Record<string, any>, optional
         *     Query parameters for the request
         *
         * Returns
         * -------
         * T
         *     Parsed API response data
         *
         * Raises
         * ------
         * Error
         *     If request fails or API returns error response
         */
        try {
            const url: URL = new URL(`${this.baseUrl}/${endpoint.replace(/^\//, "")}`);

            if (params) {
                Object.entries(params).forEach(([key, value]) => {
                    if (value !== null && value !== undefined) {
                        url.searchParams.append(key, String(value));
                    }
                });
            }

            const response: Response = await fetch(url.toString(), {
                method: "GET",
                headers: this.authService.getAuthHeaders()
            });

            if (!response.ok) {
                await this.handleError(response, `GET ${endpoint}`);
            }

            const data: T = await response.json();
            return data;
        } catch (error) {
            return this.handleError(error, `GET ${endpoint}`);
        }
    }

    async post<T>(endpoint: string, data?: any): Promise<T> {
        /**
         * Execute POST request to Zephyr API.
         *
         * Handles authentication, request serialization, error reporting, and response parsing.
         *
         * Parameters
         * ----------
         * endpoint : string
         *     API endpoint path (without base URL)
         * data : any, optional
         *     Request body data to be JSON serialized
         *
         * Returns
         * -------
         * T
         *     Parsed API response data
         *
         * Raises
         * ------
         * Error
         *     If request fails or API returns error response
         */
        try {
            const url: string = `${this.baseUrl}/${endpoint.replace(/^\//, "")}`;

            const response: Response = await fetch(url, {
                method: "POST",
                headers: this.authService.getAuthHeaders(),
                body: data ? JSON.stringify(data) : undefined
            });

            if (!response.ok) {
                await this.handleError(response, `POST ${endpoint}`);
            }

            const responseData: T = await response.json();
            return responseData;
        } catch (error) {
            return this.handleError(error, `POST ${endpoint}`);
        }
    }

    async put<T>(endpoint: string, data?: any): Promise<T> {
        /**
         * Execute PUT request to Zephyr API.
         *
         * Similar to POST but for update operations. Handles authentication and error management.
         *
         * Parameters
         * ----------
         * endpoint : string
         *     API endpoint path (without base URL)
         * data : any, optional
         *     Request body data to be JSON serialized
         *
         * Returns
         * -------
         * T
         *     Parsed API response data
         *
         * Raises
         * ------
         * Error
         *     If request fails or API returns error response
         */
        try {
            const url: string = `${this.baseUrl}/${endpoint.replace(/^\//, "")}`;

            const response: Response = await fetch(url, {
                method: "PUT",
                headers: this.authService.getAuthHeaders(),
                body: data ? JSON.stringify(data) : undefined
            });

            if (!response.ok) {
                await this.handleError(response, `PUT ${endpoint}`);
            }

            const responseData: T = await response.json();
            return responseData;
        } catch (error) {
            return this.handleError(error, `PUT ${endpoint}`);
        }
    }

    private async handleError(error: any, context: string): Promise<never> {
        /**
         * Handle API errors and re-throw for MCP compliance.
         *
         * Processes API errors with context information and re-throws
         * for MCP protocol compliance.
         *
         * Parameters
         * ----------
         * error : any
         *     Original error from API request
         * context : string
         *     Context description for error handling
         *
         * Raises
         * ------
         * Error
         *     Always re-throws the error after processing
         */
        if (error instanceof Response) {
            // Handle HTTP response errors
            let apiError: ApiError;
            try {
                const errorBody: any = await error.json();
                apiError = {
                    message: errorBody.message || `HTTP ${error.status}: ${error.statusText}`,
                    code: errorBody.code || String(error.status),
                    details: errorBody
                };
            } catch {
                // Failed to parse error response as JSON
                apiError = {
                    message: `HTTP ${error.status}: ${error.statusText}`,
                    code: String(error.status),
                    details: { url: error.url }
                };
            }

            throw new Error(`${context} failed: ${apiError.message}`);
        } else if (error instanceof Error) {
            // Handle network or other errors
            throw new Error(`${context} failed: ${error.message}`);
        } else {
            // Handle unknown error types
            throw new Error(`${context} failed: Unknown error occurred`);
        }
    }
}