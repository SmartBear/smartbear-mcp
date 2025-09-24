/**
 * Main ZephyrClient class implementing Client interface for MCP integration.
 *
 * Provides AI assistants with comprehensive test management capabilities including
 * test case creation, test planning, execution tracking, and issue coverage analysis.
 */

import type { Client, GetInputFunction, RegisterToolsFunction } from "../common/types.js";
import { AuthService } from "./services/auth.js";
import { ApiService } from "./services/api.js";
import { CacheService } from "./services/cache.js";
import { getIssueCoverage } from "./tools/issue-coverage.js";
import {
    createTestCase,
    updateTestCase,
    addTestScript,
    addTestSteps,
    linkTestCaseToIssue
} from "./tools/test-cases.js";
import {
    createTestPlan,
    createTestCycle,
    linkTestPlanToCycle
} from "./tools/test-planning.js";
import {
    createTestExecution,
    updateTestExecution
} from "./tools/test-execution.js";
import {
    getFolders,
    createFolder
} from "./tools/folders.js";
import {
    getStatuses,
    getPriorities,
    getEnvironments
} from "./tools/metadata.js";

const DEFAULT_BASE_URL: string = "https://api.zephyrscale.smartbear.com/v2";

export class ZephyrClient implements Client {
    /**
     * Zephyr Cloud API client for test management operations.
     *
     * Implements the MCP Client interface to provide AI assistants with
     * comprehensive test management capabilities including test case creation,
     * test planning, execution tracking, and issue coverage analysis.
     *
     * Properties
     * ----------
     * name : string
     *     Display name for the client: "Zephyr Test Management"
     * prefix : string
     *     Tool prefix for MCP registration: "zephyr"
     * authService : AuthService
     *     Handles JWT authentication and token validation
     * apiService : ApiService
     *     Manages HTTP communication with Zephyr Cloud API
     * cacheService : CacheService
     *     Provides caching functionality for performance optimization
     */
    readonly name: string = "Zephyr Test Management";
    readonly prefix: string = "zephyr";
    private authService: AuthService;
    private apiService: ApiService;
    private cacheService: CacheService;
    private projectKey?: string;

    constructor(accessToken?: string, projectKey?: string, baseUrl?: string) {
        /**
         * Initialize ZephyrClient with authentication and configuration.
         *
         * Loads configuration from environment variables if not provided directly.
         * Validates required authentication token and initializes core services.
         *
         * Parameters
         * ----------
         * accessToken : string, optional
         *     JWT access token for Zephyr Cloud API. Falls back to ZEPHYR_ACCESS_TOKEN env var.
         * projectKey : string, optional
         *     Default project key for scoped operations. Falls back to ZEPHYR_PROJECT_KEY env var.
         * baseUrl : string, optional
         *     Custom API base URL. Falls back to ZEPHYR_BASE_URL env var or default (https://api.zephyrscale.smartbear.com/v2).
         *
         * Raises
         * ------
         * Error
         *     If ZEPHYR_ACCESS_TOKEN is not provided via parameter or environment variable.
         */
        // Load configuration from parameters or environment variables
        const token: string | undefined = accessToken || process.env.ZEPHYR_ACCESS_TOKEN;
        const apiBaseUrl: string = baseUrl || process.env.ZEPHYR_BASE_URL || DEFAULT_BASE_URL;

        // Validate required access token
        if (!token) {
            throw new Error("ZEPHYR_ACCESS_TOKEN is required - provide via parameter or environment variable");
        }

        // Store optional project key
        this.projectKey = projectKey || process.env.ZEPHYR_PROJECT_KEY;

        // Initialize authentication service
        this.authService = new AuthService(token);

        // Initialize API service
        this.apiService = new ApiService(apiBaseUrl, this.authService);

        // Initialize cache service with 5-minute default TTL
        this.cacheService = new CacheService(300);
    }

