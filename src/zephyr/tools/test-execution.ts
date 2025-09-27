/**
 * Test execution recording and tracking.
 *
 * This module provides comprehensive test execution functionality including
 * execution result capture, status tracking, and execution metadata management
 * for recording and updating test case execution results.
 */

import type { ApiService } from "../services/api.js";
import type { TestExecution, CreateTestExecutionRequest, UpdateTestExecutionRequest, ToolDefinition } from "../types.js";

// Simple logger implementation for Phase 4 compatibility
const logger = {
    debug: (message: string) => console.debug(message),
    info: (message: string) => console.info(message),
    warning: (message: string) => console.warn(message),
    error: (message: string, error?: any) => console.error(message, error)
};

export async function createTestExecution(apiService: ApiService, executionData: CreateTestExecutionRequest): Promise<TestExecution> {
    /**
     * Record a test execution result.
     *
     * Creates execution record linking test case to test cycle with
     * result status, comments, and execution metadata.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * executionData : CreateTestExecutionRequest
     *     Execution data including test case, cycle, status, and comments
     *
     * Returns
     * -------
     * TestExecution
     *     Created test execution record with assigned ID
     *
     * Raises
     * ------
     * Error
     *     If test case or cycle doesn't exist, or execution data is invalid
     */
    logger.debug(`Entry: createTestExecution(testCaseKey=${executionData?.testCaseKey}, testCycleKey=${executionData?.testCycleKey})`);

    try {
        // Validate required API service
        if (!apiService) {
            throw new Error("ApiService is required and cannot be null");
        }

        // Validate required execution data
        if (!executionData) {
            throw new Error("Execution data is required and cannot be null");
        }

        // Validate required inputs
        if (!executionData.testCaseKey || executionData.testCaseKey.trim() === "") {
            logger.warning("Test case key validation failed: empty testCaseKey");
            throw new Error("Test case key is required and cannot be empty");
        }

        if (!executionData.testCycleKey || executionData.testCycleKey.trim() === "") {
            logger.warning("Test cycle key validation failed: empty testCycleKey");
            throw new Error("Test cycle key is required and cannot be empty");
        }

        if (!executionData.statusName || executionData.statusName.trim() === "") {
            logger.warning("Status name validation failed: empty statusName");
            throw new Error("Status name is required and cannot be empty");
        }

        // Validate status name is one of the allowed values
        const validStatuses = ["Not Executed", "Pass", "Fail", "Blocked", "In Progress"];
        if (!validStatuses.includes(executionData.statusName)) {
            throw new Error(`Status name must be one of: ${validStatuses.join(", ")}`);
        }

        // Validate assignedToId if provided - must not be empty string
        if (executionData.assignedToId !== undefined && executionData.assignedToId.trim() === "") {
            throw new Error("Assigned to ID cannot be empty if provided");
        }

        // Validate key formats - more permissive, allowing broader patterns
        if (!isValidTestCaseKeyPattern(executionData.testCaseKey)) {
            logger.warning(`Test case key format may be non-standard: ${executionData.testCaseKey} (expected PROJECT-T123 pattern but allowing flexibility)`);
            // Don't throw error, just warn - let API handle validation
        }

        if (!isValidTestCycleKeyPattern(executionData.testCycleKey)) {
            logger.warning(`Test cycle key format may be non-standard: ${executionData.testCycleKey} (expected PROJECT-R123 or PROJECT-C123 pattern but allowing flexibility)`);
            // Don't throw error, just warn - let API handle validation
        }

        // Validate that projectKey is provided (required by API)
        if (!executionData.projectKey || executionData.projectKey.trim() === "") {
            logger.warning("Project key validation failed: empty projectKey");
            throw new Error("Project key is required and cannot be empty");
        }

        // Log status name without restricting - be permissive with custom statuses
        logger.debug(`Using status name: ${executionData.statusName}`);

        // Validate execution timestamp if provided - more permissive date validation
        if (executionData.actualEndDate && !isValidDateFormat(executionData.actualEndDate)) {
            logger.warning(`Date format may be invalid: ${executionData.actualEndDate} (expected ISO format but allowing flexibility)`);
            // Don't throw error, just warn - let API handle validation
        }

        logger.debug("Validation passed, creating test execution via API");
        const testExecution: TestExecution = await apiService.post<TestExecution>("/testexecutions", executionData);

        logger.info(`Successfully created test execution: ${testExecution.id} for test case ${executionData.testCaseKey} with status ${executionData.statusName}`);
        logger.debug(`Exit: createTestExecution() -> TestExecution(id=${testExecution.id})`);
        return testExecution;

    } catch (error) {
        if (error instanceof Error && error.message.includes("validation failed")) {
            // Re-throw validation errors without logging (already logged)
            throw error;
        }
        logger.error(`Error creating test execution: ${error instanceof Error ? error.message : String(error)}`, { error });
        throw new Error(`Failed to create test execution: ${error instanceof Error ? error.message : "Unknown error occurred"}`);
    }
}

