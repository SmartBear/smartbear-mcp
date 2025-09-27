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
    CreatedResource,
    CursorPagedTestCaseList,
    TestCaseLinkList,
    TestCaseVersionLink,
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

/**
 * Verify if test case update succeeded by comparing field values.
 *
 * Fetches the current test case state and compares it with the intended
 * update data to determine if the update was actually applied.
 *
 * Parameters
 * ----------
 * apiService : ApiService
 *     Configured API service for HTTP communication
 * testCaseKey : string
 *     Test case key that was updated
 * updateData : UpdateTestCaseRequest
 *     Original update data that was intended to be applied
 *
 * Returns
 * -------
 * object
 *     Verification result with success status and details
 */
async function verifyTestCaseUpdate(
    apiService: ApiService, 
    testCaseKey: string, 
    updateData: UpdateTestCaseRequest
): Promise<{ success: boolean; currentState?: TestCase; errors?: string[] }> {
    try {
        // Use apiService.get directly instead of calling getTestCase function
        const currentState = await apiService.get<TestCase>(`/testcases/${testCaseKey}`);
        const errors: string[] = [];

        // Check each updated field
        if (updateData.name !== undefined && updateData.name.trim() !== currentState.name) {
            errors.push(`Name mismatch: expected "${updateData.name.trim()}", got "${currentState.name}"`);
        }

        if (updateData.objective !== undefined && updateData.objective.trim() !== currentState.objective) {
            errors.push(`Objective mismatch: expected "${updateData.objective.trim()}", got "${currentState.objective || ''}"`);
        }

        if (updateData.precondition !== undefined && updateData.precondition.trim() !== currentState.precondition) {
            errors.push(`Precondition mismatch: expected "${updateData.precondition.trim()}", got "${currentState.precondition || ''}"`);
        }

        if (updateData.estimatedTime !== undefined && updateData.estimatedTime !== currentState.estimatedTime) {
            errors.push(`EstimatedTime mismatch: expected ${updateData.estimatedTime}, got ${currentState.estimatedTime || 0}`);
        }

        if (updateData.componentId !== undefined && updateData.componentId !== currentState.component?.id) {
            errors.push(`ComponentId mismatch: expected ${updateData.componentId}, got ${currentState.component?.id || 'null'}`);
        }

        if (updateData.priorityName !== undefined && updateData.priorityName.trim() !== currentState.priority?.name) {
            errors.push(`PriorityName mismatch: expected "${updateData.priorityName.trim()}", got "${currentState.priority?.name || ''}"`);
        }

        if (updateData.statusName !== undefined && updateData.statusName.trim() !== currentState.status?.name) {
            errors.push(`StatusName mismatch: expected "${updateData.statusName.trim()}", got "${currentState.status?.name || ''}"`);
        }

        if (updateData.folderId !== undefined && updateData.folderId !== currentState.folder?.id) {
            errors.push(`FolderId mismatch: expected ${updateData.folderId}, got ${currentState.folder?.id || 'null'}`);
        }

        if (updateData.ownerId !== undefined && updateData.ownerId.trim() !== currentState.owner?.accountId) {
            errors.push(`OwnerId mismatch: expected "${updateData.ownerId.trim()}", got "${currentState.owner?.accountId || ''}"`);
        }

        if (updateData.labels !== undefined) {
            const expectedLabels = new Set(updateData.labels);
            const currentLabels = new Set(currentState.labels || []);
            if (expectedLabels.size !== currentLabels.size || 
                ![...expectedLabels].every(label => currentLabels.has(label))) {
                errors.push(`Labels mismatch: expected [${[...expectedLabels].join(', ')}], got [${[...currentLabels].join(', ')}]`);
            }
        }

        return {
            success: errors.length === 0,
            currentState,
            errors: errors.length > 0 ? errors : undefined
        };

    } catch (error) {
        return {
            success: false,
            errors: [`Failed to verify update: ${error instanceof Error ? error.message : 'Unknown error'}`]
        };
    }
}

