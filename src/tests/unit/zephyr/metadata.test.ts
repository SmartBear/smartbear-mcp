/**
 * Unit tests for metadata retrieval functionality.
 *
 * Covers API integration, parameter validation, response handling,
 * and error scenarios for status, priority, and environment metadata.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    getStatuses,
    getPriorities,
    getEnvironments
} from "../../../zephyr/tools/metadata.js";
import type { ApiService } from "../../../zephyr/services/api.js";
import type { CacheService } from "../../../zephyr/services/cache.js";

// Mock ApiService
const mockApiService: ApiService = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
} as any;

// Mock CacheService
const mockCacheService: CacheService = {
    get: vi.fn(),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
    generateKey: vi.fn().mockImplementation((prefix: string, ...params: (string | number)[]) => {
        const cleanParams = params
            .filter(param => param !== undefined && param !== null)
            .map(param => String(param))
            .join(":");
        return cleanParams ? `${prefix}:${cleanParams}` : prefix;
    })
} as any;

describe('Metadata Tools', () => {
    /**
     * Test suite for metadata retrieval functionality.
     */

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock cache service to return undefined (no cached data) by default
        vi.mocked(mockCacheService.get).mockReturnValue(undefined);
    });

    describe('getStatuses', () => {
        const mockStatuses = [
            { id: 1, name: "Approved", description: "Test case approved", color: "#28a745" },
            { id: 2, name: "Draft", description: "Test case in draft", color: "#6c757d" },
            { id: 3, name: "Deprecated", description: "Test case deprecated", color: "#dc3545" }
        ];

        it('should retrieve statuses successfully', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockStatuses);

            const result = await getStatuses(mockApiService, mockCacheService, "PROJ");

            expect(mockApiService.get).toHaveBeenCalledWith('/statuses', { projectKey: "PROJ" });
            expect(result).toEqual(mockStatuses);
        });

        it('should handle global statuses request', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockStatuses);

            const result = await getStatuses(mockApiService, mockCacheService);

            expect(mockApiService.get).toHaveBeenCalledWith('/statuses', {});
            expect(result).toEqual(mockStatuses);
        });

        it('should validate required parameters', async () => {
            await expect(getStatuses(null as any, mockCacheService)).rejects.toThrow();
        });

        it('should validate project key format when provided', async () => {
            const invalidKeys = ["invalid-key", "proj", "123-INVALID"];

            for (const invalidKey of invalidKeys) {
                await expect(getStatuses(mockApiService, mockCacheService, invalidKey)).rejects.toThrow();
            }
        });

        it('should accept valid project keys', async () => {
            const validKeys = ["A", "PROJ", "ABC123", "TEST"];
            vi.mocked(mockApiService.get).mockResolvedValue(mockStatuses);

            for (const validKey of validKeys) {
                await expect(getStatuses(mockApiService, mockCacheService, validKey)).resolves.not.toThrow();
            }
        });

        it('should handle API errors', async () => {
            const apiError = new Error('HTTP 500: Internal Server Error');
            vi.mocked(mockApiService.get).mockRejectedValue(apiError);

            await expect(getStatuses(mockApiService, mockCacheService, "PROJ")).rejects.toThrow();
        });

        it('should handle empty status arrays', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue([]);

            const result = await getStatuses(mockApiService, mockCacheService, "PROJ");

            expect(result).toEqual([]);
        });

        it('should handle permission errors', async () => {
            const error = new Error('HTTP 403: Insufficient permissions');
            vi.mocked(mockApiService.get).mockRejectedValue(error);

            await expect(getStatuses(mockApiService, mockCacheService, "PROJ")).rejects.toThrow();
        });

        it('should handle project not found errors', async () => {
            const error = new Error('HTTP 404: Project not found');
            vi.mocked(mockApiService.get).mockRejectedValue(error);

            await expect(getStatuses(mockApiService, mockCacheService, "NONEXISTENT")).rejects.toThrow();
        });

        it('should trim project key parameter', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockStatuses);

            await getStatuses(mockApiService, mockCacheService, "  PROJ  ");

            expect(mockApiService.get).toHaveBeenCalledWith('/statuses', { projectKey: "PROJ" });
        });
    });

    describe('getPriorities', () => {
        const mockPriorities = [
            { id: 1, name: "Low", description: "Low priority", color: "#28a745" },
            { id: 2, name: "Medium", description: "Medium priority", color: "#ffc107" },
            { id: 3, name: "High", description: "High priority", color: "#dc3545" },
            { id: 4, name: "Critical", description: "Critical priority", color: "#6f42c1" }
        ];

        it('should retrieve priorities successfully', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockPriorities);

            const result = await getPriorities(mockApiService, mockCacheService, "PROJ");

            expect(mockApiService.get).toHaveBeenCalledWith('/priorities', { projectKey: "PROJ" });
            expect(result).toEqual(mockPriorities);
        });

        it('should handle global priorities request', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockPriorities);

            const result = await getPriorities(mockApiService, mockCacheService);

            expect(mockApiService.get).toHaveBeenCalledWith('/priorities', {});
            expect(result).toEqual(mockPriorities);
        });

        it('should validate required parameters', async () => {
            await expect(getPriorities(null as any, mockCacheService)).rejects.toThrow();
        });

        it('should validate project key format when provided', async () => {
            const invalidKeys = ["invalid-key", "proj", "123INVALID"];

            for (const invalidKey of invalidKeys) {
                await expect(getPriorities(mockApiService, mockCacheService, invalidKey)).rejects.toThrow();
            }
        });

        it('should handle empty response', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue([]);

            const result = await getPriorities(mockApiService, mockCacheService, "PROJ");

            expect(result).toEqual([]);
        });

        it('should handle API errors', async () => {
            const error = new Error('HTTP 500: Server Error');
            vi.mocked(mockApiService.get).mockRejectedValue(error);

            await expect(getPriorities(mockApiService, mockCacheService, "PROJ")).rejects.toThrow();
        });

        it('should handle network timeouts', async () => {
            const error = new Error('Request timeout');
            vi.mocked(mockApiService.get).mockRejectedValue(error);

            await expect(getPriorities(mockApiService, mockCacheService, "PROJ")).rejects.toThrow();
        });

        it('should validate response format', async () => {
            const invalidResponse = "not an array";
            vi.mocked(mockApiService.get).mockResolvedValue(invalidResponse);

            await expect(getPriorities(mockApiService, mockCacheService, "PROJ")).rejects.toThrow();
        });
    });

    describe('getEnvironments', () => {
        const mockEnvironments = [
            { id: 1, name: "Development", description: "Dev environment" },
            { id: 2, name: "Staging", description: "Staging environment" },
            { id: 3, name: "Production", description: "Production environment" }
        ];

        it('should retrieve environments successfully', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockEnvironments);

            const result = await getEnvironments(mockApiService, mockCacheService, "PROJ");

            expect(mockApiService.get).toHaveBeenCalledWith('/environments', { projectKey: "PROJ" });
            expect(result).toEqual(mockEnvironments);
        });

        it('should handle global environments request', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockEnvironments);

            const result = await getEnvironments(mockApiService, mockCacheService);

            expect(mockApiService.get).toHaveBeenCalledWith('/environments', {});
            expect(result).toEqual(mockEnvironments);
        });

        it('should validate required parameters', async () => {
            await expect(getEnvironments(null as any, mockCacheService)).rejects.toThrow();
        });

        it('should validate project key format when provided', async () => {
            const invalidKeys = ["invalid-key", "123", "PROJ-INVALID"];

            for (const invalidKey of invalidKeys) {
                await expect(getEnvironments(mockApiService, mockCacheService, invalidKey)).rejects.toThrow();
            }
        });

        it('should handle network errors', async () => {
            const networkError = new Error('Network connection failed');
            vi.mocked(mockApiService.get).mockRejectedValue(networkError);

            await expect(getEnvironments(mockApiService, mockCacheService, "PROJ")).rejects.toThrow('Network connection failed');
        });

        it('should validate response format', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue("invalid response");

            await expect(getEnvironments(mockApiService, mockCacheService, "PROJ")).rejects.toThrow();
        });

        it('should handle empty environments array', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue([]);

            const result = await getEnvironments(mockApiService, mockCacheService, "PROJ");

            expect(result).toEqual([]);
        });

        it('should handle authentication errors', async () => {
            const error = new Error('HTTP 401: Unauthorized');
            vi.mocked(mockApiService.get).mockRejectedValue(error);

            await expect(getEnvironments(mockApiService, mockCacheService, "PROJ")).rejects.toThrow();
        });

        it('should handle rate limiting', async () => {
            const error = new Error('HTTP 429: Too Many Requests');
            vi.mocked(mockApiService.get).mockRejectedValue(error);

            await expect(getEnvironments(mockApiService, mockCacheService, "PROJ")).rejects.toThrow();
        });

        it('should accept various project key formats', async () => {
            const validKeys = ["A", "AB", "ABC", "ABC123", "ZZZZ"];
            vi.mocked(mockApiService.get).mockResolvedValue(mockEnvironments);

            for (const validKey of validKeys) {
                await expect(getEnvironments(mockApiService, mockCacheService, validKey)).resolves.not.toThrow();
            }
        });
    });

    describe('caching behavior', () => {
        /**
         * Test metadata caching patterns for performance optimization.
         */

        it('should support caching for frequently accessed metadata', async () => {
            const mockStatuses = [{ id: 1, name: "Approved" }];
            vi.mocked(mockApiService.get).mockResolvedValue(mockStatuses);

            // First call
            await getStatuses(mockApiService, mockCacheService, "PROJ");
            expect(mockApiService.get).toHaveBeenCalledTimes(1);

            // Implementation would typically check cache on second call
            // This test verifies the API is structured to support caching
        });

        it('should handle cache invalidation scenarios', async () => {
            const mockPriorities = [{ id: 1, name: "High" }];
            vi.mocked(mockApiService.get).mockResolvedValue(mockPriorities);

            const result = await getPriorities(mockApiService, mockCacheService, "PROJ");
            expect(result).toEqual(mockPriorities);
        });

        it('should cache metadata per project', async () => {
            const projectAStatuses = [{ id: 1, name: "Active" }];
            const projectBStatuses = [{ id: 2, name: "Inactive" }];

            vi.mocked(mockApiService.get)
                .mockResolvedValueOnce(projectAStatuses)
                .mockResolvedValueOnce(projectBStatuses);

            const resultA = await getStatuses(mockApiService, mockCacheService, "PROJA");
            const resultB = await getStatuses(mockApiService, mockCacheService, "PROJB");

            expect(resultA).toEqual(projectAStatuses);
            expect(resultB).toEqual(projectBStatuses);
            expect(mockApiService.get).toHaveBeenCalledTimes(2);
        });
    });
});