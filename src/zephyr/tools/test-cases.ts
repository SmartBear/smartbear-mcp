/**
 * Test case CRUD operations and management.
 *
 * This module provides tools for creating, reading, updating, and deleting
 * test cases, including test scripts and steps management.
 */

import type { ApiService } from "../services/api.js";
import type {
    TestCase,
    CreateTestCaseRequest,
    UpdateTestCaseRequest,
    TestScript,
    CreateTestScriptRequest,
    TestStep,
    CreateTestStepsRequest,
    ToolDefinition
} from "../types.js";

export async function createTestCase(apiService: ApiService, testCaseData: CreateTestCaseRequest): Promise<TestCase> {
    /**
     * Create a new test case in Zephyr.
     *
     * Creates a test case with specified name, description, priority, and other
     * metadata. Links to project and folder structure as specified.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * testCaseData : CreateTestCaseRequest
     *     Test case data including name, description, priority, project, folder
     *
     * Returns
     * -------
     * TestCase
     *     Newly created test case with assigned ID and key
     *
     * Raises
     * ------
     * Error
     *     If required fields are missing or API request fails
     */
    if (!apiService) {
        throw new Error("ApiService is required");
    }

    if (!testCaseData) {
        throw new Error("Test case data is required");
    }

    if (!testCaseData.name || testCaseData.name.trim() === "") {
        throw new Error("Test case name is required and cannot be empty");
    }

    if (!testCaseData.projectKey || testCaseData.projectKey.trim() === "") {
        throw new Error("Project key is required and cannot be empty");
    }

    // Validate project key format (API spec allows A-Z, underscore, and numbers)
    const projectKeyPattern: RegExp = /^[A-Z][A-Z_0-9]+$/;
    if (!projectKeyPattern.test(testCaseData.projectKey.trim())) {
        throw new Error(`Invalid project key format: ${testCaseData.projectKey}. Expected format: PROJ or PROJ_TEST`);
    }

    try {
        const payload: CreateTestCaseRequest = {
            name: testCaseData.name.trim(),
            projectKey: testCaseData.projectKey.trim(),
            objective: testCaseData.objective?.trim(),
            precondition: testCaseData.precondition?.trim(),
            estimatedTime: testCaseData.estimatedTime,
            componentId: testCaseData.componentId,
            priorityName: testCaseData.priorityName?.trim(),
            statusName: testCaseData.statusName?.trim(),
            folderId: testCaseData.folderId,
            ownerId: testCaseData.ownerId?.trim(),
            labels: testCaseData.labels,
            customFields: testCaseData.customFields
        };

        const response: TestCase = await apiService.post<TestCase>("/testcases", payload);

        if (!response || !response.id || !response.key) {
            throw new Error("Invalid API response: Missing required fields in created test case");
        }

        return response;

    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("400")) {
                throw new Error(`Invalid test case data: ${error.message}. Check required fields and data formats.`);
            }
            if (error.message.includes("403")) {
                throw new Error(`Access denied: Cannot create test case in project ${testCaseData.projectKey}. Check permissions.`);
            }
            if (error.message.includes("409")) {
                throw new Error(`Conflict: Test case with similar name may already exist in project ${testCaseData.projectKey}.`);
            }
        }
        throw error;
    }
}

