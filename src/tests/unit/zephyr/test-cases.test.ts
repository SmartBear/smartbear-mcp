/**
 * Unit tests for test case CRUD operations.
 *
 * Covers API integration, parameter validation, response handling,
 * and error scenarios for test case management functionality.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    createTestCase,
    updateTestCase,
    addTestScript,
    addTestSteps,
    linkTestCaseToIssue
} from "../../../zephyr/tools/test-cases.js";
import type { ApiService } from "../../../zephyr/services/api.js";
import type {
    TestCase,
    CreateTestCaseRequest,
    UpdateTestCaseRequest,
    TestScript,
    TestStep
} from "../../../zephyr/types.js";

// Mock ApiService
const mockApiService: ApiService = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
} as any;

describe('Test Case Tools', () => {
    /**
     * Test suite for test case CRUD operations.
     */

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('createTestCase', () => {
        const mockCreateRequest: CreateTestCaseRequest = {
            name: "Test user login",
            projectKey: "PROJ",
            folderId: 123,
            priorityName: "High",
            statusName: "Draft"
        };

        const mockCreatedTestCase: TestCase = {
            id: 1,
            name: "Test user login",
            key: "PROJ-T1",
            project: {
                id: 10005,
                self: "https://api.zephyrscale.smartbear.com/v2/projects/10005"
            },
            priority: {
                id: 3,
                self: "https://api.zephyrscale.smartbear.com/v2/priorities/3"
            },
            status: {
                id: 1,
                self: "https://api.zephyrscale.smartbear.com/v2/statuses/1"
            },
            createdOn: "2024-01-01T10:00:00.000Z"
        };

        it('should create test case successfully', async () => {
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedTestCase);

            const result = await createTestCase(mockApiService, mockCreateRequest);

            expect(mockApiService.post).toHaveBeenCalledWith('/testcases', mockCreateRequest);
            expect(result).toEqual(mockCreatedTestCase);
        });

        it('should validate required parameters', async () => {
            await expect(createTestCase(null as any, mockCreateRequest)).rejects.toThrow();
        });

        it('should handle API errors', async () => {
            const apiError = new Error('HTTP 400: Bad Request');
            vi.mocked(mockApiService.post).mockRejectedValue(apiError);

            await expect(createTestCase(mockApiService, mockCreateRequest)).rejects.toThrow();
        });

        it('should validate test case name', async () => {
            const invalidRequest = { ...mockCreateRequest, name: "" };
            await expect(createTestCase(mockApiService, invalidRequest)).rejects.toThrow();
        });

        it('should validate project key format', async () => {
            const invalidRequest = { ...mockCreateRequest, projectKey: "invalid-key" };
            await expect(createTestCase(mockApiService, invalidRequest)).rejects.toThrow();
        });
    });

    describe('updateTestCase', () => {
        const mockUpdateRequest: UpdateTestCaseRequest = {
            name: "Updated test name",
            priorityName: "Medium"
        };

        const mockUpdatedTestCase: TestCase = {
            id: 1,
            name: "Updated test name",
            key: "PROJ-T1",
            project: {
                id: 10005,
                self: "https://api.zephyrscale.smartbear.com/v2/projects/10005"
            },
            priority: {
                id: 2,
                self: "https://api.zephyrscale.smartbear.com/v2/priorities/2"
            },
            status: {
                id: 1,
                self: "https://api.zephyrscale.smartbear.com/v2/statuses/1"
            },
            createdOn: "2024-01-01T10:00:00.000Z"
        };

        it('should update test case successfully', async () => {
            vi.mocked(mockApiService.put).mockResolvedValue(mockUpdatedTestCase);

            const result = await updateTestCase(mockApiService, "PROJ-T1", mockUpdateRequest);

            expect(mockApiService.put).toHaveBeenCalledWith('/testcases/PROJ-T1', mockUpdateRequest);
            expect(result).toEqual(mockUpdatedTestCase);
        });

        it('should validate test case ID', async () => {
            await expect(updateTestCase(mockApiService, "INVALID", mockUpdateRequest)).rejects.toThrow();
        });

        it('should handle partial updates', async () => {
            const partialUpdate = { priorityName: "Low" };
            vi.mocked(mockApiService.put).mockResolvedValue(mockUpdatedTestCase);

            await updateTestCase(mockApiService, "PROJ-T1", partialUpdate);

            expect(mockApiService.put).toHaveBeenCalledWith('/testcases/PROJ-T1', partialUpdate);
        });

        it('should handle HTTP errors', async () => {
            const error = new Error('HTTP 404: Not Found');
            vi.mocked(mockApiService.put).mockRejectedValue(error);

            await expect(updateTestCase(mockApiService, "PROJ-T1", mockUpdateRequest)).rejects.toThrow();
        });
    });

    describe('addTestScript', () => {
        const mockScript = {
            type: "plain",
            text: "Test script content"
        };

        const mockCreatedScript: TestScript = {
            id: 1,
            type: "plain",
            text: "Test script content"
        };

        it('should add test script successfully', async () => {
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedScript);

            const result = await addTestScript(mockApiService, "PROJ-T1", mockScript);

            expect(mockApiService.post).toHaveBeenCalledWith('/testcases/PROJ-T1/testscript', mockScript);
            expect(result).toEqual(mockCreatedScript);
        });

        it('should validate parameters', async () => {
            await expect(addTestScript(null as any, "PROJ-T1", mockScript)).rejects.toThrow();
            await expect(addTestScript(mockApiService, "", mockScript)).rejects.toThrow();
        });

        it('should validate script type', async () => {
            const invalidScript = { ...mockScript, type: "INVALID_TYPE" };
            await expect(addTestScript(mockApiService, "PROJ-T1", invalidScript)).rejects.toThrow();
        });

        it('should handle different script types', async () => {
            const bddScript = { type: "bdd", text: "Given When Then" };
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedScript);

            await addTestScript(mockApiService, "PROJ-T1", bddScript);

            expect(mockApiService.post).toHaveBeenCalledWith('/testcases/PROJ-T1/testscript', bddScript);
        });
    });

    describe('addTestSteps', () => {
        const mockSteps = {
            mode: "APPEND",
            steps: [
                {
                    description: "Step 1",
                    expectedResult: "Result 1",
                    testData: "Test data 1"
                },
                {
                    description: "Step 2",
                    expectedResult: "Result 2",
                    testData: "Test data 2"
                }
            ]
        };

        const mockCreatedSteps: TestStep[] = [
            {
                description: "Step 1",
                expectedResult: "Result 1",
                testData: "Test data 1"
            },
            {
                description: "Step 2",
                expectedResult: "Result 2",
                testData: "Test data 2"
            }
        ];

        it('should add test steps successfully', async () => {
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedSteps);

            const result = await addTestSteps(mockApiService, "PROJ-T1", mockSteps);

            expect(mockApiService.post).toHaveBeenCalledWith('/testcases/PROJ-T1/teststeps', {
                steps: [
                    {
                        description: "Step 1",
                        expectedResult: "Result 1",
                        testData: "Test data 1"
                    },
                    {
                        description: "Step 2",
                        expectedResult: "Result 2",
                        testData: "Test data 2"
                    }
                ]
            });
            expect(result).toEqual(mockCreatedSteps);
        });

        it('should validate parameters', async () => {
            await expect(addTestSteps(null as any, "PROJ-T1", mockSteps)).rejects.toThrow();
            await expect(addTestSteps(mockApiService, "", mockSteps)).rejects.toThrow();
        });

        it('should validate steps array', async () => {
            const invalidSteps = { mode: "APPEND", items: [] };
            await expect(addTestSteps(mockApiService, "PROJ-T1", invalidSteps)).rejects.toThrow();
        });

        it('should validate step content', async () => {
            const invalidSteps = {
                mode: "APPEND",
                items: [{ inline: { description: "", expectedResult: "Result" } }]
            };
            await expect(addTestSteps(mockApiService, "PROJ-T1", invalidSteps)).rejects.toThrow();
        });
    });

    describe('linkTestCaseToIssue', () => {
        it('should link test case to issue successfully', async () => {
            vi.mocked(mockApiService.post).mockResolvedValue(undefined);

            const result = await linkTestCaseToIssue(mockApiService, "PROJ-T123", "PROJ-456");

            expect(mockApiService.post).toHaveBeenCalledWith('/testcases/PROJ-T123/links/issues', { issueKey: "PROJ-456" });
            expect(result).toBeUndefined();
        });

        it('should validate issue key format', async () => {
            const invalidKeys = ["invalid-key", "proj-123", "123-PROJ"];

            for (const invalidKey of invalidKeys) {
                await expect(linkTestCaseToIssue(mockApiService, "PROJ-T123", invalidKey)).rejects.toThrow();
            }
        });

        it('should validate test case key format', async () => {
            await expect(linkTestCaseToIssue(mockApiService, "", "PROJ-123")).rejects.toThrow();
            await expect(linkTestCaseToIssue(mockApiService, "INVALID", "PROJ-123")).rejects.toThrow();
            await expect(linkTestCaseToIssue(mockApiService, "PROJ-123", "PROJ-123")).rejects.toThrow();
        });

        it('should handle API errors', async () => {
            const error = new Error('HTTP 404: Test case not found');
            vi.mocked(mockApiService.post).mockRejectedValue(error);

            await expect(linkTestCaseToIssue(mockApiService, "PROJ-T123", "PROJ-456")).rejects.toThrow();
        });

        it('should accept valid key formats', async () => {
            const validTestCaseKeys = ["A-T1", "PROJ-T123", "ABC123-T456"];
            const validIssueKeys = ["A-1", "PROJ-123", "ABC123-456"];
            vi.mocked(mockApiService.post).mockResolvedValue({ success: true });

            for (let i = 0; i < validTestCaseKeys.length; i++) {
                await expect(linkTestCaseToIssue(mockApiService, validTestCaseKeys[i], validIssueKeys[i])).resolves.not.toThrow();
            }
        });
    });
});