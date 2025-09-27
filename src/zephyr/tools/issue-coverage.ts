/**
 * Issue to test case coverage analysis tools.
 *
 * This module provides tools for analyzing test coverage for specific
 * issues or requirements, including coverage reports and gap analysis.
 */

import type { ApiService } from "../services/api.js";
import type { TestCase, ToolDefinition } from "../types.js";

export async function getIssueCoverage(apiService: ApiService, issueKey: string, projectKey?: string): Promise<TestCase[]> {
    /**
     * Retrieve test cases that provide coverage for a specific issue.
     *
     * Fetches all test cases linked to the specified issue key, providing
     * insight into test coverage for bugs, requirements, or user stories.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * issueKey : string
     *     Jira issue key (e.g., "PROJECT-123")
     * projectKey : string, optional
     *     Project key to scope the search
     *
     * Returns
     * -------
     * TestCase[]
     *     Array of test cases that cover the specified issue
     *
     * Raises
     * ------
     * Error
     *     If issue key is invalid or API request fails
     */
    if (!apiService) {
        throw new Error("ApiService is required");
    }

    if (!issueKey || issueKey.trim() === "") {
        throw new Error("Issue key is required and cannot be empty");
    }

    const cleanIssueKey: string = issueKey.trim();

    // Validate issue key format (PROJECT-123)
    const issueKeyPattern: RegExp = /^[A-Z][A-Z0-9]*-\d+$/;
    if (!issueKeyPattern.test(cleanIssueKey)) {
        throw new Error(`Invalid issue key format: ${cleanIssueKey}. Expected format: PROJECT-123`);
    }

    try {
        const params: Record<string, any> = {};
        if (projectKey) {
            params.projectKey = projectKey.trim();
        }

        const response: TestCase[] = await apiService.get<TestCase[]>(`/issuelinks/${cleanIssueKey}/testcases`, params);

        if (!Array.isArray(response)) {
            throw new Error(`Invalid API response: Expected array of test cases, got ${typeof response}`);
        }

        return response;

    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("404")) {
                throw new Error(`Issue not found: ${cleanIssueKey}. Verify the issue key exists and is accessible.`);
            }
            if (error.message.includes("403")) {
                throw new Error(`Access denied for issue: ${cleanIssueKey}. Check permissions and authentication.`);
            }
            if (error.message.includes("400")) {
                throw new Error(`Bad request for issue: ${cleanIssueKey}. Verify issue key format and project scope.`);
            }
        }
        throw error;
    }
}

export function createIssueCoverageTools(): ToolDefinition[] {
    /**
     * Create MCP tool definitions for issue coverage operations.
     *
     * Returns comprehensive tool definitions with examples, use cases,
     * and validation rules for issue coverage analysis.
     *
     * Returns
     * -------
     * ToolDefinition[]
     *     Array containing issue coverage tool definitions
     */
    return [
        {
            name: "zephyr_get_issue_coverage",
            description: "Retrieve test cases that provide coverage for a specific JIRA issue, enabling coverage analysis and gap identification.",
            inputSchema: {
                type: "object",
                properties: {
                    issueKey: {
                        type: "string",
                        description: "JIRA issue key in format PROJECT-123",
                        pattern: "^[A-Z][A-Z0-9]*-\\d+$",
                        examples: ["PROJ-123", "DEV-456", "BUG-789"]
                    },
                    projectKey: {
                        type: "string",
                        description: "Optional project key to scope the search",
                        pattern: "^[A-Z][A-Z0-9]*$",
                        examples: ["PROJ", "DEV", "BUG"]
                    }
                },
                required: ["issueKey"],
                additionalProperties: false
            }
        }
    ];
}