export async function updateTestCase(apiService: ApiService, testCaseKey: string, updateData: UpdateTestCaseRequest): Promise<TestCase> {
    /**
     * Update an existing test case.
     *
     * Modifies test case properties such as name, description, priority,
     * or folder assignment. Preserves existing data for unspecified fields.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * testCaseKey : string
     *     Unique key of test case to update (e.g., "PROJECT-T123")
     * updateData : UpdateTestCaseRequest
     *     Fields to update with new values
     *
     * Returns
     * -------
     * TestCase
     *     Updated test case with new field values
     *
     * Raises
     * ------
     * Error
     *     If test case key is invalid or API request fails
     */
    if (!apiService) {
        throw new Error("ApiService is required");
    }

    if (!testCaseKey || testCaseKey.trim() === "") {
        throw new Error("Test case key is required and cannot be empty");
    }

    if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error("Update data is required and cannot be empty");
    }

    const cleanTestCaseKey: string = testCaseKey.trim();

    // Validate test case key format (PROJECT-T123, allowing underscores in project key)
    const testCaseKeyPattern: RegExp = /^[A-Z][A-Z_0-9]+-T\d+$/;
    if (!testCaseKeyPattern.test(cleanTestCaseKey)) {
        throw new Error(`Invalid test case key format: ${cleanTestCaseKey}. Expected format: PROJECT-T123`);
    }

    try {
        const payload: UpdateTestCaseRequest = {};

        if (updateData.name !== undefined) {
            if (updateData.name.trim() === "") {
                throw new Error("Test case name cannot be empty");
            }
            payload.name = updateData.name.trim();
        }

        if (updateData.objective !== undefined) {
            payload.objective = updateData.objective.trim();
        }

        if (updateData.precondition !== undefined) {
            payload.precondition = updateData.precondition.trim();
        }

        if (updateData.estimatedTime !== undefined) {
            payload.estimatedTime = updateData.estimatedTime;
        }

        if (updateData.componentId !== undefined) {
            payload.componentId = updateData.componentId;
        }

        if (updateData.priorityName !== undefined) {
            payload.priorityName = updateData.priorityName.trim();
        }

        if (updateData.statusName !== undefined) {
            payload.statusName = updateData.statusName.trim();
        }

        if (updateData.folderId !== undefined) {
            payload.folderId = updateData.folderId;
        }

        if (updateData.ownerId !== undefined) {
            payload.ownerId = updateData.ownerId.trim();
        }

        if (updateData.labels !== undefined) {
            payload.labels = updateData.labels;
        }

        if (updateData.customFields !== undefined) {
            payload.customFields = updateData.customFields;
        }

        const response: TestCase = await apiService.put<TestCase>(`/testcases/${cleanTestCaseKey}`, payload);

        if (!response || !response.id || !response.key) {
            throw new Error("Invalid API response: Missing required fields in updated test case");
        }

        return response;

    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("404")) {
                throw new Error(`Test case not found: ${cleanTestCaseKey}. Verify the test case key exists and is accessible.`);
            }
            if (error.message.includes("403")) {
                throw new Error(`Access denied: Cannot update test case ${cleanTestCaseKey}. Check permissions.`);
            }
            if (error.message.includes("400")) {
                throw new Error(`Invalid update data for test case ${cleanTestCaseKey}: ${error.message}`);
            }
        }
        throw error;
    }
}

export async function addTestScript(apiService: ApiService, testCaseKey: string, scriptData: CreateTestScriptRequest): Promise<TestScript> {
    /**
     * Add a test script to an existing test case.
     *
     * Attaches executable test automation script or detailed manual testing
     * instructions to the specified test case.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * testCaseKey : string
     *     Test case key to add script to
     * scriptData : CreateTestScriptRequest
     *     Script content, type, and metadata
     *
     * Returns
     * -------
     * TestScript
     *     Created test script with assigned ID
     *
     * Raises
     * ------
     * Error
     *     If test case doesn't exist or script data is invalid
     */
    if (!apiService) {
        throw new Error("ApiService is required");
    }

    if (!testCaseKey || testCaseKey.trim() === "") {
        throw new Error("Test case key is required and cannot be empty");
    }

    if (!scriptData) {
        throw new Error("Script data is required");
    }

    if (!scriptData.text || scriptData.text.trim() === "") {
        throw new Error("Script text is required and cannot be empty");
    }

    const cleanTestCaseKey: string = testCaseKey.trim();

    // Validate test case key format (PROJECT-T123, allowing underscores in project key)
    const testCaseKeyPattern: RegExp = /^[A-Z][A-Z_0-9]+-T\d+$/;
    if (!testCaseKeyPattern.test(cleanTestCaseKey)) {
        throw new Error(`Invalid test case key format: ${cleanTestCaseKey}. Expected format: PROJECT-T123`);
    }

    try {
        // Validate script type (API expects "plain" or "bdd")
        let scriptType: "plain" | "bdd" = "plain";
        if (scriptData.type) {
            const normalizedType = scriptData.type.toLowerCase().trim();
            if (normalizedType === "bdd" || normalizedType === "plain") {
                scriptType = normalizedType as "plain" | "bdd";
            } else {
                throw new Error(`Invalid script type: ${scriptData.type}. Expected "plain" or "bdd"`);
            }
        }

        const payload: CreateTestScriptRequest = {
            text: scriptData.text.trim(),
            type: scriptType
        };

        const response: TestScript = await apiService.post<TestScript>(`/testcases/${cleanTestCaseKey}/testscript`, payload);

        if (!response || !response.id) {
            throw new Error("Invalid API response: Missing required fields in created test script");
        }

        return response;

    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("404")) {
                throw new Error(`Test case not found: ${cleanTestCaseKey}. Verify the test case key exists and is accessible.`);
            }
            if (error.message.includes("403")) {
                throw new Error(`Access denied: Cannot add script to test case ${cleanTestCaseKey}. Check permissions.`);
            }
            if (error.message.includes("400")) {
                throw new Error(`Invalid script data for test case ${cleanTestCaseKey}: ${error.message}`);
            }
        }
        throw error;
    }
}

