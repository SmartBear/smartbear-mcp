/**
 * System metadata retrieval including statuses, priorities, and environments.
 */

import type { ApiService } from "../services/api.js";
import type { CacheService } from "../services/cache.js";
import type { Status, Priority, Environment, ToolDefinition } from "../types.js";

export async function getStatuses(apiService: ApiService, cacheService: CacheService, projectKey?: string): Promise<Status[]> {
    /**
     * Retrieve available test case and execution statuses.
     *
     * Fetches all status options for test cases and test executions,
     * with optional project-specific filtering. Results are cached for performance.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * cacheService : CacheService
     *     Caching service for performance optimization
     * projectKey : string, optional
     *     Project key to filter project-specific statuses
     *
     * Returns
     * -------
     * Status[]
     *     Array of available status options
     *
     * Raises
     * ------
     * Error
     *     If API request fails
     */
    if (!apiService) {
        throw new Error("ApiService is required");
    }

    if (!cacheService) {
        throw new Error("CacheService is required");
    }

    // Validate project key format if provided
    if (projectKey && projectKey.trim() !== "" && !isValidProjectKey(projectKey.trim())) {
        throw new Error("Project key must start with a capital letter and contain only capital letters and numbers");
    }

    const cacheKey: string = projectKey
        ? cacheService.generateKey("statuses", projectKey.trim())
        : cacheService.generateKey("statuses");

    // Try to get from cache first
    const cachedStatuses: Status[] | undefined = cacheService.get<Status[]>(cacheKey);
    if (cachedStatuses) {
        return cachedStatuses;
    }

    try {
        const params: Record<string, any> = {};
        if (projectKey && projectKey.trim() !== "") {
            params.projectKey = projectKey.trim();
        }

        const statuses: Status[] = await apiService.get<Status[]>("/statuses", params);
        const result: Status[] = statuses || [];

        // Validate response format
        if (!Array.isArray(result)) {
            throw new Error("Invalid response format: expected array of statuses");
        }

        // Cache the results with default TTL (5 minutes)
        cacheService.set(cacheKey, result);

        return result;
    } catch (error) {
        if (error instanceof Error) {
            const context = projectKey ? ` for project ${projectKey}` : "";
            throw new Error(`Failed to retrieve statuses${context}: ${error.message}`);
        } else {
            throw new Error(`Failed to retrieve statuses: Unknown error occurred`);
        }
    }
}

function isValidProjectKey(projectKey: string): boolean {
    // Project key must start with capital letter and can contain capitals, numbers, and underscores
    // Allow single character project keys (e.g., "A") as well as multi-character keys
    const projectKeyPattern = /^[A-Z][A-Z_0-9]*$/;
    return projectKeyPattern.test(projectKey);
}

export async function getPriorities(apiService: ApiService, cacheService: CacheService, projectKey?: string): Promise<Priority[]> {
    /**
     * Retrieve available test case priorities.
     *
     * Fetches all priority levels for test cases with optional
     * project-specific filtering. Results are cached for performance.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * cacheService : CacheService
     *     Caching service for performance optimization
     * projectKey : string, optional
     *     Project key to filter project-specific priorities
     *
     * Returns
     * -------
     * Priority[]
     *     Array of available priority levels
     *
     * Raises
     * ------
     * Error
     *     If API request fails
     */
    if (!apiService) {
        throw new Error("ApiService is required");
    }

    if (!cacheService) {
        throw new Error("CacheService is required");
    }

    // Validate project key format if provided
    if (projectKey && projectKey.trim() !== "" && !isValidProjectKey(projectKey.trim())) {
        throw new Error("Project key must start with a capital letter and contain only capital letters and numbers");
    }

    const cacheKey: string = projectKey
        ? cacheService.generateKey("priorities", projectKey.trim())
        : cacheService.generateKey("priorities");

    // Try to get from cache first
    const cachedPriorities: Priority[] | undefined = cacheService.get<Priority[]>(cacheKey);
    if (cachedPriorities) {
        return cachedPriorities;
    }

    try {
        const params: Record<string, any> = {};
        if (projectKey && projectKey.trim() !== "") {
            params.projectKey = projectKey.trim();
        }

        const priorities: Priority[] = await apiService.get<Priority[]>("/priorities", params);
        const result: Priority[] = priorities || [];

        // Validate response format
        if (!Array.isArray(result)) {
            throw new Error("Invalid response format: expected array of priorities");
        }

        // Cache the results with default TTL (5 minutes)
        cacheService.set(cacheKey, result);

        return result;
    } catch (error) {
        if (error instanceof Error) {
            const context = projectKey ? ` for project ${projectKey}` : "";
            throw new Error(`Failed to retrieve priorities${context}: ${error.message}`);
        } else {
            throw new Error(`Failed to retrieve priorities: Unknown error occurred`);
        }
    }
}

