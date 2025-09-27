/**
 * Folder structure management for test case organization.
 */

import type { ApiService } from "../services/api.js";
import type { Folder, CreateFolderRequest, ToolDefinition } from "../types.js";

export async function getFolders(apiService: ApiService, projectKey: string, folderType?: string): Promise<Folder[]> {
    /**
     * Retrieve folders for test case organization.
     *
     * Fetches folder hierarchy for the specified project, optionally
     * filtering by folder type.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * projectKey : string
     *     Project key to retrieve folders for
     * folderType : string, optional
     *     Folder type filter ("TEST_CASE", "TEST_PLAN", or "TEST_CYCLE")
     *
     * Returns
     * -------
     * Folder[]
     *     Array of folders in the specified scope
     *
     * Raises
     * ------
     * Error
     *     If project key is invalid or API request fails
     */
    // Validate required API service
    if (!apiService) {
        throw new Error("ApiService is required and cannot be null");
    }

    if (!projectKey || projectKey.trim() === "") {
        throw new Error("Project key is required and cannot be empty");
    }

    const cleanProjectKey: string = projectKey.trim();

    // Validate project key format
    if (!isValidProjectKey(cleanProjectKey)) {
        throw new Error("Project key must start with a capital letter and contain only capital letters and numbers");
    }

    // Validate folder type if provided
    if (folderType && !isValidFolderType(folderType)) {
        throw new Error("Folder type must be TEST_CASE, TEST_PLAN, or TEST_CYCLE");
    }

    const params: Record<string, any> = {
        projectKey: cleanProjectKey
    };

    if (folderType) {
        params.folderType = folderType;
    }

    try {
        const folders: Folder[] = await apiService.get<Folder[]>("/folders", params);
        return folders || [];
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to retrieve folders for project ${cleanProjectKey}: ${error.message}`);
        } else {
            throw new Error(`Failed to retrieve folders for project ${cleanProjectKey}: Unknown error occurred`);
        }
    }
}

function isValidProjectKey(projectKey: string): boolean {
    // Project key must start with capital letter and contain only capitals and numbers
    // Based on test expectations: single characters allowed, no underscores
    const projectKeyPattern = /^[A-Z][A-Z0-9]*$/;
    return projectKeyPattern.test(projectKey);
}

function isValidFolderType(folderType: string): boolean {
    const validTypes = ["TEST_CASE", "TEST_PLAN", "TEST_CYCLE"];
    return validTypes.includes(folderType);
}

export async function createFolder(apiService: ApiService, folderData: CreateFolderRequest): Promise<Folder> {
    /**
     * Create a new folder for test case organization.
     *
     * Creates folder within specified project and parent folder,
     * enabling hierarchical organization of test cases.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * folderData : CreateFolderRequest
     *     Folder data including name, folderType, project, and parent
     *
     * Returns
     * -------
     * Folder
     *     Newly created folder with assigned ID
     *
     * Raises
     * ------
     * Error
     *     If required fields are missing or parent folder doesn't exist
     */
    if (!apiService) {
        throw new Error("ApiService is required and cannot be null");
    }

    if (!folderData) {
        throw new Error("Folder data is required");
    }

    if (!folderData.name || folderData.name.trim() === "") {
        throw new Error("Folder name is required and cannot be empty");
    }

    const trimmedName = folderData.name.trim();
    
    // Validate folder name length (API spec: maxLength 255, minLength 1)
    if (trimmedName.length > 255) {
        throw new Error("Folder name cannot exceed 255 characters");
    }

    if (!folderData.projectKey || folderData.projectKey.trim() === "") {
        throw new Error("Project key is required and cannot be empty");
    }

    if (!folderData.folderType || folderData.folderType.trim() === "") {
        throw new Error("Folder type is required and cannot be empty");
    }

    // Validate project key format
    if (!isValidProjectKey(folderData.projectKey.trim())) {
        throw new Error("Project key must start with a capital letter and contain only capital letters and numbers");
    }

    // Validate folder type
    if (!isValidFolderType(folderData.folderType)) {
        throw new Error("Folder type must be TEST_CASE, TEST_PLAN, or TEST_CYCLE");
    }

    const cleanFolderData: CreateFolderRequest = {
        name: trimmedName,
        folderType: folderData.folderType,
        projectKey: folderData.projectKey.trim(),
        parentId: folderData.parentId
    };

    if (cleanFolderData.parentId !== undefined && cleanFolderData.parentId !== null && cleanFolderData.parentId < 1) {
        throw new Error("Parent folder ID must be a positive number");
    }

    try {
        const createdFolder: Folder = await apiService.post<Folder>("/folders", cleanFolderData);
        return createdFolder;
    } catch (error) {
        if (error instanceof Error) {
            throw new Error(`Failed to create folder "${cleanFolderData.name}": ${error.message}`);
        } else {
            throw new Error(`Failed to create folder "${cleanFolderData.name}": Unknown error occurred`);
        }
    }
}

export function createFolderTools(): ToolDefinition[] {
    /**
     * Create MCP tool definitions for folder operations.
     *
     * Returns comprehensive tool definitions for folder management
     * with examples and organizational use cases.
     *
     * Returns
     * -------
     * ToolDefinition[]
     *     Array containing folder management tool definitions
     */
    return [
        {
            name: "zephyr_get_folders",
            description: "Retrieve folder hierarchy for test case organization. Optionally filter by parent folder to get specific subtree.",
            inputSchema: {
                type: "object",
                properties: {
                    projectKey: {
                        type: "string",
                        description: "Project key to retrieve folders for",
                        pattern: "^[A-Z][A-Z0-9]*$",
                        examples: ["PROJ", "DEV", "QA"]
                    },
                    parentFolderId: {
                        type: "number",
                        description: "Optional parent folder ID to filter children. Omit to get root folders.",
                        minimum: 1,
                        examples: [123, 456, 789]
                    }
                },
                required: ["projectKey"],
                additionalProperties: false
            }
        },
        {
            name: "zephyr_create_folder",
            description: "Create new folder for organizing test cases hierarchically. Supports nested folder structure with parent-child relationships.",
            inputSchema: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        description: "Folder name for organization",
                        minLength: 1,
                        examples: ["UI Tests", "API Integration", "Regression Suite", "Smoke Tests", "Performance Tests"]
                    },
                    description: {
                        type: "string",
                        description: "Optional folder description explaining its purpose",
                        examples: [
                            "Contains all user interface validation tests",
                            "API integration and contract testing",
                            "Full regression test coverage",
                            "Critical functionality verification"
                        ]
                    },
                    projectKey: {
                        type: "string",
                        description: "Project key where the folder will be created",
                        pattern: "^[A-Z][A-Z0-9]*$",
                        examples: ["PROJ", "DEV", "QA"]
                    },
                    parentFolderId: {
                        type: "number",
                        description: "Optional parent folder ID for hierarchical organization",
                        minimum: 1,
                        examples: [123, 456, 789]
                    }
                },
                required: ["name", "projectKey"],
                additionalProperties: false
            }
        }
    ];
}