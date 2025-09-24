/**
 * Authentication service for JWT token management in Zephyr Cloud API.
 *
 * Handles access token storage, validation, and generates proper
 * authentication headers for API requests following Zephyr's requirements.
 */

import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../../common/info.js";

export class AuthService {
    /**
     * Handles JWT authentication for Zephyr Cloud API.
     *
     * Manages access token storage, validation, and generates proper
     * authentication headers for API requests following Zephyr's requirements.
     *
     * Properties
     * ----------
     * accessToken : string
     *     JWT access token for API authentication
     */
    private accessToken: string;

    constructor(accessToken: string) {
        /**
         * Initialize authentication service with access token.
         *
         * Parameters
         * ----------
         * accessToken : string
         *     JWT access token for Zephyr Cloud API authentication.
         *
         * Raises
         * ------
         * Error
         *     If accessToken is empty or undefined.
         */
        if (!accessToken || accessToken.trim() === "") {
            throw new Error("Access token is required and cannot be empty");
        }

        this.accessToken = accessToken.trim();

        if (!this.validateToken()) {
            throw new Error("Access token does not appear to be a valid JWT format");
        }
    }

    getAuthHeaders(): Record<string, string> {
        /**
         * Generate authentication headers for API requests.
         *
         * Creates proper Authorization header with Bearer token and includes
         * required Content-Type and User-Agent headers per Zephyr API requirements.
         *
         * Returns
         * -------
         * Record<string, string>
         *     Object containing Authorization, Content-Type, and User-Agent headers.
         */
        return {
            "Authorization": `Bearer ${this.accessToken}`,
            "Content-Type": "application/json",
            "User-Agent": `${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`
        };
    }

    validateToken(): boolean {
        /**
         * Validate the current access token format.
         *
         * Performs basic JWT format validation without signature verification.
         * Actual API authentication is handled by Zephyr Cloud servers.
         *
         * Returns
         * -------
         * boolean
         *     True if token appears to be valid JWT format, false otherwise.
         */
        if (!this.accessToken || typeof this.accessToken !== "string") {
            return false;
        }

        // Basic JWT format validation: should have exactly 3 parts separated by dots
        const parts: string[] = this.accessToken.split(".");
        if (parts.length !== 3) {
            return false;
        }

        // Each part should be non-empty and contain valid base64url characters
        for (const part of parts) {
            if (!part || part.length === 0) {
                return false;
            }
            // Basic check for base64url characters (A-Z, a-z, 0-9, -, _)
            if (!/^[A-Za-z0-9_-]+$/.test(part)) {
                return false;
            }
        }

        return true;
    }
}