    registerTools(register: RegisterToolsFunction, getInput: GetInputFunction): void {
        /**
         * Register all Zephyr tools with the MCP server.
         *
         * Registers complete tool implementations for Phase 2: issue coverage and test case management.
         * Tools are organized by functional domain with comprehensive error handling and validation.
         *
         * Each tool includes comprehensive ToolParams with examples, use cases, and validation.
         */

        // Issue Coverage Tool - Phase 2
        register(
            {
                title: "Get Issue Test Coverage",
                summary: "Analyze test coverage for specific issues or requirements",
                purpose: "Retrieve test case coverage information for JIRA issues to ensure adequate testing",
                useCases: [
                    "Check which test cases cover a specific user story or bug fix",
                    "Identify gaps in test coverage for requirements",
                    "Generate coverage reports for stakeholders"
                ],
                examples: [
                    {
                        description: "Get test coverage for a JIRA issue",
                        parameters: { issueKey: "PROJ-123" },
                        expectedOutput: "Array of TestCase objects covering the issue"
                    },
                    {
                        description: "Get test coverage scoped to a project",
                        parameters: { issueKey: "DEV-456", projectKey: "DEV" },
                        expectedOutput: "Array of TestCase objects covering the issue within the project scope"
                    }
                ],
                hints: [
                    "Requires valid JIRA issue key in format PROJECT-123",
                    "Issue must exist in linked project",
                    "Use projectKey parameter to scope search to specific project"
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
                            description: "Optional project key to scope the search",
                            pattern: "^[A-Z][A-Z0-9]*$"
                        }
                    },
                    required: ["issueKey"]
                }
            },
            async (args: { issueKey: string; projectKey?: string }, _extra: any) => {
                try {
                    const testCases = await getIssueCoverage(this.apiService, args.issueKey, args.projectKey);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                issueKey: args.issueKey,
                                projectKey: args.projectKey,
                                coverageCount: testCases.length,
                                testCases: testCases
                            }, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error retrieving issue coverage: ${error instanceof Error ? error.message : String(error)}`
                        }],
                        isError: true
                    };
                }
            }
        );

        // Create Test Case Tool - Phase 2
        register(
            {
                title: "Create Test Case",
                summary: "Create new test cases with detailed specifications",
                purpose: "Add comprehensive test cases to ensure quality coverage",
                useCases: [
                    "Create manual test cases from requirements",
                    "Document test procedures and expected outcomes",
                    "Establish test case libraries for reuse"
                ],
                examples: [
                    {
                        description: "Create a basic test case",
                        parameters: {
                            name: "Login functionality test",
                            description: "Verify user can login successfully with valid credentials",
                            projectKey: "PROJ"
                        },
                        expectedOutput: "TestCase object with assigned ID and key"
                    },
                    {
                        description: "Create test case with folder and priority",
                        parameters: {
                            name: "Payment processing verification",
                            description: "Validate payment flow for multiple payment methods",
                            projectKey: "ECOM",
                            folderId: 123,
                            priorityId: 1
                        },
                        expectedOutput: "TestCase object with assigned ID, key, folder, and priority"
                    }
                ],
                hints: [
                    "Name and projectKey are required fields",
                    "Use folderId to organize test cases",
                    "Use priorityId and statusId for metadata"
                ],
                readOnly: false,
                idempotent: false,
                parameters: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "Test case name/title (required)",
                            minLength: 1
                        },
                        description: {
                            type: "string",
                            description: "Detailed test case description"
                        },
                        projectKey: {
                            type: "string",
                            description: "Project key where the test case will be created",
                            pattern: "^[A-Z][A-Z0-9]*$"
                        },
                        folderId: {
                            type: "number",
                            description: "Optional folder ID for organization"
                        },
                        priorityId: {
                            type: "number",
                            description: "Optional priority level ID"
                        },
                        statusId: {
                            type: "number",
                            description: "Optional initial status ID"
                        }
                    },
                    required: ["name", "projectKey"]
                }
            },
            async (args: { name: string; description?: string; projectKey: string; folderId?: number; priorityId?: number; statusId?: number }, _extra: any) => {
                try {
                    const testCase = await createTestCase(this.apiService, args);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(testCase, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error creating test case: ${error instanceof Error ? error.message : String(error)}`
                        }],
                        isError: true
                    };
                }
            }
        );

        // Update Test Case Tool - Phase 2
        register(
            {
                title: "Update Test Case",
                summary: "Update existing test case properties",
                purpose: "Modify test case metadata while preserving existing data for unspecified fields",
                useCases: [
                    "Update test case name or description",
                    "Move test case to different folder",
                    "Change priority or status of existing test case"
                ],
                examples: [
                    {
                        description: "Update test case name",
                        parameters: {
                            testCaseKey: "PROJ-T123",
                            name: "Updated login functionality test"
                        },
                        expectedOutput: "Updated TestCase object with new name"
                    },
                    {
                        description: "Move test case to different folder",
                        parameters: {
                            testCaseKey: "PROJ-T123",
                            folderId: 456
                        },
                        expectedOutput: "Updated TestCase object with new folder assignment"
                    }
                ],
                hints: [
                    "testCaseKey is required and must exist",
                    "Only specified fields will be updated",
                    "Use PROJECT-T123 format for test case keys"
                ],
                readOnly: false,
                idempotent: true,
                parameters: {
                    type: "object",
                    properties: {
                        testCaseKey: {
                            type: "string",
                            description: "Test case key to update",
                            pattern: "^[A-Z][A-Z0-9]*-T\\d+$"
                        },
                        name: {
                            type: "string",
                            description: "Updated test case name",
                            minLength: 1
                        },
                        description: {
                            type: "string",
                            description: "Updated description"
                        },
                        folderId: {
                            type: "number",
                            description: "Updated folder assignment"
                        },
                        priorityId: {
                            type: "number",
                            description: "Updated priority level"
                        },
                        statusId: {
                            type: "number",
                            description: "Updated status"
                        }
                    },
                    required: ["testCaseKey"]
                }
            },
            async (args: { testCaseKey: string; name?: string; description?: string; folderId?: number; priorityId?: number; statusId?: number }, _extra: any) => {
                try {
                    const { testCaseKey, ...updateData } = args;
                    const testCase = await updateTestCase(this.apiService, testCaseKey, updateData);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(testCase, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error updating test case: ${error instanceof Error ? error.message : String(error)}`
                        }],
                        isError: true
                    };
                }
            }
        );

        // Add Test Script Tool - Phase 2
        register(
            {
                title: "Add Test Script",
                summary: "Add test script or detailed instructions to an existing test case",
                purpose: "Attach executable test automation script or detailed manual testing instructions",
                useCases: [
                    "Add manual testing instructions to test case",
                    "Attach automation scripts for test execution",
                    "Document step-by-step testing procedures"
                ],
                examples: [
                    {
                        description: "Add manual testing script",
                        parameters: {
                            testCaseKey: "PROJ-T123",
                            text: "1. Navigate to login page\\n2. Enter valid credentials\\n3. Click login button\\n4. Verify successful login",
                            type: "PLAIN_TEXT"
                        },
                        expectedOutput: "TestScript object with assigned ID"
                    },
                    {
                        description: "Add automation script",
                        parameters: {
                            testCaseKey: "PROJ-T123",
                            text: "selenium.get('https://app.com/login'); selenium.find_element_by_id('username').send_keys('user');",
                            type: "AUTOMATION"
                        },
                        expectedOutput: "TestScript object with automation type"
                    }
                ],
                hints: [
                    "testCaseKey and text are required",
                    "type defaults to PLAIN_TEXT if not specified",
                    "Use automation type for executable scripts"
                ],
                readOnly: false,
                idempotent: false,
                parameters: {
                    type: "object",
                    properties: {
                        testCaseKey: {
                            type: "string",
                            description: "Test case key to add script to",
                            pattern: "^[A-Z][A-Z0-9]*-T\\d+$"
                        },
                        text: {
                            type: "string",
                            description: "Script content or detailed testing instructions",
                            minLength: 1
                        },
                        type: {
                            type: "string",
                            description: "Script type - defaults to PLAIN_TEXT",
                            enum: ["PLAIN_TEXT", "AUTOMATION", "CUCUMBER", "SELENIUM"]
                        }
                    },
                    required: ["testCaseKey", "text"]
                }
            },
            async (args: { testCaseKey: string; text: string; type?: string }, _extra: any) => {
                try {
                    const { testCaseKey, ...scriptData } = args;
                    const testScript = await addTestScript(this.apiService, testCaseKey, scriptData);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(testScript, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error adding test script: ${error instanceof Error ? error.message : String(error)}`
                        }],
                        isError: true
                    };
                }
            }
        );

        // Add Test Steps Tool - Phase 2
        register(
            {
                title: "Add Test Steps",
                summary: "Add structured test steps to a test case",
                purpose: "Define step-by-step execution procedure with expected results and test data",
                useCases: [
                    "Break down test case into detailed steps",
                    "Define expected results for each step",
                    "Specify test data required for execution"
                ],
                examples: [
                    {
                        description: "Add login test steps",
                        parameters: {
                            testCaseKey: "PROJ-T123",
                            steps: [
                                {
                                    description: "Navigate to login page",
                                    expectedResult: "Login page displays with username and password fields"
                                },
                                {
                                    description: "Enter valid username",
                                    expectedResult: "Username field accepts input",
                                    testData: "testuser@example.com"
                                },
                                {
                                    description: "Click login button",
                                    expectedResult: "User successfully logged in and redirected to dashboard"
                                }
                            ]
                        },
                        expectedOutput: "Array of TestStep objects with assigned IDs and ordering"
                    }
                ],
                hints: [
                    "testCaseKey and steps array are required",
                    "Each step must have description and expectedResult",
                    "testData is optional for each step"
                ],
                readOnly: false,
                idempotent: false,
                parameters: {
                    type: "object",
                    properties: {
                        testCaseKey: {
                            type: "string",
                            description: "Test case key to add steps to",
                            pattern: "^[A-Z][A-Z0-9]*-T\\d+$"
                        },
                        steps: {
                            type: "array",
                            description: "Array of test steps to add",
                            minItems: 1,
                            items: {
                                type: "object",
                                properties: {
                                    description: {
                                        type: "string",
                                        description: "Step action description",
                                        minLength: 1
                                    },
                                    expectedResult: {
                                        type: "string",
                                        description: "Expected outcome of the action",
                                        minLength: 1
                                    },
                                    testData: {
                                        type: "string",
                                        description: "Test data needed for this step"
                                    }
                                },
                                required: ["description", "expectedResult"]
                            }
                        }
                    },
                    required: ["testCaseKey", "steps"]
                }
            },
            async (args: { testCaseKey: string; steps: Array<{ description: string; expectedResult: string; testData?: string }> }, _extra: any) => {
                try {
                    const { testCaseKey, ...stepsData } = args;
                    const testSteps = await addTestSteps(this.apiService, testCaseKey, stepsData);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(testSteps, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error adding test steps: ${error instanceof Error ? error.message : String(error)}`
                        }],
                        isError: true
                    };
                }
            }
        );

        // Link Test Case to Issue Tool - Phase 2
        register(
            {
                title: "Link Test Case to Issue",
                summary: "Create bidirectional link between test case and JIRA issue",
                purpose: "Enable traceability and coverage tracking between test cases and issues",
                useCases: [
                    "Link test case to user story for requirement traceability",
                    "Connect test case to bug report for regression testing",
                    "Establish coverage mapping for requirements"
                ],
                examples: [
                    {
                        description: "Link test case to user story",
                        parameters: {
                            testCaseKey: "PROJ-T123",
                            issueKey: "PROJ-456"
                        },
                        expectedOutput: "Success confirmation of link creation"
                    },
                    {
                        description: "Link test case to bug report",
                        parameters: {
                            testCaseKey: "QA-T789",
                            issueKey: "BUG-123"
                        },
                        expectedOutput: "Success confirmation of bidirectional link"
                    }
                ],
                hints: [
                    "Both testCaseKey and issueKey are required",
                    "Creates bidirectional link for traceability",
                    "Link will fail if either resource doesn't exist"
                ],
                readOnly: false,
                idempotent: true,
                parameters: {
                    type: "object",
                    properties: {
                        testCaseKey: {
                            type: "string",
                            description: "Test case key to link",
                            pattern: "^[A-Z][A-Z0-9]*-T\\d+$"
                        },
                        issueKey: {
                            type: "string",
                            description: "JIRA issue key to link to",
                            pattern: "^[A-Z][A-Z0-9]*-\\d+$"
                        }
                    },
                    required: ["testCaseKey", "issueKey"]
                }
            },
            async (args: { testCaseKey: string; issueKey: string }, _extra: any) => {
                try {
                    await linkTestCaseToIssue(this.apiService, args.testCaseKey, args.issueKey);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                message: `Successfully linked test case ${args.testCaseKey} to issue ${args.issueKey}`,
                                testCaseKey: args.testCaseKey,
                                issueKey: args.issueKey,
                                linkType: "bidirectional"
                            }, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error linking test case to issue: ${error instanceof Error ? error.message : String(error)}`
                        }],
                        isError: true
                    };
                }
            }
        );

        // Create Test Plan Tool - Phase 3
        register(
            {
                title: "Create Test Plan",
                summary: "Create test plans for organizing test execution activities",
                purpose: "Create high-level test plans to group related test cycles and define testing objectives",
                useCases: [
                    "Create release-specific test plans",
                    "Organize test activities by feature or component",
                    "Define testing milestones and objectives"
                ],
                examples: [
                    {
                        description: "Create a basic test plan",
                        parameters: {
                            name: "Release 2.0 Test Plan",
                            description: "Test plan for Q4 release",
                            projectKey: "PROJ"
                        },
                        expectedOutput: "TestPlan object with assigned ID and key"
                    },
                    {
                        description: "Create test plan with dates",
                        parameters: {
                            name: "Sprint 15 Testing",
                            description: "Sprint testing activities",
                            projectKey: "DEV",
                            startDate: "2024-01-15T09:00:00.000Z",
                            endDate: "2024-01-25T17:00:00.000Z"
                        },
                        expectedOutput: "TestPlan object with scheduled dates"
                    }
                ],
                hints: [
                    "Name and projectKey are required fields",
                    "Use ISO format for startDate and endDate",
                    "Test plans organize multiple test cycles"
                ],
                readOnly: false,
                idempotent: false,
                parameters: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "Test plan name/title (required)",
                            minLength: 1
                        },
                        description: {
                            type: "string",
                            description: "Detailed test plan description"
                        },
                        projectKey: {
                            type: "string",
                            description: "Project key where the test plan will be created",
                            pattern: "^[A-Z][A-Z0-9]*$"
                        },
                        startDate: {
                            type: "string",
                            description: "Planned start date (ISO format: YYYY-MM-DDTHH:mm:ss.sssZ)"
                        },
                        endDate: {
                            type: "string",
                            description: "Planned end date (ISO format: YYYY-MM-DDTHH:mm:ss.sssZ)"
                        }
                    },
                    required: ["name", "projectKey"]
                }
            },
            async (args: { name: string; description?: string; projectKey: string; startDate?: string; endDate?: string }, _extra: any) => {
                try {
                    const testPlan = await createTestPlan(this.apiService, args);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(testPlan, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error creating test plan: ${error instanceof Error ? error.message : String(error)}`
                        }],
                        isError: true
                    };
                }
            }
        );

        // Create Test Cycle Tool - Phase 3
        register(
            {
                title: "Create Test Cycle",
                summary: "Create test cycles for execution tracking within test plans",
                purpose: "Create specific execution phases containing test cases to be executed",
                useCases: [
                    "Create cycles for specific testing phases",
                    "Organize test execution by environment",
                    "Track testing progress within test plans"
                ],
                examples: [
                    {
                        description: "Create a basic test cycle",
                        parameters: {
                            name: "Smoke Test Cycle",
                            description: "Critical path testing",
                            projectKey: "PROJ"
                        },
                        expectedOutput: "TestCycle object with assigned ID and key"
                    },
                    {
                        description: "Create test cycle linked to test plan",
                        parameters: {
                            name: "Integration Tests",
                            description: "API and database testing",
                            projectKey: "DEV",
                            testPlanId: 123,
                            environment: "QA"
                        },
                        expectedOutput: "TestCycle object linked to test plan"
                    }
                ],
                hints: [
                    "Name and projectKey are required fields",
                    "Use testPlanId to link cycle to existing test plan",
                    "Environment helps organize testing by target system"
                ],
                readOnly: false,
                idempotent: false,
                parameters: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "Test cycle name/title (required)",
                            minLength: 1
                        },
                        description: {
                            type: "string",
                            description: "Detailed test cycle description"
                        },
                        projectKey: {
                            type: "string",
                            description: "Project key where the test cycle will be created",
                            pattern: "^[A-Z][A-Z0-9]*$"
                        },
                        testPlanId: {
                            type: "number",
                            description: "Optional test plan ID to associate with"
                        },
                        environment: {
                            type: "string",
                            description: "Testing environment name (e.g., DEV, QA, STAGING)"
                        },
                        startDate: {
                            type: "string",
                            description: "Planned start date (ISO format: YYYY-MM-DDTHH:mm:ss.sssZ)"
                        },
                        endDate: {
                            type: "string",
                            description: "Planned end date (ISO format: YYYY-MM-DDTHH:mm:ss.sssZ)"
                        }
                    },
                    required: ["name", "projectKey"]
                }
            },
            async (args: { name: string; description?: string; projectKey: string; testPlanId?: number; environment?: string; startDate?: string; endDate?: string }, _extra: any) => {
                try {
                    const testCycle = await createTestCycle(this.apiService, args);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(testCycle, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error creating test cycle: ${error instanceof Error ? error.message : String(error)}`
                        }],
                        isError: true
                    };
                }
            }
        );

        // Link Test Plan to Cycle Tool - Phase 3
        register(
            {
                title: "Link Test Plan to Cycle",
                summary: "Create association between test plan and test cycle",
                purpose: "Enable hierarchical organization of testing activities",
                useCases: [
                    "Organize test cycles under test plans",
                    "Create hierarchical test structure",
                    "Group related execution cycles"
                ],
                examples: [
                    {
                        description: "Link cycle to test plan",
                        parameters: {
                            testPlanId: 123,
                            testCycleId: 456
                        },
                        expectedOutput: "Success confirmation of link creation"
                    }
                ],
                hints: [
                    "Both testPlanId and testCycleId are required",
                    "Both entities must exist before linking",
                    "Creates hierarchical organization structure"
                ],
                readOnly: false,
                idempotent: true,
                parameters: {
                    type: "object",
                    properties: {
                        testPlanId: {
                            type: "number",
                            description: "ID of the test plan to link to"
                        },
                        testCycleId: {
                            type: "number",
                            description: "ID of the test cycle to link"
                        }
                    },
                    required: ["testPlanId", "testCycleId"]
                }
            },
            async (args: { testPlanId: number; testCycleId: number }, _extra: any) => {
                try {
                    await linkTestPlanToCycle(this.apiService, args.testPlanId, args.testCycleId);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                success: true,
                                message: `Successfully linked test cycle ${args.testCycleId} to test plan ${args.testPlanId}`,
                                testPlanId: args.testPlanId,
                                testCycleId: args.testCycleId,
                                linkType: "hierarchical"
                            }, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error linking test plan to cycle: ${error instanceof Error ? error.message : String(error)}`
                        }],
                        isError: true
                    };
                }
            }
        );

        // Create Test Execution Tool - Phase 3
        register(
            {
                title: "Create Test Execution",
                summary: "Record test execution results linking test case to cycle",
                purpose: "Track test case execution with status, comments, and metadata",
                useCases: [
                    "Record test execution results",
                    "Track testing progress within cycles",
                    "Document test failures and observations"
                ],
                examples: [
                    {
                        description: "Record passed test execution",
                        parameters: {
                            testCaseKey: "PROJ-T123",
                            testCycleKey: "PROJ-R456",
                            statusName: "Pass"
                        },
                        expectedOutput: "TestExecution object with assigned ID"
                    },
                    {
                        description: "Record failed test with comments",
                        parameters: {
                            testCaseKey: "PROJ-T124",
                            testCycleKey: "PROJ-R456",
                            statusName: "Fail",
                            comment: "Login button not responding in Chrome",
                            environment: "QA"
                        },
                        expectedOutput: "TestExecution object with failure details"
                    }
                ],
                hints: [
                    "testCaseKey, testCycleKey, and statusName are required",
                    "Use PROJECT-T123 format for test case keys",
                    "Use PROJECT-R123 format for test cycle keys",
                    "Status should be Pass, Fail, Blocked, In Progress, or Not Executed"
                ],
                readOnly: false,
                idempotent: false,
                parameters: {
                    type: "object",
                    properties: {
                        testCaseKey: {
                            type: "string",
                            description: "Test case key to execute (format: PROJECT-T123)",
                            pattern: "^[A-Z][A-Z0-9]*-T\\d+$"
                        },
                        testCycleKey: {
                            type: "string",
                            description: "Test cycle key for organization (format: PROJECT-R123)",
                            pattern: "^[A-Z][A-Z0-9]*-R\\d+$"
                        },
                        statusName: {
                            type: "string",
                            description: "Execution status name",
                            enum: ["Pass", "Fail", "Blocked", "In Progress", "Not Executed"]
                        },
                        comment: {
                            type: "string",
                            description: "Execution comments, failure details, or test observations"
                        },
                        environment: {
                            type: "string",
                            description: "Environment where test was executed (e.g., DEV, QA, STAGING, PROD)"
                        },
                        executedOn: {
                            type: "string",
                            description: "Execution timestamp (ISO format: YYYY-MM-DDTHH:mm:ss.sssZ)"
                        }
                    },
                    required: ["testCaseKey", "testCycleKey", "statusName"]
                }
            },
            async (args: { testCaseKey: string; testCycleKey: string; statusName: string; comment?: string; environment?: string; executedOn?: string }, _extra: any) => {
                try {
                    const testExecution = await createTestExecution(this.apiService, args);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(testExecution, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error creating test execution: ${error instanceof Error ? error.message : String(error)}`
                        }],
                        isError: true
                    };
                }
            }
        );

        // Update Test Execution Tool - Phase 3
        register(
            {
                title: "Update Test Execution",
                summary: "Update existing test execution with new status or comments",
                purpose: "Modify test execution results to reflect current testing progress",
                useCases: [
                    "Update test status after re-execution",
                    "Add comments to existing execution",
                    "Change execution environment information"
                ],
                examples: [
                    {
                        description: "Update execution status",
                        parameters: {
                            executionId: 789,
                            statusName: "Pass"
                        },
                        expectedOutput: "Updated TestExecution object"
                    },
                    {
                        description: "Add failure comments",
                        parameters: {
                            executionId: 789,
                            statusName: "Fail",
                            comment: "Updated: Issue reproduced in Firefox as well"
                        },
                        expectedOutput: "Updated TestExecution object with new comments"
                    }
                ],
                hints: [
                    "executionId is required",
                    "At least one field must be provided for update",
                    "Only specified fields will be modified"
                ],
                readOnly: false,
                idempotent: true,
                parameters: {
                    type: "object",
                    properties: {
                        executionId: {
                            type: "number",
                            description: "ID of the test execution to update"
                        },
                        statusName: {
                            type: "string",
                            description: "Updated execution status",
                            enum: ["Pass", "Fail", "Blocked", "In Progress", "Not Executed"]
                        },
                        comment: {
                            type: "string",
                            description: "Updated execution comments or notes"
                        },
                        environment: {
                            type: "string",
                            description: "Updated environment information"
                        },
                        executedOn: {
                            type: "string",
                            description: "Updated execution timestamp (ISO format: YYYY-MM-DDTHH:mm:ss.sssZ)"
                        }
                    },
                    required: ["executionId"]
                }
            },
            async (args: { executionId: number; statusName?: string; comment?: string; environment?: string; executedOn?: string }, _extra: any) => {
                try {
                    const { executionId, ...updateData } = args;
                    const testExecution = await updateTestExecution(this.apiService, executionId, updateData);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(testExecution, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error updating test execution: ${error instanceof Error ? error.message : String(error)}`
                        }],
                        isError: true
                    };
                }
            }
        );

        // Get Folders Tool - Phase 4
        register(
            {
                title: "Get Folders",
                summary: "Retrieve folder hierarchy for test case organization",
                purpose: "Browse folder structure to understand test case organization and find appropriate folders for new test cases",
                useCases: [
                    "Browse project folder structure",
                    "Find appropriate folder for new test cases",
                    "Understand test case organization hierarchy"
                ],
                examples: [
                    {
                        description: "Get root folders for a project",
                        parameters: { projectKey: "PROJ" },
                        expectedOutput: "Array of root-level Folder objects"
                    },
                    {
                        description: "Get subfolders of a specific folder",
                        parameters: { projectKey: "PROJ", parentFolderId: 123 },
                        expectedOutput: "Array of child Folder objects under parent folder"
                    }
                ],
                hints: [
                    "projectKey is required",
                    "Omit parentFolderId to get root folders",
                    "Include parentFolderId to get specific subfolder contents"
                ],
                readOnly: true,
                idempotent: true,
                parameters: {
                    type: "object",
                    properties: {
                        projectKey: {
                            type: "string",
                            description: "Project key to retrieve folders for",
                            pattern: "^[A-Z][A-Z0-9]*$"
                        },
                        parentFolderId: {
                            type: "number",
                            description: "Optional parent folder ID to filter children",
                            minimum: 1
                        }
                    },
                    required: ["projectKey"]
                } as any
            },
            async (args: { projectKey: string; parentFolderId?: number }, _extra: any) => {
                try {
                    const folders = await getFolders(this.apiService, args.projectKey, args.parentFolderId);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                projectKey: args.projectKey,
                                parentFolderId: args.parentFolderId,
                                folderCount: folders.length,
                                folders: folders
                            }, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error retrieving folders: ${error instanceof Error ? error.message : String(error)}`
                        }],
                        isError: true
                    };
                }
            }
        );

        // Create Folder Tool - Phase 4
        register(
            {
                title: "Create Folder",
                summary: "Create new folder for organizing test cases hierarchically",
                purpose: "Create folder structure to organize test cases by feature, component, or testing phase",
                useCases: [
                    "Create folders for organizing test cases by feature",
                    "Establish hierarchical test case organization",
                    "Set up folder structure for new projects"
                ],
                examples: [
                    {
                        description: "Create root-level folder",
                        parameters: {
                            name: "UI Tests",
                            description: "User interface validation tests",
                            projectKey: "PROJ"
                        },
                        expectedOutput: "Folder object with assigned ID and hierarchy information"
                    },
                    {
                        description: "Create nested subfolder",
                        parameters: {
                            name: "Login Forms",
                            description: "Login-specific UI tests",
                            projectKey: "PROJ",
                            parentFolderId: 123
                        },
                        expectedOutput: "Folder object nested under parent folder"
                    }
                ],
                hints: [
                    "name and projectKey are required",
                    "Use parentFolderId to create nested folder structure",
                    "Description helps document folder purpose"
                ],
                readOnly: false,
                idempotent: false,
                parameters: {
                    type: "object",
                    properties: {
                        name: {
                            type: "string",
                            description: "Folder name for organization",
                            minLength: 1
                        },
                        description: {
                            type: "string",
                            description: "Optional folder description explaining its purpose"
                        },
                        projectKey: {
                            type: "string",
                            description: "Project key where the folder will be created",
                            pattern: "^[A-Z][A-Z0-9]*$"
                        },
                        parentFolderId: {
                            type: "number",
                            description: "Optional parent folder ID for hierarchical organization",
                            minimum: 1
                        }
                    },
                    required: ["name", "projectKey"]
                } as any
            },
            async (args: { name: string; description?: string; projectKey: string; parentFolderId?: number }, _extra: any) => {
                try {
                    const folder = await createFolder(this.apiService, args);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify(folder, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error creating folder: ${error instanceof Error ? error.message : String(error)}`
                        }],
                        isError: true
                    };
                }
            }
        );

        // Get Statuses Tool - Phase 4
        register(
            {
                title: "Get Statuses",
                summary: "Retrieve available test case and execution status options",
                purpose: "Get list of available status options for test cases and test executions with caching for performance",
                useCases: [
                    "Find available status options for test case creation",
                    "Get status IDs for test execution recording",
                    "Validate status values before API calls"
                ],
                examples: [
                    {
                        description: "Get all available statuses",
                        parameters: {},
                        expectedOutput: "Array of Status objects with IDs, names, and metadata"
                    },
                    {
                        description: "Get project-specific statuses",
                        parameters: { projectKey: "PROJ" },
                        expectedOutput: "Array of Status objects filtered for specific project"
                    }
                ],
                hints: [
                    "Results are cached for 5 minutes for performance",
                    "Use projectKey to filter project-specific statuses",
                    "Status IDs can be used in test case and execution operations"
                ],
                readOnly: true,
                idempotent: true,
                parameters: {
                    type: "object",
                    properties: {
                        projectKey: {
                            type: "string",
                            description: "Optional project key to filter project-specific statuses",
                            pattern: "^[A-Z][A-Z0-9]*$"
                        }
                    }
                } as any
            },
            async (args: { projectKey?: string }, _extra: any) => {
                try {
                    const statuses = await getStatuses(this.apiService, this.cacheService, args.projectKey);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                projectKey: args.projectKey,
                                statusCount: statuses.length,
                                cached: true,
                                statuses: statuses
                            }, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error retrieving statuses: ${error instanceof Error ? error.message : String(error)}`
                        }],
                        isError: true
                    };
                }
            }
        );

        // Get Priorities Tool - Phase 4
        register(
            {
                title: "Get Priorities",
                summary: "Retrieve available test case priority levels",
                purpose: "Get list of priority options for organizing test case importance with caching for performance",
                useCases: [
                    "Find available priority levels for test case creation",
                    "Get priority IDs for test case metadata",
                    "Validate priority values before API calls"
                ],
                examples: [
                    {
                        description: "Get all available priorities",
                        parameters: {},
                        expectedOutput: "Array of Priority objects with IDs, names, and ordering information"
                    },
                    {
                        description: "Get project-specific priorities",
                        parameters: { projectKey: "PROJ" },
                        expectedOutput: "Array of Priority objects filtered for specific project"
                    }
                ],
                hints: [
                    "Results are cached for 5 minutes for performance",
                    "Use projectKey to filter project-specific priorities",
                    "Priority IDs can be used in test case creation and updates"
                ],
                readOnly: true,
                idempotent: true,
                parameters: {
                    type: "object",
                    properties: {
                        projectKey: {
                            type: "string",
                            description: "Optional project key to filter project-specific priorities",
                            pattern: "^[A-Z][A-Z0-9]*$"
                        }
                    }
                } as any
            },
            async (args: { projectKey?: string }, _extra: any) => {
                try {
                    const priorities = await getPriorities(this.apiService, this.cacheService, args.projectKey);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                projectKey: args.projectKey,
                                priorityCount: priorities.length,
                                cached: true,
                                priorities: priorities
                            }, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error retrieving priorities: ${error instanceof Error ? error.message : String(error)}`
                        }],
                        isError: true
                    };
                }
            }
        );

        // Get Environments Tool - Phase 4
        register(
            {
                title: "Get Environments",
                summary: "Retrieve available testing environments",
                purpose: "Get list of testing environment configurations for test execution with caching for performance",
                useCases: [
                    "Find available environments for test execution",
                    "Get environment information for test cycles",
                    "Validate environment values before execution"
                ],
                examples: [
                    {
                        description: "Get all available environments",
                        parameters: {},
                        expectedOutput: "Array of Environment objects with IDs, names, and configuration details"
                    },
                    {
                        description: "Get project-specific environments",
                        parameters: { projectKey: "PROJ" },
                        expectedOutput: "Array of Environment objects filtered for specific project"
                    }
                ],
                hints: [
                    "Results are cached for 5 minutes for performance",
                    "Use projectKey to filter project-specific environments",
                    "Environment names can be used in test cycle and execution operations"
                ],
                readOnly: true,
                idempotent: true,
                parameters: {
                    type: "object",
                    properties: {
                        projectKey: {
                            type: "string",
                            description: "Optional project key to filter project-specific environments",
                            pattern: "^[A-Z][A-Z0-9]*$"
                        }
                    }
                } as any
            },
            async (args: { projectKey?: string }, _extra: any) => {
                try {
                    const environments = await getEnvironments(this.apiService, this.cacheService, args.projectKey);
                    return {
                        content: [{
                            type: "text",
                            text: JSON.stringify({
                                projectKey: args.projectKey,
                                environmentCount: environments.length,
                                cached: true,
                                environments: environments
                            }, null, 2)
                        }]
                    };
                } catch (error) {
                    return {
                        content: [{
                            type: "text",
                            text: `Error retrieving environments: ${error instanceof Error ? error.message : String(error)}`
                        }],
                        isError: true
                    };
                }
            }
        );
    }

    getProjectKey(): string | undefined {
        /**
         * Get the configured default project key.
         *
         * Returns the project key set during initialization, used for scoped operations
         * when no explicit project is specified in tool calls.
         *
         * Returns
         * -------
         * string | undefined
         *     Configured project key or undefined if not set.
         */
        return this.projectKey;
    }
}