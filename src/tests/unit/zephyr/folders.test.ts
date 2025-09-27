/**
 * Unit tests for folder management functionality.
 *
 * Covers API integration, parameter validation, response handling,
 * and error scenarios for folder operations.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    getFolders,
    createFolder
} from "../../../zephyr/tools/folders.js";
import type { ApiService } from "../../../zephyr/services/api.js";

// Mock ApiService
const mockApiService: ApiService = {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn()
} as any;

describe('Folder Management Tools', () => {
    /**
     * Test suite for folder management functionality.
     */

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('getFolders', () => {
        const mockFolders = [
            {
                id: 1,
                name: "API Tests",
                projectKey: "PROJ",
                folderType: "TEST_CASE"
            },
            {
                id: 2,
                name: "UI Tests",
                projectKey: "PROJ",
                folderType: "TEST_CASE"
            }
        ];

        it('should retrieve folders successfully', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockFolders);

            const result = await getFolders(mockApiService, "PROJ");

            expect(mockApiService.get).toHaveBeenCalledWith('/folders', { projectKey: "PROJ" });
            expect(result).toEqual(mockFolders);
        });

        it('should handle optional parameters', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockFolders);

            await getFolders(mockApiService, "PROJ", "TEST_CASE");

            expect(mockApiService.get).toHaveBeenCalledWith('/folders', {
                projectKey: "PROJ",
                folderType: "TEST_CASE"
            });
        });

        it('should validate required parameters', async () => {
            await expect(getFolders(null as any, "PROJ")).rejects.toThrow();
            await expect(getFolders(mockApiService, "")).rejects.toThrow();
        });

        it('should validate project key format', async () => {
            const invalidKeys = ["invalid-key", "proj", "123", "PROJ_KEY"];

            for (const invalidKey of invalidKeys) {
                await expect(getFolders(mockApiService, invalidKey)).rejects.toThrow();
            }
        });

        it('should accept valid project keys', async () => {
            const validKeys = ["A", "PROJ", "ABC123", "TEST"];
            vi.mocked(mockApiService.get).mockResolvedValue(mockFolders);

            for (const validKey of validKeys) {
                await expect(getFolders(mockApiService, validKey)).resolves.not.toThrow();
            }
        });

        it('should validate folder type when provided', async () => {
            const invalidType = "INVALID_TYPE";
            await expect(getFolders(mockApiService, "PROJ", invalidType)).rejects.toThrow();
        });

        it('should accept valid folder types', async () => {
            const validTypes = ["TEST_CASE", "TEST_PLAN", "TEST_CYCLE"];
            vi.mocked(mockApiService.get).mockResolvedValue(mockFolders);

            for (const validType of validTypes) {
                await expect(getFolders(mockApiService, "PROJ", validType)).resolves.not.toThrow();
            }
        });

        it('should handle API errors', async () => {
            const apiError = new Error('HTTP 404: Not Found');
            vi.mocked(mockApiService.get).mockRejectedValue(apiError);

            await expect(getFolders(mockApiService, "PROJ")).rejects.toThrow();
        });

        it('should handle permission errors', async () => {
            const error = new Error('HTTP 403: Insufficient permissions');
            vi.mocked(mockApiService.get).mockRejectedValue(error);

            await expect(getFolders(mockApiService, "PROJ")).rejects.toThrow();
        });

        it('should handle empty folder arrays', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue([]);

            const result = await getFolders(mockApiService, "PROJ");

            expect(result).toEqual([]);
        });

        it('should handle network errors', async () => {
            const networkError = new Error('Network connection failed');
            vi.mocked(mockApiService.get).mockRejectedValue(networkError);

            await expect(getFolders(mockApiService, "PROJ")).rejects.toThrow();
        });

        it('should trim project key parameter', async () => {
            vi.mocked(mockApiService.get).mockResolvedValue(mockFolders);

            await getFolders(mockApiService, "  PROJ  ");

            expect(mockApiService.get).toHaveBeenCalledWith('/folders', { projectKey: "PROJ" });
        });
    });

    describe('createFolder', () => {
        const mockFolderRequest = {
            name: "New Test Folder",
            projectKey: "PROJ",
            folderType: "TEST_CASE",
            parentId: null
        };

        const mockCreatedFolder = {
            id: 3,
            name: "New Test Folder",
            projectKey: "PROJ",
            folderType: "TEST_CASE",
            parentId: null
        };

        it('should create folder successfully', async () => {
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedFolder);

            const result = await createFolder(mockApiService, mockFolderRequest);

            expect(mockApiService.post).toHaveBeenCalledWith('/folders', mockFolderRequest);
            expect(result).toEqual(mockCreatedFolder);
        });

        it('should validate required parameters', async () => {
            await expect(createFolder(null as any, mockFolderRequest)).rejects.toThrow();
        });

        it('should validate folder name', async () => {
            const invalidRequest = { ...mockFolderRequest, name: "" };
            await expect(createFolder(mockApiService, invalidRequest)).rejects.toThrow();
        });

        it('should validate folder name length', async () => {
            const longName = "A".repeat(256);
            const invalidRequest = { ...mockFolderRequest, name: longName };
            await expect(createFolder(mockApiService, invalidRequest)).rejects.toThrow();
        });

        it('should accept reasonable folder names', async () => {
            const validNames = [
                "API Tests",
                "Integration Tests",
                "Unit Tests - Backend",
                "E2E Tests (Critical Path)"
            ];
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedFolder);

            for (const name of validNames) {
                const request = { ...mockFolderRequest, name };
                await expect(createFolder(mockApiService, request)).resolves.not.toThrow();
            }
        });

        it('should validate project key format', async () => {
            const invalidRequest = { ...mockFolderRequest, projectKey: "invalid-key" };
            await expect(createFolder(mockApiService, invalidRequest)).rejects.toThrow();
        });

        it('should validate folder type', async () => {
            const invalidRequest = { ...mockFolderRequest, folderType: "INVALID_TYPE" };
            await expect(createFolder(mockApiService, invalidRequest)).rejects.toThrow();
        });

        it('should accept valid folder types', async () => {
            const validTypes = ["TEST_CASE", "TEST_PLAN", "TEST_CYCLE"];
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedFolder);

            for (const folderType of validTypes) {
                const request = { ...mockFolderRequest, folderType };
                await expect(createFolder(mockApiService, request)).resolves.not.toThrow();
            }
        });

        it('should handle parent folder ID validation', async () => {
            const invalidRequest = { ...mockFolderRequest, parentId: -1 };
            await expect(createFolder(mockApiService, invalidRequest)).rejects.toThrow();
        });

        it('should allow null parent folder ID for root folders', async () => {
            const rootFolderRequest = { ...mockFolderRequest, parentId: null };
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedFolder);

            await createFolder(mockApiService, rootFolderRequest);

            expect(mockApiService.post).toHaveBeenCalledWith('/folders', rootFolderRequest);
        });

        it('should allow valid parent folder IDs for nested folders', async () => {
            const nestedFolderRequest = { ...mockFolderRequest, parentId: 123 };
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedFolder);

            await createFolder(mockApiService, nestedFolderRequest);

            expect(mockApiService.post).toHaveBeenCalledWith('/folders', nestedFolderRequest);
        });

        it('should handle API errors', async () => {
            const error = new Error('HTTP 400: Folder name already exists');
            vi.mocked(mockApiService.post).mockRejectedValue(error);

            await expect(createFolder(mockApiService, mockFolderRequest)).rejects.toThrow();
        });

        it('should handle parent folder not found errors', async () => {
            const error = new Error('HTTP 404: Parent folder not found');
            vi.mocked(mockApiService.post).mockRejectedValue(error);

            await expect(createFolder(mockApiService, mockFolderRequest)).rejects.toThrow();
        });

        it('should handle permission errors', async () => {
            const error = new Error('HTTP 403: Insufficient permissions to create folder');
            vi.mocked(mockApiService.post).mockRejectedValue(error);

            await expect(createFolder(mockApiService, mockFolderRequest)).rejects.toThrow();
        });

        it('should trim folder name', async () => {
            const requestWithSpaces = { ...mockFolderRequest, name: "  Test Folder  " };
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedFolder);

            await createFolder(mockApiService, requestWithSpaces);

            expect(mockApiService.post).toHaveBeenCalledWith('/folders', {
                ...mockFolderRequest,
                name: "Test Folder"
            });
        });

        it('should handle special characters in folder names', async () => {
            const specialCharNames = [
                "Test & Integration",
                "API Tests (v2.0)",
                "Tests - Critical Path",
                "UI Tests: Mobile"
            ];
            vi.mocked(mockApiService.post).mockResolvedValue(mockCreatedFolder);

            for (const name of specialCharNames) {
                const request = { ...mockFolderRequest, name };
                await expect(createFolder(mockApiService, request)).resolves.not.toThrow();
            }
        });
    });
});