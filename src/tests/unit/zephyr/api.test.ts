/**
 * Unit tests for ApiService HTTP communication.
 *
 * Covers GET/POST/PUT operations, error handling, and integration
 * with AuthService for request authentication.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiService } from "../../../zephyr/services/api.js";
import type { AuthService } from "../../../zephyr/services/auth.js";

// Mock fetch globally
const mockFetch = vi.fn();
// @ts-expect-error - mocking global fetch
global.fetch = mockFetch;

// Mock AuthService
const mockAuthService: AuthService = {
    getAuthHeaders: vi.fn().mockReturnValue({
        "Authorization": "Bearer test-token",
        "Content-Type": "application/json",
        "User-Agent": "TestAgent/1.0"
    }),
    validateToken: vi.fn().mockReturnValue(true)
} as any;

describe('ApiService', () => {
    /**
     * Test suite for ApiService HTTP communication.
     */

    const baseUrl = "https://api.zephyrscale.smartbear.com/v2";
    let apiService: ApiService;

    beforeEach(() => {
        vi.clearAllMocks();
        // Reset the mock to return expected headers
        vi.mocked(mockAuthService.getAuthHeaders).mockReturnValue({
            "Authorization": "Bearer test-token",
            "Content-Type": "application/json",
            "User-Agent": "TestAgent/1.0"
        });
        apiService = new ApiService(baseUrl, mockAuthService);
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with valid parameters', () => {
            const service = new ApiService(baseUrl, mockAuthService);
            expect(service).toBeInstanceOf(ApiService);
        });

        it('should throw error for empty baseUrl', () => {
            expect(() => new ApiService("", mockAuthService)).toThrow(
                "Base URL is required and cannot be empty"
            );
        });

        it('should throw error for missing authService', () => {
            expect(() => {
                // @ts-expect-error Testing invalid input
                new ApiService(baseUrl, null);
            }).toThrow("AuthService is required");
        });
    });

    describe('HTTP methods', () => {
        describe('GET method', () => {
            it('should make successful GET request', async () => {
                const mockResponse = { id: 1, name: "Test" };
                mockFetch.mockResolvedValue({
                    ok: true,
                    json: vi.fn().mockResolvedValue(mockResponse)
                });

                const result = await apiService.get<typeof mockResponse>("/test-cases");

                expect(mockFetch).toHaveBeenCalledWith(
                    `${baseUrl}/test-cases`,
                    {
                        method: "GET",
                        headers: {
                            "Authorization": "Bearer test-token",
                            "Content-Type": "application/json",
                            "User-Agent": "TestAgent/1.0"
                        }
                    }
                );
                expect(result).toEqual(mockResponse);
            });

            it('should include query parameters', async () => {
                const mockResponse = { items: [] };
                mockFetch.mockResolvedValue({
                    ok: true,
                    json: vi.fn().mockResolvedValue(mockResponse)
                });

                const params = { limit: 10, offset: 0, status: "active" };
                await apiService.get("/test-cases", params);

                const expectedUrl = `${baseUrl}/test-cases?limit=10&offset=0&status=active`;
                expect(mockFetch).toHaveBeenCalledWith(
                    expectedUrl,
                    expect.any(Object)
                );
            });
        });

        describe('POST method', () => {
            it('should make successful POST request with data', async () => {
                const requestData = { name: "New Test Case", priority: "High" };
                const mockResponse = { id: 1, ...requestData };

                mockFetch.mockResolvedValue({
                    ok: true,
                    json: vi.fn().mockResolvedValue(mockResponse)
                });

                const result = await apiService.post<typeof mockResponse>("/test-cases", requestData);

                expect(mockFetch).toHaveBeenCalledWith(
                    `${baseUrl}/test-cases`,
                    {
                        method: "POST",
                        headers: {
                            "Authorization": "Bearer test-token",
                            "Content-Type": "application/json",
                            "User-Agent": "TestAgent/1.0"
                        },
                        body: JSON.stringify(requestData)
                    }
                );
                expect(result).toEqual(mockResponse);
            });
        });
    });

    describe('error handling', () => {
        it('should handle HTTP error responses with JSON error body', async () => {
            const errorResponse = {
                message: "Validation failed",
                code: "VALIDATION_ERROR",
                details: { field: "name", issue: "required" }
            };

            // Create a mock Response object that behaves like Response but with custom properties
            const mockErrorResponse = {
                ok: false,
                status: 400,
                statusText: "Bad Request",
                url: `${baseUrl}/test-cases`,
                json: vi.fn().mockResolvedValue(errorResponse),
                constructor: Response  // Make it look like a Response instance
            };
            // Make instanceof Response return true
            Object.setPrototypeOf(mockErrorResponse, Response.prototype);

            mockFetch.mockResolvedValue(mockErrorResponse);

            await expect(apiService.get("/test-cases")).rejects.toThrow(
                "GET /test-cases failed: Validation failed"
            );
        });

        it('should handle network errors', async () => {
            const networkError = new Error("Network connection failed");
            mockFetch.mockRejectedValue(networkError);

            await expect(apiService.get("/test-cases")).rejects.toThrow(
                "GET /test-cases failed: Network connection failed"
            );
        });
    });
});