export async function updateTestCase(apiService: ApiService, testCaseKey: string, updateData: UpdateTestCaseRequest): Promise<TestCase> {
    /**
     * Update an existing test case with verification-based success detection.
     *
     * This function implements a robust update mechanism that handles Zephyr API's
     * server-side bug where PUT requests succeed but return malformed JSON responses.
     * Uses verification-based success detection to provide accurate results.
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
     *     Updated test case with verification status
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
        // Step 1: Capture baseline state for verification
        const existingTestCase: TestCase = await apiService.get<TestCase>(`/testcases/${cleanTestCaseKey}`);

        if (!existingTestCase || !existingTestCase.id || !existingTestCase.key) {
            throw new Error("Failed to fetch existing test case or invalid test case data received");
        }

        // Create the payload by merging existing data with updates
        const payload: any = {
            // Start with all existing fields to preserve required data
            ...existingTestCase
        };

        // Apply updates, validating each field
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

        // Step 2: Attempt update (may fail with JSON parsing error)
        try {
            const response: TestCase = await apiService.put<TestCase>(`/testcases/${cleanTestCaseKey}`, payload);

            if (!response || !response.id || !response.key) {
                throw new Error("Invalid API response: Missing required fields in updated test case");
            }

            return response;

        } catch (putError) {
            // Step 3: Handle JSON parsing errors with verification
            if (putError instanceof Error && putError.message.includes("Unexpected end of JSON input")) {
                console.log(`[updateTestCase] JSON parsing error detected for ${cleanTestCaseKey}, performing verification...`);
                
                // Step 4: Verify if the update actually succeeded
                const verification = await verifyTestCaseUpdate(apiService, cleanTestCaseKey, updateData);
                
                if (verification.success && verification.currentState) {
                    console.log(`[updateTestCase] Update verified successful for ${cleanTestCaseKey} despite JSON error`);
                    
                    // Return the verified current state with success metadata
                    const verifiedResult: TestCase = {
                        ...verification.currentState
                    };
                    
                    return verifiedResult;
                } else {
                    // Update actually failed
                    const errors = verification.errors || ["Update verification failed"];
                    throw new Error(`Update failed - verification errors: ${errors.join("; ")}`);
                }
            } else {
                // Different error, re-throw
                throw putError;
            }
        }

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

export async function addTestSteps(apiService: ApiService, testCaseKey: string, stepsData: CreateTestStepsRequest): Promise<CreatedResource> {
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
     * CreatedResource
     *     Response containing the ID and self-reference URL of the created test steps
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
        // Transform the input to match Zephyr API schema
        const payload = {
            mode: "APPEND", // Default to APPEND mode as per API spec
            items: stepsData.steps.map(step => ({
                inline: {
                    description: step.description.trim(),
                    expectedResult: step.expectedResult.trim(),
                    ...(step.testData && { testData: step.testData.trim() })
                }
            }))
        };

        const response: CreatedResource = await apiService.post<CreatedResource>(`/testcases/${cleanTestCaseKey}/teststeps`, payload);

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

export async function listTestCasesNextGen(apiService: ApiService, args: {
    projectKey: string;
    limit?: number;
    cursor?: string;
}): Promise<{
    page1: CursorPagedTestCaseList;
    page2?: CursorPagedTestCaseList;
}> {
    /**
     * List test cases using cursor-based pagination with dual-page fetch.
     *
     * Fetches test cases from the /testcases/nextgen endpoint with automatic
     * second page retrieval when nextStartAtId is present. Used for validating
     * cursor-based pagination functionality.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * args.projectKey : string
     *     Project key to list test cases for (e.g., "PROJ", "DEV").
     *     Must match pattern [A-Z][A-Z0-9]+.
     * args.limit : number, optional
     *     Maximum number of test cases per page. Defaults to 10, range 1-1000.
     * args.cursor : string, optional
     *     If provided, fetches only the page for this cursor (advanced use).
     *     When omitted, starts from beginning and fetches page 2 if available.
     *
     * Returns
     * -------
     * Promise<{page1: CursorPagedTestCaseList, page2?: CursorPagedTestCaseList}>
     *     Combined result with page 1 always present, page 2 only if fetched.
     *
     * Raises
     * ------
     * Error
     *     If API request fails, project not found, or invalid parameters.
     */

    if (!apiService) {
        throw new Error("ApiService is required");
    }

    // Validate required parameters
    if (!args.projectKey) {
        throw new Error("projectKey is required");
    }

    if (args.projectKey && !/^[A-Z][A-Z0-9]*$/.test(args.projectKey)) {
        throw new Error("projectKey must match pattern [A-Z][A-Z0-9]+");
    }

    const limit: number = args.limit || 10;
    if (limit < 1 || limit > 1000) {
        throw new Error("limit must be between 1 and 1000");
    }

    try {
        let page1: CursorPagedTestCaseList;
        let page2: CursorPagedTestCaseList | undefined;

        if (args.cursor) {
            // Advanced use: fetch only the specified cursor page
            const queryParams: URLSearchParams = new URLSearchParams({
                projectKey: args.projectKey,
                limit: limit.toString(),
                startAtId: args.cursor
            });

            page1 = await apiService.get<CursorPagedTestCaseList>(
                `/testcases/nextgen?${queryParams.toString()}`
            );

            // No second page fetch when cursor is explicitly provided
            return { page1 };
        } else {
            // Standard use: fetch page 1, then page 2 if nextStartAtId exists
            const queryParams: URLSearchParams = new URLSearchParams({
                projectKey: args.projectKey,
                limit: limit.toString()
            });

            page1 = await apiService.get<CursorPagedTestCaseList>(
                `/testcases/nextgen?${queryParams.toString()}`
            );

            // Check if page 2 is available
            if (page1.nextStartAtId) {
                const page2Params: URLSearchParams = new URLSearchParams({
                    projectKey: args.projectKey,
                    limit: limit.toString(),
                    startAtId: page1.nextStartAtId.toString()
                });

                page2 = await apiService.get<CursorPagedTestCaseList>(
                    `/testcases/nextgen?${page2Params.toString()}`
                );
            }

            return { page1, page2 };
        }
    } catch (error: any) {
        // Follow existing error handling patterns
        if (error.response?.status === 404) {
            throw new Error(`Project '${args.projectKey}' not found or no test cases available`);
        } else if (error.response?.status === 401) {
            throw new Error("Authentication failed - check ZEPHYR_ACCESS_TOKEN");
        } else if (error.response?.status === 403) {
            throw new Error(`Access denied to project '${args.projectKey}'`);
        }

        throw new Error(`Failed to list test cases: ${error.message}`);
    }
}

