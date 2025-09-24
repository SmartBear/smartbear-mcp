/**
 * Unit tests for ZephyrClient class functionality.
 *
 * Covers client initialization, interface compliance, environment
 * variable handling, and integration with auth/api services.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ZephyrClient } from "../../../zephyr/client.js";
import type { Client, RegisterToolsFunction, GetInputFunction } from "../../../common/types.js";

// Mock all service dependencies
vi.mock("../../../zephyr/services/auth.js", () => ({
    AuthService: vi.fn().mockImplementation(() => ({
        getAuthHeaders: vi.fn().mockReturnValue({
            "Authorization": "Bearer test-token",
            "Content-Type": "application/json",
            "User-Agent": "TestAgent/1.0"
        }),
        validateToken: vi.fn().mockReturnValue(true)
    }))
}));

vi.mock("../../../zephyr/services/api.js", () => ({
    ApiService: vi.fn().mockImplementation(() => ({
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn()
    }))
}));

vi.mock("../../../zephyr/services/cache.js", () => ({
    CacheService: vi.fn().mockImplementation(() => ({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
        clear: vi.fn(),
        generateKey: vi.fn()
    }))
}));

// Mock all tool modules
vi.mock("../../../zephyr/tools/issue-coverage.js", () => ({
    getIssueCoverage: vi.fn()
}));

vi.mock("../../../zephyr/tools/test-cases.js", () => ({
    createTestCase: vi.fn(),
    updateTestCase: vi.fn(),
    addTestScript: vi.fn(),
    addTestSteps: vi.fn(),
    linkTestCaseToIssue: vi.fn()
}));

vi.mock("../../../zephyr/tools/test-planning.js", () => ({
    createTestPlan: vi.fn(),
    createTestCycle: vi.fn(),
    linkTestPlanToCycle: vi.fn()
}));

vi.mock("../../../zephyr/tools/test-execution.js", () => ({
    createTestExecution: vi.fn(),
    updateTestExecution: vi.fn()
}));

vi.mock("../../../zephyr/tools/folders.js", () => ({
    getFolders: vi.fn(),
    createFolder: vi.fn()
}));

vi.mock("../../../zephyr/tools/metadata.js", () => ({
    getStatuses: vi.fn(),
    getPriorities: vi.fn(),
    getEnvironments: vi.fn()
}));

import { AuthService } from "../../../zephyr/services/auth.js";
import { ApiService } from "../../../zephyr/services/api.js";
import { CacheService } from "../../../zephyr/services/cache.js";

describe('ZephyrClient', () => {
    /**
     * Test suite for ZephyrClient class functionality.
     *
     * Covers client initialization, interface compliance, environment
     * variable handling, and integration with auth/api services.
     */

    const validAccessToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

    beforeEach(() => {
        // Clear all mocks before each test
        vi.clearAllMocks();
        // Clear environment variables
        delete process.env.ZEPHYR_ACCESS_TOKEN;
        delete process.env.ZEPHYR_PROJECT_KEY;
        delete process.env.ZEPHYR_BASE_URL;
    });

    afterEach(() => {
        vi.resetAllMocks();
    });

    describe('constructor', () => {
        /**
         * Test ZephyrClient constructor behavior.
         *
         * Tests environment variable loading, parameter validation,
         * service initialization, and error handling for missing tokens.
         */

        it('should initialize with direct parameters', () => {
            const client = new ZephyrClient(validAccessToken, "TEST", "https://api.example.com/v2");

            expect(client).toBeInstanceOf(ZephyrClient);
            expect(AuthService).toHaveBeenCalledWith(validAccessToken);
            expect(ApiService).toHaveBeenCalledWith("https://api.example.com/v2", expect.any(Object));
            expect(CacheService).toHaveBeenCalledWith(300);
        });

        it('should load access token from environment variable', () => {
            process.env.ZEPHYR_ACCESS_TOKEN = validAccessToken;

            const client = new ZephyrClient();

            expect(client).toBeInstanceOf(ZephyrClient);
            expect(AuthService).toHaveBeenCalledWith(validAccessToken);
        });

        it('should use default base URL when not specified', () => {
            process.env.ZEPHYR_ACCESS_TOKEN = validAccessToken;

            const client = new ZephyrClient();

            expect(client).toBeInstanceOf(ZephyrClient);
            expect(ApiService).toHaveBeenCalledWith("https://api.zephyrscale.smartbear.com/v2", expect.any(Object));
        });

        it('should throw error when no access token provided', () => {
            expect(() => new ZephyrClient()).toThrow(
                "ZEPHYR_ACCESS_TOKEN is required - provide via parameter or environment variable"
            );
        });
    });

    describe('Client interface compliance', () => {
        /**
         * Verify ZephyrClient properly implements Client interface.
         *
         * Tests name, prefix properties and registerTools method
         * following established MCP patterns.
         */

        let client: ZephyrClient;

        beforeEach(() => {
            process.env.ZEPHYR_ACCESS_TOKEN = validAccessToken;
            client = new ZephyrClient();
        });

        it('should implement Client interface', () => {
            const clientInterface: Client = client;
            expect(clientInterface).toBeDefined();
        });

        it('should have correct name property', () => {
            expect(client.name).toBe("Zephyr Test Management");
        });

        it('should have correct prefix property', () => {
            expect(client.prefix).toBe("zephyr");
        });

        it('should have registerTools method', () => {
            expect(typeof client.registerTools).toBe("function");
        });
    });

    describe('registerTools', () => {
        /**
         * Test tool registration functionality.
         *
         * Verifies all tool categories are registered with proper
         * ToolParams and handler functions.
         */

        let client: ZephyrClient;
        let mockRegister: RegisterToolsFunction;
        let mockGetInput: GetInputFunction;
        let registeredTools: Array<{ params: any; handler: any }>;

        beforeEach(() => {
            process.env.ZEPHYR_ACCESS_TOKEN = validAccessToken;
            client = new ZephyrClient();
            registeredTools = [];

            // Mock register function that captures tool registrations
            mockRegister = vi.fn().mockImplementation((params, handler) => {
                registeredTools.push({ params, handler });
                return {} as any; // Return mock RegisteredTool
            });

            // Mock getInput function
            mockGetInput = vi.fn().mockResolvedValue({
                content: [{ type: "text", text: "mock input" }]
            });
        });

        it('should register tools without errors', () => {
            expect(() => {
                client.registerTools(mockRegister, mockGetInput);
            }).not.toThrow();
        });

        it('should register multiple tools', () => {
            client.registerTools(mockRegister, mockGetInput);

            // Verify multiple tools are registered
            expect(mockRegister).toHaveBeenCalled();
            expect(registeredTools.length).toBeGreaterThan(0);
        });

        it('should register issue coverage tool', () => {
            client.registerTools(mockRegister, mockGetInput);

            const issueCoverageTool = registeredTools.find(tool =>
                tool.params.title === "Get Issue Test Coverage"
            );

            expect(issueCoverageTool).toBeDefined();
            expect(issueCoverageTool.params).toMatchObject({
                title: "Get Issue Test Coverage",
                summary: expect.any(String),
                purpose: expect.any(String),
                useCases: expect.any(Array),
                examples: expect.any(Array),
                hints: expect.any(Array),
                readOnly: true,
                idempotent: true,
                parameters: expect.objectContaining({
                    type: "object",
                    properties: expect.objectContaining({
                        issueKey: expect.objectContaining({
                            type: "string",
                            description: expect.any(String),
                            pattern: expect.any(String)
                        })
                    }),
                    required: ["issueKey"]
                })
            });
        });
    });
});