export async function addTestSteps(apiService: ApiService, testCaseKey: string, stepsData: CreateTestStepsRequest): Promise<TestStep[]> {
    /**
     * Add test steps to an existing test case.
     *
     * Defines the step-by-step procedure for executing the test case,
     * including actions, expected results, and test data.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * testCaseKey : string
     *     Test case key to add steps to
     * stepsData : CreateTestStepsRequest
     *     Array of test steps with descriptions and expected results
     *
     * Returns
     * -------
     * TestStep[]
     *     Created test steps with assigned IDs and ordering
     *
     * Raises
     * ------
     * Error
     *     If test case doesn't exist or step data is invalid
     */
    if (!apiService) {
        throw new Error("ApiService is required");
    }

    if (!testCaseKey || testCaseKey.trim() === "") {
        throw new Error("Test case key is required and cannot be empty");
    }

    if (!stepsData) {
        throw new Error("Steps data is required");
    }

    if (!stepsData.steps || !Array.isArray(stepsData.steps) || stepsData.steps.length === 0) {
        throw new Error("At least one test step is required");
    }

    const cleanTestCaseKey: string = testCaseKey.trim();

    // Validate test case key format (PROJECT-T123, allowing underscores in project key)
    const testCaseKeyPattern: RegExp = /^[A-Z][A-Z_0-9]+-T\d+$/;
    if (!testCaseKeyPattern.test(cleanTestCaseKey)) {
        throw new Error(`Invalid test case key format: ${cleanTestCaseKey}. Expected format: PROJECT-T123`);
    }

    // Validate each step
    stepsData.steps.forEach((step, index) => {
        if (!step.description || step.description.trim() === "") {
            throw new Error(`Step ${index + 1}: Description is required and cannot be empty`);
        }
        if (!step.expectedResult || step.expectedResult.trim() === "") {
            throw new Error(`Step ${index + 1}: Expected result is required and cannot be empty`);
        }
    });

    try {
        const payload: CreateTestStepsRequest = {
            steps: stepsData.steps.map(step => ({
                description: step.description.trim(),
                expectedResult: step.expectedResult.trim(),
                testData: step.testData?.trim()
            }))
        };

        const response: TestStep[] = await apiService.post<TestStep[]>(`/testcases/${cleanTestCaseKey}/teststeps`, payload);

        if (!Array.isArray(response)) {
            throw new Error("Invalid API response: Expected array of test steps");
        }

        return response;

    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("404")) {
                throw new Error(`Test case not found: ${cleanTestCaseKey}. Verify the test case key exists and is accessible.`);
            }
            if (error.message.includes("403")) {
                throw new Error(`Access denied: Cannot add steps to test case ${cleanTestCaseKey}. Check permissions.`);
            }
            if (error.message.includes("400")) {
                throw new Error(`Invalid steps data for test case ${cleanTestCaseKey}: ${error.message}`);
            }
        }
        throw error;
    }
}

