/**
 * Unit tests for test execution functionality.
 *
 * Covers API integration, parameter validation, response handling,
 * and error scenarios for test execution management.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createTestExecution,
    updateTestExecution
} from "../../../zephyr/tools/test-execution.js";
import type { ApiService } from "../../../zephyr/services/api.js";

// Mock ApiService
const mockApiService: ApiService = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
} as any;

describe('Test Execution Tools', () => {
    /**
     * Test suite for test execution functionality.
     */

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createTestExecution', () => {
        const mockExecutionRequest = {
            projectKey: "PROJ",
            testCaseKey: "PROJ-T123",
            testCycleKey: "PROJ-R456",
            assignedToId: "user-123",
            statusName: "Not Executed"
        };

        const mockCreatedExecution = {
            id: 1,
            testCaseKey: "PROJ-T123",
            testCycleKey: "PROJ-R456",
            statusName: "Not Executed",
            assignedToId: "user-123"
        };

        it('should create test execution successfully', async () => {
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedExecution);

            const result = await createTestExecution(mockApiService, mockExecutionRequest);

            expect(mockApiService.post).toHaveBeenCalledWith('/testexecutions', mockExecutionRequest);
            expect(result).toEqual(mockCreatedExecution);
        });

        it('should validate required parameters', async () => {
            await expect(createTestExecution(null as any, mockExecutionRequest)).rejects.toThrow();
        });

        it('should validate test case key format', async () => {
            const invalidRequest = { ...mockExecutionRequest, testCaseKey: "" };
            await expect(createTestExecution(mockApiService, invalidRequest)).rejects.toThrow();
        });

        it('should validate test cycle key format', async () => {
            const invalidRequest = { ...mockExecutionRequest, testCycleKey: "" };
            await expect(createTestExecution(mockApiService, invalidRequest)).rejects.toThrow();
        });

        it('should validate assignee ID format', async () => {
            const invalidRequest = { ...mockExecutionRequest, assignedToId: "" };
            await expect(createTestExecution(mockApiService, invalidRequest)).rejects.toThrow();
        });

        it('should validate status values', async () => {
            const validStatuses = ["Not Executed", "Pass", "Fail", "Blocked", "In Progress"];

            for (const statusName of validStatuses) {
                const request = { ...mockExecutionRequest, statusName };
                vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedExecution);
                await expect(createTestExecution(mockApiService, request)).resolves.not.toThrow();
            }
        });

        it('should reject invalid status values', async () => {
            const invalidRequest = { ...mockExecutionRequest, statusName: "InvalidStatus" };
            await expect(createTestExecution(mockApiService, invalidRequest)).rejects.toThrow();
        });

        it('should handle API errors', async () => {
            const apiError = new Error('HTTP 400: Bad Request');
            vi.mocked(mockApiService.post).mockRejectedValue(apiError);

            await expect(createTestExecution(mockApiService, mockExecutionRequest)).rejects.toThrow();
        });

        it('should handle missing test case error', async () => {
            const error = new Error('HTTP 404: Test case not found');
            vi.mocked(mockApiService.post).mockRejectedValue(error);

            await expect(createTestExecution(mockApiService, mockExecutionRequest)).rejects.toThrow();
        });

        it('should handle missing test cycle error', async () => {
            const error = new Error('HTTP 404: Test cycle not found');
            vi.mocked(mockApiService.post).mockRejectedValue(error);

            await expect(createTestExecution(mockApiService, mockExecutionRequest)).rejects.toThrow();
        });

        it('should allow optional assignee', async () => {
            const requestWithoutAssignee = {
                projectKey: "PROJ",
                testCaseKey: "PROJ-T123",
                testCycleKey: "PROJ-R456",
                statusName: "Not Executed"
            };
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedExecution);

            await createTestExecution(mockApiService, requestWithoutAssignee);

            expect(mockApiService.post).toHaveBeenCalledWith('/testexecutions', requestWithoutAssignee);
        });
    });

    describe('updateTestExecution', () => {
        const mockUpdateRequest = {
            statusName: "Pass",
            comment: "Test passed successfully",
            actualEndDate: "2024-01-01T10:00:00Z"
        };

        const mockUpdatedExecution = {
            id: 1,
            testCaseKey: "PROJ-T123",
            statusName: "Pass",
            comment: "Test passed successfully",
            actualEndDate: "2024-01-01T10:00:00Z"
        };

        it('should update test execution successfully', async () => {
            vi.mocked(mockApiService.put).mockResolvedValue(mockUpdatedExecution);

            const result = await updateTestExecution(mockApiService, 1, mockUpdateRequest);

            expect(mockApiService.put).toHaveBeenCalledWith('/testexecutions/1', mockUpdateRequest);
            expect(result).toEqual(mockUpdatedExecution);
        });

        it('should validate execution ID', async () => {
            await expect(updateTestExecution(mockApiService, 0, mockUpdateRequest)).rejects.toThrow();
            await expect(updateTestExecution(mockApiService, -1, mockUpdateRequest)).rejects.toThrow();
        });

        it('should validate status values', async () => {
            const invalidUpdate = { ...mockUpdateRequest, statusName: "InvalidStatus" };
            await expect(updateTestExecution(mockApiService, 1, invalidUpdate)).rejects.toThrow();
        });

        it('should accept valid status values', async () => {
            const validStatuses = ["Pass", "Fail", "Blocked", "In Progress", "Not Executed"];

            for (const statusName of validStatuses) {
                const update = { ...mockUpdateRequest, statusName };
                vi.mocked(mockApiService.put).mockResolvedValue(mockUpdatedExecution);
                await expect(updateTestExecution(mockApiService, 1, update)).resolves.not.toThrow();
            }
        });

        it('should validate timestamp format', async () => {
            const invalidUpdate = { ...mockUpdateRequest, actualEndDate: "invalid-date" };
            await expect(updateTestExecution(mockApiService, 1, invalidUpdate)).rejects.toThrow();
        });

        it('should accept valid ISO timestamps', async () => {
            const validTimestamps = [
                "2024-01-01T10:00:00Z",
                "2024-12-31T23:59:59.999Z",
                "2024-06-15T14:30:00.000Z"
            ];

            for (const timestamp of validTimestamps) {
                const update = { ...mockUpdateRequest, actualEndDate: timestamp };
                vi.mocked(mockApiService.put).mockResolvedValue(mockUpdatedExecution);
                await expect(updateTestExecution(mockApiService, 1, update)).resolves.not.toThrow();
            }
        });

        it('should handle partial updates', async () => {
            const partialUpdate = { statusName: "Fail" };
            vi.mocked(mockApiService.put).mockResolvedValue(mockUpdatedExecution);

            await updateTestExecution(mockApiService, 1, partialUpdate);

            expect(mockApiService.put).toHaveBeenCalledWith('/testexecutions/1', partialUpdate);
        });

        it('should handle long comments', async () => {
            const longComment = "A".repeat(2000);
            const updateWithLongComment = { ...mockUpdateRequest, comment: longComment };
            vi.mocked(mockApiService.put).mockResolvedValue(mockUpdatedExecution);

            await updateTestExecution(mockApiService, 1, updateWithLongComment);

            expect(mockApiService.put).toHaveBeenCalledWith('/testexecutions/1', updateWithLongComment);
        });

        it('should handle API errors', async () => {
            const error = new Error('HTTP 404: Execution not found');
            vi.mocked(mockApiService.put).mockRejectedValue(error);

            await expect(updateTestExecution(mockApiService, 1, mockUpdateRequest)).rejects.toThrow();
        });

        it('should handle permission errors', async () => {
            const error = new Error('HTTP 403: Insufficient permissions');
            vi.mocked(mockApiService.put).mockRejectedValue(error);

            await expect(updateTestExecution(mockApiService, 1, mockUpdateRequest)).rejects.toThrow();
        });

        it('should validate API service parameter', async () => {
            await expect(updateTestExecution(null as any, 1, mockUpdateRequest)).rejects.toThrow();
        });

        it('should accept execution results with attachments', async () => {
            const updateWithAttachments = {
                ...mockUpdateRequest,
                attachments: ["screenshot1.png", "log.txt"]
            };
            vi.mocked(mockApiService.put).mockResolvedValue(mockUpdatedExecution);

            await updateTestExecution(mockApiService, 1, updateWithAttachments);

            expect(mockApiService.put).toHaveBeenCalledWith('/testexecutions/1', updateWithAttachments);
        });
    });
});