/**
 * Unit tests for test planning functionality.
 *
 * Covers API integration, parameter validation, response handling,
 * and error scenarios for test plan and cycle management.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createTestPlan,
    createTestCycle,
    linkTestPlanToCycle
} from "../../../zephyr/tools/test-planning.js";
import type { ApiService } from "../../../zephyr/services/api.js";

// Mock ApiService
const mockApiService: ApiService = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
} as any;

describe('Test Planning Tools', () => {
    /**
     * Test suite for test planning functionality.
     */

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createTestPlan', () => {
        const mockPlanRequest = {
            name: "Sprint 1 Test Plan",
            projectKey: "PROJ",
            description: "Test plan for Sprint 1"
        };

        const mockCreatedPlan = {
            id: 1,
            name: "Sprint 1 Test Plan",
            key: "PROJ-P1",
            project: {
                id: 10005,
                self: "https://api.zephyrscale.smartbear.com/v2/projects/10005"
            },
            status: {
                id: 1,
                self: "https://api.zephyrscale.smartbear.com/v2/statuses/1"
            }
        };

        it('should create test plan successfully', async () => {
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedPlan);

            const result = await createTestPlan(mockApiService, mockPlanRequest);

            expect(mockApiService.post).toHaveBeenCalledWith('/testplans', mockPlanRequest);
            expect(result).toEqual(mockCreatedPlan);
        });

        it('should validate required parameters', async () => {
            await expect(createTestPlan(null as any, mockPlanRequest)).rejects.toThrow();
        });

        it('should validate plan name', async () => {
            const invalidRequest = { ...mockPlanRequest, name: "" };
            await expect(createTestPlan(mockApiService, invalidRequest)).rejects.toThrow();
        });

        it('should validate project key format', async () => {
            const invalidRequest = { ...mockPlanRequest, projectKey: "invalid-key" };
            await expect(createTestPlan(mockApiService, invalidRequest)).rejects.toThrow();
        });

        it('should handle API errors', async () => {
            const apiError = new Error('HTTP 400: Bad Request');
            vi.mocked(mockApiService.post).mockRejectedValue(apiError);

            await expect(createTestPlan(mockApiService, mockPlanRequest)).rejects.toThrow();
        });

        it('should accept optional description', async () => {
            const requestWithoutDesc = {
                name: "Simple Plan",
                projectKey: "PROJ"
            };
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedPlan);

            await createTestPlan(mockApiService, requestWithoutDesc);

            expect(mockApiService.post).toHaveBeenCalledWith('/testplans', requestWithoutDesc);
        });

        it('should handle long descriptions', async () => {
            const longDesc = "A".repeat(1000);
            const requestWithLongDesc = { ...mockPlanRequest, description: longDesc };
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedPlan);

            await createTestPlan(mockApiService, requestWithLongDesc);

            expect(mockApiService.post).toHaveBeenCalledWith('/testplans', requestWithLongDesc);
        });
    });

    describe('createTestCycle', () => {
        const mockCycleRequest = {
            name: "Regression Cycle",
            projectKey: "PROJ",
            plannedStartDate: "2024-01-01",
            plannedEndDate: "2024-01-15"
        };

        const mockCreatedCycle = {
            id: 1,
            name: "Regression Cycle",
            key: "PROJ-R1",
            project: {
                id: 10005,
                self: "https://api.zephyrscale.smartbear.com/v2/projects/10005"
            },
            status: {
                id: 1,
                self: "https://api.zephyrscale.smartbear.com/v2/statuses/1"
            }
        };

        it('should create test cycle successfully', async () => {
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedCycle);

            const result = await createTestCycle(mockApiService, mockCycleRequest);

            expect(mockApiService.post).toHaveBeenCalledWith('/testcycles', mockCycleRequest);
            expect(result).toEqual(mockCreatedCycle);
        });

        it('should validate parameters', async () => {
            await expect(createTestCycle(null as any, mockCycleRequest)).rejects.toThrow();
        });

        it('should validate cycle name', async () => {
            const invalidRequest = { ...mockCycleRequest, name: "" };
            await expect(createTestCycle(mockApiService, invalidRequest)).rejects.toThrow();
        });

        it('should validate project key', async () => {
            const invalidRequest = { ...mockCycleRequest, projectKey: "invalid" };
            await expect(createTestCycle(mockApiService, invalidRequest)).rejects.toThrow();
        });

        it('should validate date formats', async () => {
            const invalidDates = {
                ...mockCycleRequest,
                plannedStartDate: "invalid-date",
                plannedEndDate: "2024/01/15"
            };
            await expect(createTestCycle(mockApiService, invalidDates)).rejects.toThrow();
        });

        it('should validate date logic', async () => {
            const invalidDateRange = {
                ...mockCycleRequest,
                plannedStartDate: "2024-01-15",
                plannedEndDate: "2024-01-01"
            };
            await expect(createTestCycle(mockApiService, invalidDateRange)).rejects.toThrow();
        });

        it('should allow cycles without dates', async () => {
            const cycleWithoutDates = {
                name: "Ad-hoc Cycle",
                projectKey: "PROJ"
            };
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedCycle);

            await createTestCycle(mockApiService, cycleWithoutDates);

            expect(mockApiService.post).toHaveBeenCalledWith('/testcycles', cycleWithoutDates);
        });

        it('should handle HTTP errors', async () => {
            const error = new Error('HTTP 403: Insufficient permissions');
            vi.mocked(mockApiService.post).mockRejectedValue(error);

            await expect(createTestCycle(mockApiService, mockCycleRequest)).rejects.toThrow();
        });
    });

    describe('linkTestPlanToCycle', () => {
        it('should link test plan to cycle successfully', async () => {
            vi.mocked(mockApiService.post).mockResolvedValue(undefined);

            const result = await linkTestPlanToCycle(mockApiService, 1, 2);

            expect(mockApiService.post).toHaveBeenCalledWith('/testplans/1/links/testcycles', {
                testCycleId: 2
            });
            expect(result).toBeUndefined();
        });

        it('should validate plan ID', async () => {
            await expect(linkTestPlanToCycle(mockApiService, 0, 1)).rejects.toThrow();
            await expect(linkTestPlanToCycle(mockApiService, -1, 1)).rejects.toThrow();
        });

        it('should validate cycle ID', async () => {
            await expect(linkTestPlanToCycle(mockApiService, 1, 0)).rejects.toThrow();
            await expect(linkTestPlanToCycle(mockApiService, 1, -1)).rejects.toThrow();
        });

        it('should validate both IDs', async () => {
            await expect(linkTestPlanToCycle(mockApiService, 0, 0)).rejects.toThrow();
        });

        it('should handle API service validation', async () => {
            await expect(linkTestPlanToCycle(null as any, 1, 2)).rejects.toThrow();
        });

        it('should handle linking errors', async () => {
            const error = new Error('HTTP 404: Test plan or cycle not found');
            vi.mocked(mockApiService.post).mockRejectedValue(error);

            await expect(linkTestPlanToCycle(mockApiService, 1, 2)).rejects.toThrow();
        });

        it('should handle conflict errors', async () => {
            const error = new Error('HTTP 409: Plans already linked');
            vi.mocked(mockApiService.post).mockRejectedValue(error);

            await expect(linkTestPlanToCycle(mockApiService, 1, 2)).rejects.toThrow();
        });

        it('should accept valid positive IDs', async () => {
            vi.mocked(mockApiService.post).mockResolvedValue({ success: true });

            await expect(linkTestPlanToCycle(mockApiService, 999, 888)).resolves.not.toThrow();
        });
    });
});