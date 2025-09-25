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
    linkTestCaseToIssue,
    getTestCaseLinks,
    createTestCaseWebLink,
    listTestCaseVersions,
    getTestCaseVersion,
    getTestCaseTestScript,
    getTestCaseTestSteps
} from "../../../zephyr/tools/test-cases.js";
import type { ApiService } from "../../../zephyr/services/api.js";
import type {
    TestCase,
    CreateTestCaseRequest,
    UpdateTestCaseRequest,
    TestScript,
    TestStep,
    TestCaseLinkList,
    TestCaseVersionLink
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

    describe('getTestCaseLinks', () => {
        const mockTestCaseKey = "PROJ-T123";
        const mockLinksResponse: TestCaseLinkList = {
            issues: {
                items: [{ id: 1, issueKey: "PROJ-456", url: "https://jira.example.com/browse/PROJ-456" }]
            },
            webLinks: {
                items: [{ id: 2, url: "https://example.com/docs", description: "Documentation" }]
            },
            self: "https://api.zephyrscale.smartbear.com/v2/testcases/PROJ-T123/links"
        };

        it('should retrieve test case links successfully', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockLinksResponse);

            const result = await getTestCaseLinks(mockApiService, mockTestCaseKey);

            expect(result).toEqual(mockLinksResponse);
            expect(mockApiService.get).toHaveBeenCalledWith('/testcases/PROJ-T123/links');
        });

        it('should throw error for missing apiService', async () => {
            await expect(getTestCaseLinks(null as any, mockTestCaseKey))
                .rejects.toThrow('ApiService is required');
        });

        it('should throw error for empty test case key', async () => {
            await expect(getTestCaseLinks(mockApiService, ''))
                .rejects.toThrow('Test case key is required and cannot be empty');
        });

        it('should throw error for invalid test case key format', async () => {
            await expect(getTestCaseLinks(mockApiService, 'invalid-key'))
                .rejects.toThrow('Invalid test case key format: invalid-key. Expected format: PROJECT-T123');
        });

        it('should handle 404 error appropriately', async () => {
            vi.mocked(mockApiService.get).mockRejectedValue(new Error('404 Not Found'));

            await expect(getTestCaseLinks(mockApiService, mockTestCaseKey))
                .rejects.toThrow('Test case not found: PROJ-T123. Verify the test case key exists and is accessible.');
        });

        it('should handle 403 error appropriately', async () => {
            vi.mocked(mockApiService.get).mockRejectedValue(new Error('403 Forbidden'));

            await expect(getTestCaseLinks(mockApiService, mockTestCaseKey))
                .rejects.toThrow('Access denied: Cannot access links for test case PROJ-T123. Check permissions.');
        });
    });

    describe('createTestCaseWebLink', () => {
        const mockTestCaseKey = "PROJ-T123";
        const mockWebLinkData = { url: "https://example.com/docs", description: "Documentation" };
        const mockCreatedResponse = { id: 123 };

        it('should create web link successfully', async () => {
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedResponse);

            const result = await createTestCaseWebLink(mockApiService, mockTestCaseKey, mockWebLinkData);

            expect(result).toEqual(mockCreatedResponse);
            expect(mockApiService.post).toHaveBeenCalledWith(
                '/testcases/PROJ-T123/links/weblinks',
                { url: "https://example.com/docs", description: "Documentation" }
            );
        });

        it('should throw error for missing URL', async () => {
            await expect(createTestCaseWebLink(mockApiService, mockTestCaseKey, { url: '' }))
                .rejects.toThrow('Web link URL is required and cannot be empty');
        });

        it('should throw error for invalid URL format', async () => {
            await expect(createTestCaseWebLink(mockApiService, mockTestCaseKey, { url: 'invalid-url' }))
                .rejects.toThrow('Invalid URL format: invalid-url. URL must start with http:// or https://');
        });

        it('should handle missing description gracefully', async () => {
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedResponse);

            const result = await createTestCaseWebLink(mockApiService, mockTestCaseKey, { url: "https://example.com" });

            expect(result).toEqual(mockCreatedResponse);
            expect(mockApiService.post).toHaveBeenCalledWith(
                '/testcases/PROJ-T123/links/weblinks',
                { url: "https://example.com", description: "" }
            );
        });
    });

    describe('listTestCaseVersions', () => {
        const mockTestCaseKey = "PROJ-T123";
        const mockVersionsResponse = {
            values: [
                { version: 2, createdOn: "2024-01-02T10:00:00Z", self: "https://api.../versions/2" },
                { version: 1, createdOn: "2024-01-01T10:00:00Z", self: "https://api.../versions/1" }
            ],
            maxResults: 10,
            startAt: 0,
            total: 2
        };

        it('should retrieve test case versions successfully', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockVersionsResponse);

            const result = await listTestCaseVersions(mockApiService, mockTestCaseKey);

            expect(result).toEqual(mockVersionsResponse);
            expect(mockApiService.get).toHaveBeenCalledWith('/testcases/PROJ-T123/versions');
        });

        it('should include maxResults in query parameters', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockVersionsResponse);

            await listTestCaseVersions(mockApiService, mockTestCaseKey, 50);

            expect(mockApiService.get).toHaveBeenCalledWith('/testcases/PROJ-T123/versions?maxResults=50');
        });

        it('should validate maxResults parameter', async () => {
            await expect(listTestCaseVersions(mockApiService, mockTestCaseKey, 0))
                .rejects.toThrow('maxResults must be an integer between 1 and 1000');

            await expect(listTestCaseVersions(mockApiService, mockTestCaseKey, 1001))
                .rejects.toThrow('maxResults must be an integer between 1 and 1000');
        });
    });

    describe('getTestCaseVersion', () => {
        const mockTestCaseKey = "PROJ-T123";
        const mockVersion = 2;
        const mockVersionResponse: TestCase = {
            id: 123,
            key: "PROJ-T123",
            name: "Test user login",
            objective: "Verify login functionality",
            projectKey: "PROJ",
            createdOn: "2024-01-02T10:00:00Z",
            self: "https://api.../testcases/PROJ-T123"
        };

        it('should retrieve specific test case version successfully', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockVersionResponse);

            const result = await getTestCaseVersion(mockApiService, mockTestCaseKey, mockVersion);

            expect(result).toEqual(mockVersionResponse);
            expect(mockApiService.get).toHaveBeenCalledWith('/testcases/PROJ-T123/versions/2');
        });

        it('should validate version parameter', async () => {
            await expect(getTestCaseVersion(mockApiService, mockTestCaseKey, 0))
                .rejects.toThrow('Version must be a positive integer');

            await expect(getTestCaseVersion(mockApiService, mockTestCaseKey, -1))
                .rejects.toThrow('Version must be a positive integer');

            await expect(getTestCaseVersion(mockApiService, mockTestCaseKey, 1.5))
                .rejects.toThrow('Version must be a positive integer');
        });
    });

    describe('getTestCaseTestScript', () => {
        const mockTestCaseKey = "PROJ-T123";
        const mockTestScript: TestScript = {
            type: "STEP_BY_STEP",
            text: "1. Open application\\n2. Enter credentials\\n3. Click login"
        };

        it('should retrieve test case script successfully', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockTestScript);

            const result = await getTestCaseTestScript(mockApiService, mockTestCaseKey);

            expect(result).toEqual(mockTestScript);
            expect(mockApiService.get).toHaveBeenCalledWith('/testcases/PROJ-T123/testscript');
        });

        it('should handle missing test script (404) appropriately', async () => {
            vi.mocked(mockApiService.get).mockRejectedValue(new Error('404 Not Found'));

            await expect(getTestCaseTestScript(mockApiService, mockTestCaseKey))
                .rejects.toThrow('Test script not found for test case: PROJ-T123. The test case may not have a script or may not exist.');
        });
    });

    describe('getTestCaseTestSteps', () => {
        const mockTestCaseKey = "PROJ-T123";
        const mockTestSteps = {
            values: [
                { id: 1, description: "Open application", expectedResult: "Application opens", orderIndex: 1 },
                { id: 2, description: "Enter credentials", expectedResult: "Credentials accepted", orderIndex: 2 }
            ],
            maxResults: 10,
            startAt: 0,
            total: 2
        };

        it('should retrieve test case steps successfully', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockTestSteps);

            const result = await getTestCaseTestSteps(mockApiService, mockTestCaseKey);

            expect(result).toEqual(mockTestSteps);
            expect(mockApiService.get).toHaveBeenCalledWith('/testcases/PROJ-T123/teststeps');
        });

        it('should include pagination parameters in query', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockTestSteps);

            await getTestCaseTestSteps(mockApiService, mockTestCaseKey, 50, 20);

            expect(mockApiService.get).toHaveBeenCalledWith('/testcases/PROJ-T123/teststeps?maxResults=50&startAt=20');
        });

        it('should validate pagination parameters', async () => {
            await expect(getTestCaseTestSteps(mockApiService, mockTestCaseKey, 0))
                .rejects.toThrow('maxResults must be an integer between 1 and 1000');

            await expect(getTestCaseTestSteps(mockApiService, mockTestCaseKey, undefined, -1))
                .rejects.toThrow('startAt must be an integer between 0 and 1000000');
        });
    });
});