export async function updateTestExecution(apiService: ApiService, executionId: number, updateData: UpdateTestExecutionRequest): Promise<TestExecution> {
    /**
     * Update an existing test execution.
     *
     * Modifies execution status, comments, or other execution metadata
     * to reflect current testing progress and results.
     *
     * Parameters
     * ----------
     * apiService : ApiService
     *     Configured API service for HTTP communication
     * executionId : number
     *     ID of the test execution to update
     * updateData : UpdateTestExecutionRequest
     *     Fields to update with new values
     *
     * Returns
     * -------
     * TestExecution
     *     Updated test execution record
     *
     * Raises
     * ------
     * Error
     *     If execution doesn't exist or update data is invalid
     */
    logger.debug(`Entry: updateTestExecution(executionId=${executionId})`);

    try {
        // Validate required API service
        if (!apiService) {
            throw new Error("ApiService is required and cannot be null");
        }

        // Validate required update data
        if (!updateData) {
            throw new Error("Update data is required and cannot be null");
        }

        // Validate required inputs
        if (!executionId || executionId <= 0) {
            logger.warning(`Invalid execution ID: ${executionId}`);
            throw new Error("Execution ID must be a positive number");
        }

        // Validate at least one field is being updated
        const updateFields: Array<keyof UpdateTestExecutionRequest> = ["statusName", "comment", "environmentName", "actualEndDate"];
        const hasUpdateFields: boolean = updateFields.some(field => updateData[field] !== undefined);

        if (!hasUpdateFields) {
            logger.warning("No update fields provided");
            throw new Error("At least one field must be provided for update");
        }

        // Validate status name if provided - validate against known status values
        if (updateData.statusName !== undefined) {
            if (!updateData.statusName || updateData.statusName.trim() === "") {
                logger.warning("Status name validation failed: empty statusName");
                throw new Error("Status name cannot be empty if provided");
            }

            // Validate against known status values
            const validStatuses = ["Pass", "Fail", "Blocked", "In Progress", "Not Executed"];
            if (!validStatuses.includes(updateData.statusName)) {
                logger.warning(`Invalid status name: ${updateData.statusName}`);
                throw new Error(`Invalid status name: ${updateData.statusName}. Valid values: ${validStatuses.join(", ")}`);
            }

            logger.debug(`Using status name: ${updateData.statusName}`);
        }

        // Validate execution timestamp if provided - strict validation
        if (updateData.actualEndDate && !isValidDateFormat(updateData.actualEndDate)) {
            logger.warning(`Invalid date format: ${updateData.actualEndDate}`);
            throw new Error(`Invalid date format: ${updateData.actualEndDate}. Expected ISO format (YYYY-MM-DDTHH:mm:ss.sssZ)`);
        }

        logger.debug("Validation passed, updating test execution via API");
        const testExecution: TestExecution = await apiService.put<TestExecution>(`/testexecutions/${executionId}`, updateData);

        logger.info(`Successfully updated test execution: ${executionId}`);
        if (updateData.statusName) {
            logger.debug(`Status updated to: ${updateData.statusName}`);
        }
        logger.debug(`Exit: updateTestExecution() -> TestExecution(id=${testExecution.id})`);
        return testExecution;

    } catch (error) {
        if (error instanceof Error && error.message.includes("validation failed")) {
            // Re-throw validation errors without logging (already logged)
            throw error;
        }
        logger.error(`Error updating test execution: ${error instanceof Error ? error.message : String(error)}`, { error });
        throw new Error(`Failed to update test execution: ${error instanceof Error ? error.message : "Unknown error occurred"}`);
    }
}

