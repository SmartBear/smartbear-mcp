/**
 * Minimal ZephyrClient class implementing Client interface for MCP integration.
 *
 * Follows the exact same pattern as ReflectClient for guaranteed compilation success.
 */

import type { Client, GetInputFunction, RegisterToolsFunction } from "../common/types.js";
import { z } from "zod";

import { AuthService } from "./services/auth.js";
import { ApiService } from "./services/api.js";
import { CacheService } from "./services/cache.js";
import { getIssueCoverage } from "./tools/issue-coverage.js";

export class ZephyrClient implements Client {
  private authService: AuthService;
  private apiService: ApiService;
  private cacheService: CacheService;
  
  name = "Zephyr Test Management";
  prefix = "zephyr";

  constructor(
    accessToken?: string,
    projectKey?: string,
    baseUrl: string = "https://api.zephyrscale.smartbear.com/v2"
  ) {
    // Get access token from parameter or environment variable
    const token = accessToken || process.env.ZEPHYR_ACCESS_TOKEN;
    
    if (!token) {
      throw new Error("ZEPHYR_ACCESS_TOKEN is required - provide via parameter or environment variable");
    }

    // Get project key from parameter or environment variable
    const project = projectKey || process.env.ZEPHYR_PROJECT_KEY;

    // Get base URL from parameter or environment variable
    const apiBaseUrl = baseUrl || process.env.ZEPHYR_BASE_URL || "https://api.zephyrscale.smartbear.com/v2";

    // Initialize services
    this.authService = new AuthService(token);
    this.apiService = new ApiService(apiBaseUrl, this.authService);
    this.cacheService = new CacheService(300);
  }

  async listTestCases(projectKey: string): Promise<any> {
    return this.apiService.get(`/testcases`, { projectKey });
  }

  async getTestCase(testCaseKey: string): Promise<any> {
    return this.apiService.get(`/testcases/${testCaseKey}`);
  }

  async listTestPlans(projectKey: string): Promise<any> {
    return this.apiService.get(`/testplans`, { projectKey });
  }

  registerTools(
    register: RegisterToolsFunction,
    _getInput: GetInputFunction,
  ): void {
    // Register issue coverage tool
    register(
      {
        title: "Get Issue Test Coverage",
        summary: "Retrieve test cases that provide coverage for a specific JIRA issue",
        purpose: "Analyze test coverage for bugs, requirements, or user stories",
        useCases: [
          "Check which test cases cover a specific bug or feature",
          "Identify gaps in test coverage for requirements",
          "Generate coverage reports for stakeholders"
        ],
        examples: [
          {
            description: "Get coverage for a specific issue",
            input: { issueKey: "PROJ-123" },
            output: "List of test cases covering the issue"
          }
        ],
        hints: [
          "Use JIRA issue key format (e.g., PROJ-123)",
          "Ensure you have access to the issue in JIRA",
          "Coverage is based on explicit links between issues and test cases"
        ],
        readOnly: true,
        idempotent: true,
        parameters: {
          type: "object",
          properties: {
            issueKey: {
              type: "string",
              description: "JIRA issue key in format PROJECT-123",
              pattern: "^[A-Z][A-Z0-9]*-\\d+$"
            },
            projectKey: {
              type: "string",
              description: "Optional project key to scope the search"
            }
          },
          required: ["issueKey"]
        }
      },
      async (args, _extra) => {
        if (!args.issueKey) throw new Error("issueKey argument is required");
        const response = await getIssueCoverage(this.apiService, args.issueKey, args.projectKey);
        return {
          content: [{ type: "text", text: JSON.stringify(response, null, 2) }],
        };
      },
    );

    // Register list test cases tool
    register(
      {
        title: "List Test Cases",
        summary: "List test cases for a project",
        parameters: [
          {
            name: "projectKey",
            type: z.string(),
            description: "JIRA project key",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        if (!args.projectKey) throw new Error("projectKey argument is required");
        const response = await this.listTestCases(args.projectKey);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );

    // Register get test case tool
    register(
      {
        title: "Get Test Case",
        summary: "Get details of a specific test case",
        parameters: [
          {
            name: "testCaseKey",
            type: z.string(),
            description: "Test case key in Zephyr format",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        if (!args.testCaseKey) throw new Error("testCaseKey argument is required");
        const response = await this.getTestCase(args.testCaseKey);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );

    // Register list test plans tool
    register(
      {
        title: "List Test Plans",
        summary: "List test plans for a project",
        parameters: [
          {
            name: "projectKey",
            type: z.string(),
            description: "JIRA project key",
            required: true,
          },
        ],
      },
      async (args, _extra) => {
        if (!args.projectKey) throw new Error("projectKey argument is required");
        const response = await this.listTestPlans(args.projectKey);
        return {
          content: [{ type: "text", text: JSON.stringify(response) }],
        };
      },
    );
  }
}