export async function getTestCaseLinks(apiService: ApiService, testCaseKey: string): Promise<TestCaseLinkList> {
    /**
     * Get all links for a test case.
     *
     * Retrieves all links (issue links, web links, etc.) associated with
     * the specified test case, providing comprehensive link visibility.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * testCaseKey : string
     *     Unique key of test case to get links for (e.g., "PROJECT-T123")
     *
     * Returns
     * -------
     * TestCaseLinkList
     *     List of all links associated with the test case
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

    const cleanTestCaseKey: string = testCaseKey.trim();

    // Validate test case key format (PROJECT-T123, allowing underscores in project key)
    const testCaseKeyPattern: RegExp = /^[A-Z][A-Z_0-9]+-T\d+$/;
    if (!testCaseKeyPattern.test(cleanTestCaseKey)) {
        throw new Error(`Invalid test case key format: ${cleanTestCaseKey}. Expected format: PROJECT-T123`);
    }

    try {
        const response: TestCaseLinkList = await apiService.get<TestCaseLinkList>(`/testcases/${cleanTestCaseKey}/links`);

        if (!response) {
            throw new Error("Invalid API response: Empty response received");
        }

        return response;

    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("404")) {
                throw new Error(`Test case not found: ${cleanTestCaseKey}. Verify the test case key exists and is accessible.`);
            }
            if (error.message.includes("403")) {
                throw new Error(`Access denied: Cannot access links for test case ${cleanTestCaseKey}. Check permissions.`);
            }
        }
        throw error;
    }
}

export async function createTestCaseWebLink(apiService: ApiService, testCaseKey: string, webLinkData: { url: string; description?: string }): Promise<{ id: number }> {
    /**
     * Create a web link for a test case.
     *
     * Creates a link between a test case and a generic URL, enabling
     * traceability to external resources and documentation.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * testCaseKey : string
     *     Unique key of test case to add link to (e.g., "PROJECT-T123")
     * webLinkData : object
     *     Web link data with url and optional description
     *
     * Returns
     * -------
     * object
     *     Created resource with ID of the new web link
     *
     * Raises
     * ------
     * Error
     *     If test case key or URL is invalid or API request fails
     */
    if (!apiService) {
        throw new Error("ApiService is required");
    }

    if (!testCaseKey || testCaseKey.trim() === "") {
        throw new Error("Test case key is required and cannot be empty");
    }

    if (!webLinkData || !webLinkData.url || webLinkData.url.trim() === "") {
        throw new Error("Web link URL is required and cannot be empty");
    }

    const cleanTestCaseKey: string = testCaseKey.trim();

    // Validate test case key format
    const testCaseKeyPattern: RegExp = /^[A-Z][A-Z_0-9]+-T\d+$/;
    if (!testCaseKeyPattern.test(cleanTestCaseKey)) {
        throw new Error(`Invalid test case key format: ${cleanTestCaseKey}. Expected format: PROJECT-T123`);
    }

    // Basic URL validation
    const cleanUrl: string = webLinkData.url.trim();
    if (!cleanUrl.match(/^https?:\/\/.+/)) {
        throw new Error(`Invalid URL format: ${cleanUrl}. URL must start with http:// or https://`);
    }

    try {
        const payload = {
            url: cleanUrl,
            description: webLinkData.description?.trim() || ""
        };

        const response: { id: number } = await apiService.post<{ id: number }>(`/testcases/${cleanTestCaseKey}/links/weblinks`, payload);

        if (!response || !response.id) {
            throw new Error("Invalid API response: Missing required fields in created web link");
        }

        return response;

    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("404")) {
                throw new Error(`Test case not found: ${cleanTestCaseKey}. Verify the test case key exists and is accessible.`);
            }
            if (error.message.includes("403")) {
                throw new Error(`Access denied: Cannot create web link for test case ${cleanTestCaseKey}. Check permissions.`);
            }
            if (error.message.includes("400")) {
                throw new Error(`Invalid web link data for test case ${cleanTestCaseKey}: ${error.message}. Check URL format and description.`);
            }
        }
        throw error;
    }
}