export function createTestExecutionTools(): ToolDefinition[] {
    /**
     * Create MCP tool definitions for test execution operations.
     *
     * Returns comprehensive tool definitions for execution recording
     * and tracking with examples and use cases. More permissive validation
     * allows custom status names and flexible key formats.
     *
     * Returns
     * -------
     * ToolDefinition[]
     *     Array containing test execution tool definitions
     */
    logger.debug("Entry: createTestExecutionTools()");

    const tools: ToolDefinition[] = [
        {
            name: "create-test-execution",
            description: "Record test execution results linking test case to cycle with status and comments",
            inputSchema: {
                type: "object",
                properties: {
                    testCaseKey: {
                        type: "string",
                        description: "Test case key to execute (format: PROJECT-T123, flexible patterns accepted)"
                    },
                    testCycleKey: {
                        type: "string",
                        description: "Test cycle key for organization (format: PROJECT-R123 or PROJECT-C123, flexible patterns accepted)"
                    },
                    projectKey: {
                        type: "string",
                        description: "Project key (required)"
                    },
                    statusName: {
                        type: "string",
                        description: "Execution status name (e.g., Pass, Fail, Blocked, In Progress, Not Executed, or custom status names)"
                    },
                    comment: {
                        type: "string",
                        description: "Execution comments, failure details, or test observations"
                    },
                    environmentName: {
                        type: "string",
                        description: "Environment name where test was executed (e.g., DEV, QA, STAGING, PROD)"
                    },
                    actualEndDate: {
                        type: "string",
                        description: "Actual end date timestamp (flexible ISO format accepted)"
                    },
                    executionTime: {
                        type: "number",
                        description: "Actual test execution time in milliseconds"
                    },
                    executedById: {
                        type: "string",
                        description: "Jira user account ID of who executed the test"
                    },
                    assignedToId: {
                        type: "string",
                        description: "Jira user account ID assigned to the execution"
                    }
                },
                required: ["projectKey", "testCaseKey", "testCycleKey", "statusName"]
            }
        },
        {
            name: "update-test-execution",
            description: "Update existing test execution with new status, comments, or execution metadata",
            inputSchema: {
                type: "object",
                properties: {
                    executionId: {
                        type: "number",
                        description: "ID of the test execution to update"
                    },
                    statusName: {
                        type: "string",
                        description: "Updated execution status (e.g., Pass, Fail, Blocked, In Progress, Not Executed, or custom status names)"
                    },
                    comment: {
                        type: "string",
                        description: "Updated execution comments or notes"
                    },
                    environmentName: {
                        type: "string",
                        description: "Updated environment name information"
                    },
                    actualEndDate: {
                        type: "string",
                        description: "Updated actual end date timestamp (flexible ISO format accepted)"
                    },
                    executionTime: {
                        type: "number",
                        description: "Updated actual test execution time in milliseconds"
                    },
                    executedById: {
                        type: "string",
                        description: "Updated Jira user account ID of who executed the test"
                    },
                    assignedToId: {
                        type: "string",
                        description: "Updated Jira user account ID assigned to the execution"
                    }
                },
                required: ["executionId"]
            }
        }
    ];

    logger.debug(`Exit: createTestExecutionTools() -> ${tools.length} tool definitions`);
    return tools;
}

/**
 * Validate test case key format (PROJECT-T123).
 *
 * Parameters
 * ----------
 * key : string
 *     Test case key to validate
 *
 * Returns
 * -------
 * boolean
 *     True if valid format, false otherwise
 */
function isValidTestCaseKeyPattern(key: string): boolean {
    // More permissive pattern - allow various project key formats but still check basic structure
    // Original API spec: .+-T[0-9]+ (allows any project prefix followed by -T and numbers)
    const pattern: RegExp = /.+-T\d+/;
    return pattern.test(key);
}

/**
 * Validate test cycle key format (PROJECT-R123).
 *
 * Parameters
 * ----------
 * key : string
 *     Test cycle key to validate
 *
 * Returns
 * -------
 * boolean
 *     True if valid format, false otherwise
 */
function isValidTestCycleKeyPattern(key: string): boolean {
    // More permissive pattern - allow various project key formats
    // Original API spec: .+-[R|C][0-9]+ (allows any project prefix followed by -R or -C and numbers)  
    const pattern: RegExp = /.+-[RC]\d+/;
    return pattern.test(key);
}

function isValidDateFormat(dateString: string): boolean {
    try {
        // More permissive date validation - allow various ISO formats
        // API spec examples: 2018-05-19 13:15:13+00:00, 2018-05-20 13:15:13+00:00
        // But also accept Z format: 2024-01-01T10:00:00.000Z
        const date: Date = new Date(dateString);
        
        // Just check if it's a valid date, don't be strict about format
        return !isNaN(date.getTime());
    } catch {
        return false;
    }
}

/**
 * Validate ISO 8601 date format.
 *
 * Parameters
 * ----------
 * dateString : string
 *     Date string to validate
 *
 * Returns
 * -------
 * boolean
 *     True if valid ISO format, false otherwise
 */
function isValidISODate(dateString: string): boolean {
    try {
        // The API spec expects format: yyyy-MM-dd'T'HH:mm:ss'Z'
        // Examples from spec: 2018-05-20 13:15:13+00:00 but also supports Z format
        // Valid formats: 2024-01-01T10:00:00.000Z, 2024-01-01T10:00:00Z
        const date: Date = new Date(dateString);
        
        // Check if it's a valid date
        if (isNaN(date.getTime())) {
            return false;
        }
        
        // Check if it follows ISO format patterns
        // Accept both .sss and no milliseconds versions with Z suffix
        const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
        return isoPattern.test(dateString);
    } catch {
        return false;
    }
}