export async function linkTestCaseToIssue(apiService: ApiService, testCaseKey: string, issueKey: string): Promise<void> {
    /**
     * Link a test case to a Jira issue.
     *
     * Creates bidirectional link between test case and issue, enabling
     * traceability and coverage analysis.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * testCaseKey : string
     *     Test case key to link
     * issueKey : string
     *     Jira issue key to link to
     *
     * Raises
     * ------
     * Error
     *     If either key is invalid or link already exists
     */
    if (!apiService) {
        throw new Error("ApiService is required");
    }

    if (!testCaseKey || testCaseKey.trim() === "") {
        throw new Error("Test case key is required and cannot be empty");
    }

    if (!issueKey || issueKey.trim() === "") {
        throw new Error("Issue key is required and cannot be empty");
    }

    const cleanTestCaseKey: string = testCaseKey.trim();
    const cleanIssueKey: string = issueKey.trim();

    // Validate test case key format (PROJECT-T123, allowing single char project keys and underscores)
    const testCaseKeyPattern: RegExp = /^[A-Z][A-Z_0-9]*-T\d+$/;
    if (!testCaseKeyPattern.test(cleanTestCaseKey)) {
        throw new Error(`Invalid test case key format: ${cleanTestCaseKey}. Expected format: PROJECT-T123`);
    }

    // Validate issue key format (PROJECT-123, allowing single char project keys and underscores)
    const issueKeyPattern: RegExp = /^[A-Z][A-Z_0-9]*-\d+$/;
    if (!issueKeyPattern.test(cleanIssueKey)) {
        throw new Error(`Invalid issue key format: ${cleanIssueKey}. Expected format: PROJECT-123`);
    }

    try {
        const payload: { issueKey: string } = {
            issueKey: cleanIssueKey
        };

        await apiService.post<void>(`/testcases/${cleanTestCaseKey}/links/issues`, payload);

    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("404")) {
                throw new Error(`Resource not found: Either test case ${cleanTestCaseKey} or issue ${cleanIssueKey} does not exist.`);
            }
            if (error.message.includes("403")) {
                throw new Error(`Access denied: Cannot link test case ${cleanTestCaseKey} to issue ${cleanIssueKey}. Check permissions.`);
            }
            if (error.message.includes("409")) {
                throw new Error(`Conflict: Link between test case ${cleanTestCaseKey} and issue ${cleanIssueKey} already exists.`);
            }
            if (error.message.includes("400")) {
                throw new Error(`Invalid link request: ${error.message}. Verify both keys are valid and accessible.`);
            }
        }
        throw error;
    }
}