export async function listTestCaseVersions(apiService: ApiService, testCaseKey: string, maxResults?: number): Promise<{ values: TestCaseVersionLink[]; maxResults: number; startAt: number; total: number }> {
    /**
     * List all versions of a test case.
     *
     * Returns all test case versions for the specified test case,
     * ordered by most recent first with pagination support.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * testCaseKey : string
     *     Unique key of test case to get versions for (e.g., "PROJECT-T123")
     * maxResults : number, optional
     *     Maximum number of results (default: 10, max: 1000)
     *
     * Returns
     * -------
     * object
     *     Paginated list of test case versions with metadata
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

    const cleanTestCaseKey: string = testCaseKey.trim();

    // Validate test case key format
    const testCaseKeyPattern: RegExp = /^[A-Z][A-Z_0-9]+-T\d+$/;
    if (!testCaseKeyPattern.test(cleanTestCaseKey)) {
        throw new Error(`Invalid test case key format: ${cleanTestCaseKey}. Expected format: PROJECT-T123`);
    }

    // Validate maxResults if provided
    if (maxResults !== undefined) {
        if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 1000) {
            throw new Error("maxResults must be an integer between 1 and 1000");
        }
    }

    try {
        const queryParams = new URLSearchParams();
        if (maxResults !== undefined) {
            queryParams.set('maxResults', maxResults.toString());
        }

        const endpoint = `/testcases/${cleanTestCaseKey}/versions${queryParams.toString() ? `?${queryParams}` : ''}`;
        const response = await apiService.get<{ values: TestCaseVersionLink[]; maxResults: number; startAt: number; total: number }>(endpoint);

        if (!response || !Array.isArray(response.values)) {
            throw new Error("Invalid API response: Missing or invalid values array");
        }

        return response;

    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("404")) {
                throw new Error(`Test case not found: ${cleanTestCaseKey}. Verify the test case key exists and is accessible.`);
            }
            if (error.message.includes("403")) {
                throw new Error(`Access denied: Cannot access versions for test case ${cleanTestCaseKey}. Check permissions.`);
            }
        }
        throw error;
    }
}

export async function getTestCaseVersion(apiService: ApiService, testCaseKey: string, version: number): Promise<TestCase> {
    /**
     * Get a specific version of a test case.
     *
     * Retrieves a specific version of a test case, allowing access
     * to historical test case data and changes over time.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * testCaseKey : string
     *     Unique key of test case (e.g., "PROJECT-T123")
     * version : number
     *     Version number of the test case to retrieve
     *
     * Returns
     * -------
     * TestCase
     *     Specific version of the test case with all fields
     *
     * Raises
     * ------
     * Error
     *     If test case key or version is invalid or API request fails
     */
    if (!apiService) {
        throw new Error("ApiService is required");
    }

    if (!testCaseKey || testCaseKey.trim() === "") {
        throw new Error("Test case key is required and cannot be empty");
    }

    if (version === undefined || version === null || !Number.isInteger(version) || version < 1) {
        throw new Error("Version must be a positive integer");
    }

    const cleanTestCaseKey: string = testCaseKey.trim();

    // Validate test case key format
    const testCaseKeyPattern: RegExp = /^[A-Z][A-Z_0-9]+-T\d+$/;
    if (!testCaseKeyPattern.test(cleanTestCaseKey)) {
        throw new Error(`Invalid test case key format: ${cleanTestCaseKey}. Expected format: PROJECT-T123`);
    }

    try {
        const response: TestCase = await apiService.get<TestCase>(`/testcases/${cleanTestCaseKey}/versions/${version}`);

        if (!response || !response.id || !response.key) {
            throw new Error("Invalid API response: Missing required fields in test case version");
        }

        return response;

    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("404")) {
                throw new Error(`Test case version not found: ${cleanTestCaseKey} version ${version}. Verify the test case and version exist.`);
            }
            if (error.message.includes("403")) {
                throw new Error(`Access denied: Cannot access version ${version} of test case ${cleanTestCaseKey}. Check permissions.`);
            }
        }
        throw error;
    }
}

