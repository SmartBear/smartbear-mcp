/**
 * Unit tests for CacheService functionality.
 *
 * Covers cache operations, TTL behavior, key generation,
 * and performance optimization patterns.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CacheService } from "../../../zephyr/services/cache.js";

// Mock NodeCache
vi.mock("node-cache", () => {
    const MockNodeCache = vi.fn().mockImplementation(() => ({
        get: vi.fn(),
        set: vi.fn(),
        del: vi.fn(),
        flushAll: vi.fn()
    }));
    return { default: MockNodeCache };
});

import NodeCache from "node-cache";

describe('CacheService', () => {
    /**
     * Test suite for CacheService functionality.
     */

    let cacheService: CacheService;
    let mockNodeCache: any;

    beforeEach(() => {
        vi.clearAllMocks();

        // Create fresh mock instance
        mockNodeCache = {
            get: vi.fn(),
            set: vi.fn(),
            del: vi.fn(),
            flushAll: vi.fn()
        };

        // Setup the NodeCache constructor to return our mock
        const mockConstructor = vi.mocked(NodeCache);
        mockConstructor.mockImplementation(() => mockNodeCache);

        cacheService = new CacheService();
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with default TTL', () => {
            new CacheService();

            expect(NodeCache).toHaveBeenCalledWith({
                stdTTL: 300,
                checkperiod: 30
            });
        });

        it('should initialize with custom TTL', () => {
            const customTtl = 600;
            new CacheService(customTtl);

            expect(NodeCache).toHaveBeenCalledWith({
                stdTTL: customTtl,
                checkperiod: 60
            });
        });
    });

    describe('cache operations', () => {
        describe('get method', () => {
            it('should retrieve value from cache', () => {
                const testValue = { id: 1, name: "test" };
                mockNodeCache.get.mockReturnValue(testValue);

                const result = cacheService.get<typeof testValue>("test-key");

                expect(mockNodeCache.get).toHaveBeenCalledWith("test-key");
                expect(result).toEqual(testValue);
            });

            it('should return undefined for non-existent key', () => {
                mockNodeCache.get.mockReturnValue(undefined);

                const result = cacheService.get("non-existent");

                expect(mockNodeCache.get).toHaveBeenCalledWith("non-existent");
                expect(result).toBeUndefined();
            });
        });

        describe('set method', () => {
            it('should store value with default TTL', () => {
                const testValue = { id: 1, name: "test" };

                cacheService.set("test-key", testValue);

                expect(mockNodeCache.set).toHaveBeenCalledWith("test-key", testValue);
            });

            it('should store value with custom TTL', () => {
                const testValue = { id: 1, name: "test" };
                const customTtl = 120;

                cacheService.set("test-key", testValue, customTtl);

                expect(mockNodeCache.set).toHaveBeenCalledWith("test-key", testValue, customTtl);
            });
        });
    });

    describe('key generation', () => {
        it('should generate key with prefix only', () => {
            const key = cacheService.generateKey("statuses");
            expect(key).toBe("statuses");
        });

        it('should generate key with multiple parameters', () => {
            const key = cacheService.generateKey("test-cases", "PROJECT-1", 123, "active");
            expect(key).toBe("test-cases:PROJECT-1:123:active");
        });

        it('should filter out null parameters', () => {
            const key = cacheService.generateKey("test", "param1", null, "param3");
            expect(key).toBe("test:param1:param3");
        });

        it('should filter out undefined parameters', () => {
            const key = cacheService.generateKey("test", "param1", undefined, "param3");
            expect(key).toBe("test:param1:param3");
        });
    });
});