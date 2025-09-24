/**
 * Unit tests for AuthService functionality.
 *
 * Covers token validation, header generation, and error handling
 * for authentication scenarios.
 */

import { describe, expect, it } from "vitest";
import { AuthService } from "../../../zephyr/services/auth.js";
import { MCP_SERVER_NAME, MCP_SERVER_VERSION } from "../../../common/info.js";

describe('AuthService', () => {
    /**
     * Test suite for AuthService functionality.
     *
     * Covers token validation, header generation, and error handling
     * for authentication scenarios.
     */

    // Valid JWT token format for testing
    const validJWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

    describe('constructor', () => {
        /**
         * Test AuthService initialization.
         *
         * Tests token validation during construction and error handling
         * for invalid or missing tokens.
         */

        it('should initialize with valid JWT token', () => {
            const authService = new AuthService(validJWT);
            expect(authService).toBeInstanceOf(AuthService);
        });

        it('should throw error for undefined token', () => {
            expect(() => {
                // @ts-expect-error Testing invalid input
                new AuthService(undefined);
            }).toThrow("Access token is required and cannot be empty");
        });

        it('should throw error for empty string token', () => {
            expect(() => {
                new AuthService("");
            }).toThrow("Access token is required and cannot be empty");
        });

        it('should throw error for invalid JWT format', () => {
            expect(() => {
                new AuthService("invalid-token-format");
            }).toThrow("Access token does not appear to be a valid JWT format");
        });
    });

    describe('getAuthHeaders', () => {
        /**
         * Test authentication header generation.
         *
         * Verifies proper Bearer token format, Content-Type, and User-Agent
         * headers are included in API requests.
         */

        it('should return proper authorization header', () => {
            const authService = new AuthService(validJWT);
            const headers = authService.getAuthHeaders();

            expect(headers.Authorization).toBe(`Bearer ${validJWT}`);
        });

        it('should include proper Content-Type header', () => {
            const authService = new AuthService(validJWT);
            const headers = authService.getAuthHeaders();

            expect(headers["Content-Type"]).toBe("application/json");
        });

        it('should include proper User-Agent header', () => {
            const authService = new AuthService(validJWT);
            const headers = authService.getAuthHeaders();

            expect(headers["User-Agent"]).toBe(`${MCP_SERVER_NAME}/${MCP_SERVER_VERSION}`);
        });

        it('should return object with all required headers', () => {
            const authService = new AuthService(validJWT);
            const headers = authService.getAuthHeaders();

            expect(Object.keys(headers)).toEqual([
                "Authorization",
                "Content-Type",
                "User-Agent"
            ]);
        });
    });

    describe('validateToken', () => {
        /**
         * Test JWT token format validation.
         *
         * Tests basic JWT structure validation without signature verification,
         * covering valid and invalid token formats.
         */

        it('should return true for valid JWT format', () => {
            const authService = new AuthService(validJWT);

            expect(authService.validateToken()).toBe(true);
        });

        it('should accept valid base64url characters', () => {
            // JWT with valid base64url characters including - and _
            const validBase64UrlToken = "aBcDeF-123456_789.xYzAbC-987654_321.mNoPqR-456789_123";
            const authService = new AuthService(validBase64UrlToken);

            expect(authService.validateToken()).toBe(true);
        });

        it('should handle edge case of minimum valid JWT', () => {
            // Minimum valid JWT format (single character parts)
            const minimalToken = "a.b.c";
            const authService = new AuthService(minimalToken);

            expect(authService.validateToken()).toBe(true);
        });
    });
});