export async function getTestCaseTestScript(apiService: ApiService, testCaseKey: string): Promise<TestScript> {
    /**
     * Get the test script for a test case.
     *
     * Returns the test script content for the specified test case,
     * providing detailed test execution instructions.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * testCaseKey : string
     *     Unique key of test case to get script for (e.g., "PROJECT-T123")
     *
     * Returns
     * -------
     * TestScript
     *     Test script with type and content information
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

    const cleanTestCaseKey: string = testCaseKey.trim();

    // Validate test case key format
    const testCaseKeyPattern: RegExp = /^[A-Z][A-Z_0-9]+-T\d+$/;
    if (!testCaseKeyPattern.test(cleanTestCaseKey)) {
        throw new Error(`Invalid test case key format: ${cleanTestCaseKey}. Expected format: PROJECT-T123`);
    }

    try {
        const response: TestScript = await apiService.get<TestScript>(`/testcases/${cleanTestCaseKey}/testscript`);

        if (!response) {
            throw new Error("Invalid API response: Empty test script response received");
        }

        return response;

    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("404")) {
                throw new Error(`Test script not found for test case: ${cleanTestCaseKey}. The test case may not have a script or may not exist.`);
            }
            if (error.message.includes("403")) {
                throw new Error(`Access denied: Cannot access test script for test case ${cleanTestCaseKey}. Check permissions.`);
            }
        }
        throw error;
    }
}

export async function getTestCaseTestSteps(apiService: ApiService, testCaseKey: string, maxResults?: number, startAt?: number): Promise<{ values: TestStep[]; maxResults: number; startAt: number; total: number }> {
    /**
     * Get test steps for a test case.
     *
     * Returns paginated test steps for the specified test case,
     * providing step-by-step test execution instructions.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * testCaseKey : string
     *     Unique key of test case to get steps for (e.g., "PROJECT-T123")
     * maxResults : number, optional
     *     Maximum number of results (default: 10, max: 1000)
     * startAt : number, optional
     *     Zero-indexed starting position (default: 0)
     *
     * Returns
     * -------
     * object
     *     Paginated list of test steps with execution details
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

    const cleanTestCaseKey: string = testCaseKey.trim();

    // Validate test case key format
    const testCaseKeyPattern: RegExp = /^[A-Z][A-Z_0-9]+-T\d+$/;
    if (!testCaseKeyPattern.test(cleanTestCaseKey)) {
        throw new Error(`Invalid test case key format: ${cleanTestCaseKey}. Expected format: PROJECT-T123`);
    }

    // Validate maxResults if provided
    if (maxResults !== undefined) {
        if (!Number.isInteger(maxResults) || maxResults < 1 || maxResults > 1000) {
            throw new Error("maxResults must be an integer between 1 and 1000");
        }
    }

    // Validate startAt if provided
    if (startAt !== undefined) {
        if (!Number.isInteger(startAt) || startAt < 0 || startAt > 1000000) {
            throw new Error("startAt must be an integer between 0 and 1000000");
        }
    }

    try {
        const queryParams = new URLSearchParams();
        if (maxResults !== undefined) {
            queryParams.set('maxResults', maxResults.toString());
        }
        if (startAt !== undefined) {
            queryParams.set('startAt', startAt.toString());
        }

        const endpoint = `/testcases/${cleanTestCaseKey}/teststeps${queryParams.toString() ? `?${queryParams}` : ''}`;
        const response = await apiService.get<{ values: TestStep[]; maxResults: number; startAt: number; total: number }>(endpoint);

        if (!response || !Array.isArray(response.values)) {
            throw new Error("Invalid API response: Missing or invalid values array");
        }

        return response;

    } catch (error) {
        if (error instanceof Error) {
            if (error.message.includes("404")) {
                throw new Error(`Test steps not found for test case: ${cleanTestCaseKey}. The test case may not have steps or may not exist.`);
            }
            if (error.message.includes("403")) {
                throw new Error(`Access denied: Cannot access test steps for test case ${cleanTestCaseKey}. Check permissions.`);
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
                        description: "Script type - must be 'plain' or 'bdd'. Defaults to 'plain'.",
                        enum: ["plain", "bdd"],
                        default: "plain",
                        examples: ["plain", "bdd"]
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
        },
        {
            name: "zephyr_list_testcases",
            description: "List Zephyr test cases for a project using cursor-based pagination (nextgen endpoint). Perform page-1 and page-2 fetches and return both pages plus basic assertions about pagination correctness.",
            inputSchema: {
                type: "object",
                properties: {
                    projectKey: {
                        type: "string",
                        description: "Jira project key, e.g. 'ZEP'",
                        pattern: "^[A-Z][A-Z0-9]*$",
                        examples: ["ZEP", "PROJ", "DEV", "QA"]
                    },
                    maxResults: {
                        type: "number",
                        description: "Page size to request from Zephyr (defaults to 2 for testing)",
                        minimum: 1,
                        maximum: 1000,
                        examples: [2, 10, 25, 50]
                    },
                    cursor: {
                        type: "string",
                        description: "If provided, fetches only the page for this cursor (advanced use)",
                        examples: ["123", "456", "789"]
                    }
                },
                required: ["projectKey"],
                additionalProperties: false
            }
        }
    ];
}