export function createTestCaseTools(): ToolDefinition[] {
    /**
     * Create MCP tool definitions for test case operations.
     *
     * Returns comprehensive tool definitions for all test case management
     * operations including creation, updates, scripts, steps, and linking.
     *
     * Returns
     * -------
     * ToolDefinition[]
     *     Array containing all test case tool definitions
     */
    return [
        {
            name: "zephyr_create_test_case",
            description: "Create a new test case with specified properties including name, description, priority, and folder assignment.",
            inputSchema: {
                type: "object",
                properties: {
                    name: {
                        type: "string",
                        description: "Test case name/title (required)",
                        minLength: 1,
                        examples: ["Login functionality test", "User registration validation", "Payment processing verification"]
                    },
                    description: {
                        type: "string",
                        description: "Detailed test case description",
                        examples: ["Verify that users can successfully login with valid credentials", "Validate user registration form with various input scenarios"]
                    },
                    projectKey: {
                        type: "string",
                        description: "Project key where the test case will be created",
                        pattern: "^[A-Z][A-Z0-9]*$",
                        examples: ["PROJ", "DEV", "QA"]
                    },
                    folderId: {
                        type: "number",
                        description: "Optional folder ID for organization",
                        examples: [123, 456, 789]
                    },
                    priorityId: {
                        type: "number",
                        description: "Optional priority level ID",
                        examples: [1, 2, 3]
                    },
                    statusId: {
                        type: "number",
                        description: "Optional initial status ID",
                        examples: [1, 2, 3]
                    }
                },
                required: ["name", "projectKey"],
                additionalProperties: false
            }
        },
        {
            name: "zephyr_update_test_case",
            description: "Update existing test case properties. Only specified fields will be updated, preserving other existing data.",
            inputSchema: {
                type: "object",
                properties: {
                    testCaseKey: {
                        type: "string",
                        description: "Test case key to update",
                        pattern: "^[A-Z][A-Z0-9]*-T\\d+$",
                        examples: ["PROJ-T123", "DEV-T456", "QA-T789"]
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
                required: ["testCaseKey"],
                additionalProperties: false
            }
        },
        {
            name: "zephyr_add_test_script",
            description: "Add test script or detailed instructions to an existing test case for manual or automated execution.",
            inputSchema: {
                type: "object",
                properties: {
                    testCaseKey: {
                        type: "string",
                        description: "Test case key to add script to",
                        pattern: "^[A-Z][A-Z0-9]*-T\\d+$",
                        examples: ["PROJ-T123", "DEV-T456", "QA-T789"]
                    },
                    text: {
                        type: "string",
                        description: "Script content or detailed testing instructions",
                        minLength: 1,
                        examples: [
                            "1. Navigate to login page\n2. Enter valid credentials\n3. Click login button\n4. Verify successful login",
                            "selenium.get('https://app.com/login'); selenium.find_element_by_id('username').send_keys('user'); selenium.find_element_by_id('password').send_keys('pass'); selenium.find_element_by_id('login').click();"
                        ]
                    },
                    type: {
                        type: "string",
                        description: "Script type - defaults to PLAIN_TEXT",
                        enum: ["PLAIN_TEXT", "AUTOMATION", "CUCUMBER", "SELENIUM"],
                        examples: ["PLAIN_TEXT", "AUTOMATION"]
                    }
                },
                required: ["testCaseKey", "text"],
                additionalProperties: false
            }
        },
        {
            name: "zephyr_add_test_steps",
            description: "Add structured test steps to a test case, defining step-by-step execution procedure with expected results.",
            inputSchema: {
                type: "object",
                properties: {
                    testCaseKey: {
                        type: "string",
                        description: "Test case key to add steps to",
                        pattern: "^[A-Z][A-Z0-9]*-T\\d+$",
                        examples: ["PROJ-T123", "DEV-T456", "QA-T789"]
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
                                    minLength: 1,
                                    examples: ["Navigate to login page", "Enter username", "Click submit button"]
                                },
                                expectedResult: {
                                    type: "string",
                                    description: "Expected outcome of the action",
                                    minLength: 1,
                                    examples: ["Login page displays", "Username field accepts input", "Form submission successful"]
                                },
                                testData: {
                                    type: "string",
                                    description: "Test data needed for this step",
                                    examples: ["testuser@example.com", "validPassword123", "John Doe"]
                                }
                            },
                            required: ["description", "expectedResult"],
                            additionalProperties: false
                        }
                    }
                },
                required: ["testCaseKey", "steps"],
                additionalProperties: false
            }
        },
        {
            name: "zephyr_link_test_case_to_issue",
            description: "Create bidirectional link between a test case and a JIRA issue for traceability and coverage tracking.",
            inputSchema: {
                type: "object",
                properties: {
                    testCaseKey: {
                        type: "string",
                        description: "Test case key to link",
                        pattern: "^[A-Z][A-Z0-9]*-T\\d+$",
                        examples: ["PROJ-T123", "DEV-T456", "QA-T789"]
                    },
                    issueKey: {
                        type: "string",
                        description: "JIRA issue key to link to",
                        pattern: "^[A-Z][A-Z0-9]*-\\d+$",
                        examples: ["PROJ-123", "DEV-456", "BUG-789"]
                    }
                },
                required: ["testCaseKey", "issueKey"],
                additionalProperties: false
            }
        }
    ];
}