export async function getEnvironments(apiService: ApiService, cacheService: CacheService, projectKey?: string): Promise<Environment[]> {
    /**
     * Retrieve available testing environments.
     *
     * Fetches all environment configurations for test execution
     * with optional project-specific filtering. Results are cached for performance.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * cacheService : CacheService
     *     Caching service for performance optimization
     * projectKey : string, optional
     *     Project key to filter project-specific environments
     *
     * Returns
     * -------
     * Environment[]
     *     Array of available testing environments
     *
     * Raises
     * ------
     * Error
     *     If API request fails
     */
    if (!apiService) {
        throw new Error("ApiService is required");
    }

    if (!cacheService) {
        throw new Error("CacheService is required");
    }

    // Validate project key format if provided
    if (projectKey && projectKey.trim() !== "" && !isValidProjectKey(projectKey.trim())) {
        throw new Error("Project key must start with a capital letter and contain only capital letters and numbers");
    }

    const cacheKey: string = projectKey
        ? cacheService.generateKey("environments", projectKey.trim())
        : cacheService.generateKey("environments");

    // Try to get from cache first
    const cachedEnvironments: Environment[] | undefined = cacheService.get<Environment[]>(cacheKey);
    if (cachedEnvironments) {
        return cachedEnvironments;
    }

    try {
        const params: Record<string, any> = {};
        if (projectKey && projectKey.trim() !== "") {
            params.projectKey = projectKey.trim();
        }

        const environments: Environment[] = await apiService.get<Environment[]>("/environments", params);
        const result: Environment[] = environments || [];

        // Validate response format
        if (!Array.isArray(result)) {
            throw new Error("Invalid response format: expected array of environments");
        }

        // Cache the results with default TTL (5 minutes)
        cacheService.set(cacheKey, result);

        return result;
    } catch (error) {
        if (error instanceof Error) {
            const context = projectKey ? ` for project ${projectKey}` : "";
            throw new Error(`Failed to retrieve environments${context}: ${error.message}`);
        } else {
            throw new Error(`Failed to retrieve environments: Unknown error occurred`);
        }
    }
}

export function createMetadataTools(): ToolDefinition[] {
    /**
     * Create MCP tool definitions for metadata operations.
     *
     * Returns comprehensive tool definitions for status, priority,
     * and environment retrieval with caching examples.
     *
     * Returns
     * -------
     * ToolDefinition[]
     *     Array containing metadata tool definitions
     */
    return [
        {
            name: "zephyr_get_statuses",
            description: "Retrieve available test case and execution status options. Results are cached for improved performance.",
            inputSchema: {
                type: "object",
                properties: {
                    projectKey: {
                        type: "string",
                        description: "Optional project key to filter project-specific statuses",
                        pattern: "^[A-Z][A-Z0-9]*$",
                        examples: ["PROJ", "DEV", "QA"]
                    }
                },
                additionalProperties: false
            }
        },
        {
            name: "zephyr_get_priorities",
            description: "Retrieve available test case priority levels for organizing test importance. Results are cached for performance.",
            inputSchema: {
                type: "object",
                properties: {
                    projectKey: {
                        type: "string",
                        description: "Optional project key to filter project-specific priorities",
                        pattern: "^[A-Z][A-Z0-9]*$",
                        examples: ["PROJ", "DEV", "QA"]
                    }
                },
                additionalProperties: false
            }
        },
        {
            name: "zephyr_get_environments",
            description: "Retrieve available testing environments for test execution configuration. Cached results improve response times.",
            inputSchema: {
                type: "object",
                properties: {
                    projectKey: {
                        type: "string",
                        description: "Optional project key to filter project-specific environments",
                        pattern: "^[A-Z][A-Z0-9]*$",
                        examples: ["PROJ", "DEV", "QA"]
                    }
                },
                additionalProperties: false
            }
        }
    ];
}